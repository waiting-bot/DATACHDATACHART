"""
请求追踪和性能监控中间件
"""
import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable, Awaitable

from app.logging_config import log_api_request, request_tracker, get_logger

logger = get_logger(__name__)

class RequestTrackingMiddleware(BaseHTTPMiddleware):
    """请求追踪中间件"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 生成请求ID
        request_id = str(uuid.uuid4())
        request_tracker.set_request_id(request_id)
        
        # 记录请求开始时间
        start_time = time.time()
        
        # 添加请求ID到响应头
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        
        # 计算请求处理时间
        duration = time.time() - start_time
        
        # 记录API请求日志
        log_api_request(
            method=request.method,
            endpoint=str(request.url.path),
            status_code=response.status_code,
            duration=duration,
            error=None if response.status_code < 400 else f"HTTP {response.status_code}"
        )
        
        # 清除请求上下文
        request_tracker.clear()
        
        return response

class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """性能监控中间件"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # 记录请求开始
        logger.info(
            "Request started",
            extra={
                'method': request.method,
                'path': request.url.path,
                'user_agent': request.headers.get('user-agent'),
                'client_ip': request.client.host if request.client else None
            }
        )
        
        try:
            response = await call_next(request)
            duration = time.time() - start_time
            
            # 记录请求完成
            logger.info(
                "Request completed",
                extra={
                    'method': request.method,
                    'path': request.url.path,
                    'status_code': response.status_code,
                    'duration': duration,
                    'response_size': len(response.body) if hasattr(response, 'body') else 0
                }
            )
            
            # 性能警告
            if duration > 2.0:  # 超过2秒的请求
                logger.warning(
                    "Slow request detected",
                    extra={
                        'method': request.method,
                        'path': request.url.path,
                        'duration': duration,
                        'threshold': 2.0
                    }
                )
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            
            logger.error(
                "Request failed",
                extra={
                    'method': request.method,
                    'path': request.url.path,
                    'duration': duration,
                    'error': str(e)
                }
            )
            
            raise

class SecurityLoggingMiddleware(BaseHTTPMiddleware):
    """安全日志中间件"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 记录敏感请求
        sensitive_paths = ['/api/v1/access-codes', '/api/v1/auth', '/admin']
        
        if any(request.url.path.startswith(path) for path in sensitive_paths):
            logger.info(
                "Sensitive access attempt",
                extra={
                    'method': request.method,
                    'path': request.url.path,
                    'client_ip': request.client.host if request.client else None,
                    'user_agent': request.headers.get('user-agent')
                }
            )
        
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            # 记录安全相关错误
            if "auth" in str(e).lower() or "permission" in str(e).lower():
                logger.warning(
                    "Security-related error",
                    extra={
                        'method': request.method,
                        'path': request.url.path,
                        'error': str(e),
                        'client_ip': request.client.host if request.client else None
                    }
                )
            raise