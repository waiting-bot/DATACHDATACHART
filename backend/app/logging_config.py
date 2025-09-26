"""
高级日志配置模块
提供结构化日志、日志轮转、请求追踪等功能
"""
import logging
import logging.handlers
import json
import uuid
import time
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path
import threading
from contextlib import contextmanager
from functools import wraps

from app.config import get_settings

settings = get_settings()

class JSONFormatter(logging.Formatter):
    """JSON格式日志格式化器"""
    
    def format(self, record):
        log_entry = {
            'timestamp': self.formatTime(record, datefmt='%Y-%m-%d %H:%M:%S.%f')[:-3],
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
            'thread': threading.get_ident(),
            'process': record.process
        }
        
        # 添加请求ID（如果有）
        if hasattr(record, 'request_id'):
            log_entry['request_id'] = record.request_id
        
        # 添加用户ID（如果有）
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = record.user_id
        
        # 添加性能信息（如果有）
        if hasattr(record, 'duration'):
            log_entry['duration_ms'] = round(record.duration * 1000, 2)
        
        # 添加额外字段（如果有）
        if hasattr(record, 'extra'):
            log_entry.update(record.extra)
        
        # 添加异常信息
        if record.exc_info:
            log_entry['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': self.formatException(record.exc_info)
            }
        
        return json.dumps(log_entry, ensure_ascii=False, separators=(',', ':'))

class RequestTracker:
    """请求追踪器"""
    
    def __init__(self):
        self._local = threading.local()
    
    def get_request_id(self) -> str:
        """获取当前请求ID"""
        if not hasattr(self._local, 'request_id'):
            self._local.request_id = str(uuid.uuid4())
        return self._local.request_id
    
    def set_request_id(self, request_id: str):
        """设置当前请求ID"""
        self._local.request_id = request_id
    
    def get_user_id(self) -> Optional[str]:
        """获取当前用户ID"""
        return getattr(self._local, 'user_id', None)
    
    def set_user_id(self, user_id: str):
        """设置当前用户ID"""
        self._local.user_id = user_id
    
    def clear(self):
        """清除当前请求上下文"""
        if hasattr(self._local, 'request_id'):
            delattr(self._local, 'request_id')
        if hasattr(self._local, 'user_id'):
            delattr(self._local, 'user_id')

# 全局请求追踪器实例
request_tracker = RequestTracker()

