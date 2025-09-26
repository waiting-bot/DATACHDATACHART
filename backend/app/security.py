"""
安全中间件和配置
"""
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
import secrets
import time
from typing import Optional, List
from .config import get_settings

# 获取配置
settings = get_settings()

# 限流器设置
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.rate_limit_requests}/{settings.rate_limit_window}s"]
)

# 安全头部中间件
class SecurityHeadersMiddleware:
    """安全头部中间件"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = dict(message.get("headers", []))
                
                # 添加安全头部
                security_headers = {
                    "X-Content-Type-Options": "nosniff",
                    "X-Frame-Options": "DENY",
                    "X-XSS-Protection": "1; mode=block",
                    "Referrer-Policy": "strict-origin-when-cross-origin",
                    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
                    "Content-Security-Policy": (
                        "default-src 'self'; "
                        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                        "style-src 'self' 'unsafe-inline'; "
                        "img-src 'self' data: https:; "
                        "font-src 'self'; "
                        "connect-src 'self'; "
                        "frame-ancestors 'none';"
                    )
                }
                
                # 生产环境添加更严格的安全头部
                if not settings.debug:
                    security_headers.update({
                        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
                    })
                
                # 合并头部
                for key, value in security_headers.items():
                    headers[key.encode()] = value.encode()
                
                message["headers"] = list(headers.items())
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)

# 请求验证中间件
class RequestValidationMiddleware:
    """请求验证中间件"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # 验证请求方法
        if request.method not in ["GET", "POST", "PUT", "DELETE", "OPTIONS"]:
            response = JSONResponse(
                status_code=405,
                content={"detail": "Method not allowed"}
            )
            await response(scope, receive, send)
            return
        
        # 验证Content-Type
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            if not content_type.startswith(("application/json", "multipart/form-data")):
                response = JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid content type"}
                )
                await response(scope, receive, send)
                return
        
        # 验证请求大小
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > settings.max_file_size:
            response = JSONResponse(
                status_code=413,
                content={"detail": "Request entity too large"}
            )
            await response(scope, receive, send)
            return
        
        await self.app(scope, receive, send)

def setup_security_middleware(app):
    """设置安全中间件"""
    
    # HTTPS重定向（生产环境）
    if settings.enable_https:
        app.add_middleware(HTTPSRedirectMiddleware)
    
    # 受信任的主机中间件
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"] if settings.debug else ["localhost", "your-domain.com"]
    )
    
    # Gzip压缩中间件
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # 安全头部中间件
    app.add_middleware(SecurityHeadersMiddleware)
    
    # 请求验证中间件
    app.add_middleware(RequestValidationMiddleware)
    
    # 设置限流异常处理
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    
    return app

def generate_csrf_token() -> str:
    """生成CSRF令牌"""
    return secrets.token_urlsafe(32)

def validate_csrf_token(token: str, session_token: str) -> bool:
    """验证CSRF令牌"""
    return secrets.compare_digest(token, session_token)

def sanitize_filename(filename: str) -> str:
    """清理文件名，防止路径遍历攻击"""
    # 移除危险字符
    filename = filename.replace("..", "").replace("/", "").replace("\\", "")
    # 移除特殊字符
    filename = "".join(c for c in filename if c.isalnum() or c in "._- ")
    # 限制长度
    if len(filename) > 255:
        filename = filename[:255]
    return filename.strip()