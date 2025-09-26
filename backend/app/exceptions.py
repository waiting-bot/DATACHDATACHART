"""
全局异常处理模块
符合dev-preferences.md规范的统一错误处理
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import traceback

from app.schemas import StandardResponse, StandardErrorResponse, ErrorDetail

from app.logging_config import get_logger
logger = get_logger(__name__)

class ErrorCode:
    """错误码常量"""
    VALIDATION_ERROR = "VALIDATION_ERROR"
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR"
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    INVALID_FILE_FORMAT = "INVALID_FILE_FORMAT"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    ACCESS_CODE_INVALID = "ACCESS_CODE_INVALID"
    ACCESS_CODE_EXPIRED = "ACCESS_CODE_EXPIRED"
    ACCESS_CODE_EXHAUSTED = "ACCESS_CODE_EXHAUSTED"
    CHART_GENERATION_ERROR = "CHART_GENERATION_ERROR"
    EXCEL_PARSE_ERROR = "EXCEL_PARSE_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"

class ErrorMessage:
    """错误消息常量"""
    VALIDATION_ERROR = "请求参数验证失败"
    AUTHENTICATION_ERROR = "身份验证失败"
    AUTHORIZATION_ERROR = "权限不足"
    NOT_FOUND = "资源不存在"
    INTERNAL_ERROR = "服务器内部错误"
    FILE_NOT_FOUND = "文件不存在"
    INVALID_FILE_FORMAT = "无效的文件格式"
    FILE_TOO_LARGE = "文件过大"
    ACCESS_CODE_INVALID = "访问码无效"
    ACCESS_CODE_EXPIRED = "访问码已过期"
    ACCESS_CODE_EXHAUSTED = "访问码使用次数已用完"
    CHART_GENERATION_ERROR = "图表生成失败"
    EXCEL_PARSE_ERROR = "Excel文件解析失败"
    DATABASE_ERROR = "数据库操作失败"

def create_error_response(
    error_code: str, 
    error_message: str, 
    details: Optional[Dict[str, Any]] = None,
    status_code: int = status.HTTP_400_BAD_REQUEST
) -> JSONResponse:
    """创建标准错误响应"""
    from app.logging_config import request_tracker
    
    error_detail = ErrorDetail(code=error_code, message=error_message)
    response = StandardErrorResponse(error=error_detail)
    
    # 添加请求追踪信息
    request_id = request_tracker.get_request_id()
    extra_details = {}
    if request_id:
        extra_details['request_id'] = request_id
    
    if details:
        extra_details.update(details)
    
    logger.error(f"Error {error_code}: {error_message}", extra={'extra': extra_details})
    
    headers = {"X-Error-Code": error_code}
    if request_id:
        headers["X-Request-ID"] = request_id
    
    return JSONResponse(
        status_code=status_code,
        content=response.dict(),
        headers=headers
    )

def create_success_response(
    data: Any = None,
    message: str = "操作成功"
) -> Dict[str, Any]:
    """创建标准成功响应"""
    return StandardResponse(
        success=True,
        data=data,
        error=None
    ).dict()

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """处理请求验证异常"""
    error_details = []
    for error in exc.errors():
        error_details.append({
            "field": ".".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.warning(f"Validation error: {error_details}")
    
    return create_error_response(
        error_code=ErrorCode.VALIDATION_ERROR,
        error_message=ErrorMessage.VALIDATION_ERROR,
        details={"validation_errors": error_details},
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
    )

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """处理HTTP异常"""
    error_code = ErrorCode.INTERNAL_ERROR
    error_message = ErrorMessage.INTERNAL_ERROR
    
    if exc.status_code == status.HTTP_404_NOT_FOUND:
        error_code = ErrorCode.NOT_FOUND
        error_message = ErrorMessage.NOT_FOUND
    elif exc.status_code == status.HTTP_401_UNAUTHORIZED:
        error_code = ErrorCode.AUTHENTICATION_ERROR
        error_message = ErrorMessage.AUTHENTICATION_ERROR
    elif exc.status_code == status.HTTP_403_FORBIDDEN:
        error_code = ErrorCode.AUTHORIZATION_ERROR
        error_message = ErrorMessage.AUTHORIZATION_ERROR
    elif exc.status_code == status.HTTP_400_BAD_REQUEST:
        error_code = ErrorCode.VALIDATION_ERROR
        error_message = ErrorMessage.VALIDATION_ERROR
    
    return create_error_response(
        error_code=error_code,
        error_message=exc.detail or error_message,
        status_code=exc.status_code
    )

async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """处理通用异常"""
    from app.logging_config import request_tracker
    
    request_id = request_tracker.get_request_id()
    error_details = {
        "exception_type": type(exc).__name__,
        "exception_message": str(exc),
        "path": str(request.url.path),
        "method": request.method,
        "client_ip": request.client.host if request.client else None
    }
    
    if request_id:
        error_details["request_id"] = request_id
    
    logger.error(f"Unhandled exception: {str(exc)}", extra={'extra': error_details})
    logger.error(f"Traceback: {traceback.format_exc()}")
    
    return create_error_response(
        error_code=ErrorCode.INTERNAL_ERROR,
        error_message=ErrorMessage.INTERNAL_ERROR,
        details=error_details,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )

async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """处理Starlette HTTP异常"""
    return create_error_response(
        error_code=ErrorCode.INTERNAL_ERROR,
        error_message=exc.detail,
        status_code=exc.status_code
    )

def setup_exception_handlers(app):
    """设置异常处理器"""
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, starlette_http_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)