class StructuredLogger:
    """结构化日志记录器"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.request_tracker = request_tracker
    
    def _log_with_context(self, level: str, message: str, **kwargs):
        """带上下文的日志记录"""
        extra = kwargs.pop('extra', {})
        
        # 添加请求上下文
        request_id = self.request_tracker.get_request_id()
        if request_id:
            extra['request_id'] = request_id
        
        user_id = self.request_tracker.get_user_id()
        if user_id:
            extra['user_id'] = user_id
        
        # 记录日志
        log_method = getattr(self.logger, level)
        log_method(message, extra=extra, **kwargs)
    
    def info(self, message: str, **kwargs):
        """记录信息级别日志"""
        self._log_with_context('info', message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """记录警告级别日志"""
        self._log_with_context('warning', message, **kwargs)
    
    def error(self, message: str, **kwargs):
        """记录错误级别日志"""
        self._log_with_context('error', message, **kwargs)
    
    def debug(self, message: str, **kwargs):
        """记录调试级别日志"""
        self._log_with_context('debug', message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        """记录严重级别日志"""
        self._log_with_context('critical', message, **kwargs)

def setup_logging():
    """设置日志系统"""
    
    # 创建日志目录
    log_dir = Path(settings.log_file).parent
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # 清除现有处理器
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    
    # 设置日志级别
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    root_logger.setLevel(log_level)
    
    # 创建控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_handler.setFormatter(console_formatter)
    
    # 创建文件处理器（带轮转）
    file_handler = logging.handlers.RotatingFileHandler(
        settings.log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(JSONFormatter())
    
    # 创建错误日志处理器（单独文件）
    error_file_handler = logging.handlers.RotatingFileHandler(
        log_dir / 'error.log',
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=3,
        encoding='utf-8'
    )
    error_file_handler.setLevel(logging.ERROR)
    error_file_handler.setFormatter(JSONFormatter())
    
    # 创建访问日志处理器
    access_file_handler = logging.handlers.RotatingFileHandler(
        log_dir / 'access.log',
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=3,
        encoding='utf-8'
    )
    access_file_handler.setLevel(logging.INFO)
    access_file_handler.setFormatter(JSONFormatter())
    
    # 添加处理器到根日志器
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(error_file_handler)
    
    # 设置第三方库日志级别
    logging.getLogger('uvicorn').setLevel(logging.WARNING)
    logging.getLogger('fastapi').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy').setLevel(logging.WARNING)
    
    # 创建访问日志记录器
    access_logger = logging.getLogger('access')
    access_logger.addHandler(access_file_handler)
    access_logger.propagate = False
    
    return access_logger

def get_logger(name: str) -> StructuredLogger:
    """获取结构化日志记录器"""
    return StructuredLogger(name)

@contextmanager
def log_request_context(request_id: str = None, user_id: str = None):
    """请求上下文管理器"""
    old_request_id = request_tracker.get_request_id()
    old_user_id = request_tracker.get_user_id()
    
    try:
        if request_id:
            request_tracker.set_request_id(request_id)
        if user_id:
            request_tracker.set_user_id(user_id)
        yield
    finally:
        if old_request_id:
            request_tracker.set_request_id(old_request_id)
        else:
            request_tracker.clear()
        
        if old_user_id:
            request_tracker.set_user_id(old_user_id)

def log_performance(func):
    """性能监控装饰器"""
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = time.time()
        request_id = request_tracker.get_request_id()
        
        try:
            result = await func(*args, **kwargs)
            duration = time.time() - start_time
            
            logger = get_logger(func.__module__)
            logger.info(
                f"Function {func.__name__} completed",
                extra={
                    'function': func.__name__,
                    'duration': duration,
                    'request_id': request_id
                }
            )
            
            return result
        except Exception as e:
            duration = time.time() - start_time
            
            logger = get_logger(func.__module__)
            logger.error(
                f"Function {func.__name__} failed",
                extra={
                    'function': func.__name__,
                    'duration': duration,
                    'error': str(e),
                    'request_id': request_id
                }
            )
            
            raise
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        start_time = time.time()
        request_id = request_tracker.get_request_id()
        
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            
            logger = get_logger(func.__module__)
            logger.info(
                f"Function {func.__name__} completed",
                extra={
                    'function': func.__name__,
                    'duration': duration,
                    'request_id': request_id
                }
            )
            
            return result
        except Exception as e:
            duration = time.time() - start_time
            
            logger = get_logger(func.__module__)
            logger.error(
                f"Function {func.__name__} failed",
                extra={
                    'function': func.__name__,
                    'duration': duration,
                    'error': str(e),
                    'request_id': request_id
                }
            )
            
            raise
    
    if hasattr(func, '__code__') and func.__code__.co_flags & 0x80:
        return async_wrapper
    else:
        return sync_wrapper

def log_api_request(method: str, endpoint: str, status_code: int, 
                   duration: float, user_id: str = None, 
                   error: str = None):
    """记录API请求日志"""
    access_logger = logging.getLogger('access')
    
    log_data = {
        'type': 'api_request',
        'method': method,
        'endpoint': endpoint,
        'status_code': status_code,
        'duration_ms': round(duration * 1000, 2),
        'timestamp': datetime.utcnow().isoformat()
    }
    
    if user_id:
        log_data['user_id'] = user_id
    
    if error:
        log_data['error'] = error
    
    request_id = request_tracker.get_request_id()
    if request_id:
        log_data['request_id'] = request_id
    
    access_logger.info('API request', extra={'extra': log_data})