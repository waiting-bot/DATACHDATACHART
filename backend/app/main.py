"""
FastAPI Application for Chart Generation Tool
智能图表生成工具 - FastAPI应用主文件
"""

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import os
import logging
from datetime import datetime
from sqlalchemy.orm import Session

# 导入应用模块
from app.database import init_database, check_database_connection, get_db
from app.models import Base, UsageLog
from app.services.access_code_service import AccessCodeService, UsageLogService, SystemConfigService
from app.services.file_service import file_service
from app.services.excel_service import excel_parser
from app.services.chart_service import chart_generator
from app.schemas import *
from app.api_v1 import router as v1_router
from app.monitoring import router as monitoring_router
from app.exceptions import setup_exception_handlers
from app.config import get_settings, get_cors_origins
from app.security import setup_security_middleware, limiter
from app.middleware import RequestTrackingMiddleware, PerformanceMonitoringMiddleware, SecurityLoggingMiddleware
from app.simple_docs import router as docs_router
from pathlib import Path

# Configure logging
from app.logging_config import setup_logging, get_logger
access_logger = setup_logging()

logger = get_logger(__name__)

# 获取应用配置
settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("Starting up Chart Generation API...")
    
    # Create necessary directories
    os.makedirs('uploads', exist_ok=True)
    os.makedirs('logs', exist_ok=True)
    os.makedirs('data', exist_ok=True)
    
    # Initialize database
    try:
        init_database()
        logger.info("Database initialization complete")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
    
    # Check database connection
    if check_database_connection():
        logger.info("Database connection is healthy")
    else:
        logger.warning("Database connection failed")
    
    # Start file cleanup task
    try:
        await file_service.start_cleanup_task()
        logger.info("File cleanup task started")
    except Exception as e:
        logger.error(f"Failed to start file cleanup task: {e}")
    
    logger.info("Application startup complete")
    
    yield
    
    logger.info("Shutting down Chart Generation API...")
    
    # Stop file cleanup task
    try:
        await file_service.stop_cleanup_task()
        logger.info("File cleanup task stopped")
    except Exception as e:
        logger.error(f"Failed to stop file cleanup task: {e}")
    
    logger.info("Application shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="智能图表生成工具 API",
    description="基于Excel文件自动生成图表的API服务",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Methods",
        "Access-Control-Allow-Headers"
    ],
)

# 设置追踪和监控中间件
app.add_middleware(RequestTrackingMiddleware)
app.add_middleware(PerformanceMonitoringMiddleware)
app.add_middleware(SecurityLoggingMiddleware)

# 设置安全中间件
app = setup_security_middleware(app)

# 设置异常处理
setup_exception_handlers(app)

# 包含路由
app.include_router(v1_router)
app.include_router(monitoring_router)
app.include_router(docs_router)

# Basic routes
@app.get("/")
async def root():
    """Root endpoint"""
    db_status = check_database_connection()
    return {
        "message": "智能图表生成工具 API",
        "version": "1.0.0",
        "status": "running",
        "database": "connected" if db_status else "disconnected",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    db_status = check_database_connection()
    return {
        "status": "healthy" if db_status else "unhealthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "database": "connected" if db_status else "disconnected"
    }

@app.get("/api/info")
async def api_info():
    """API information endpoint (legacy - use /api/v1/info instead)"""
    return {
        "name": "智能图表生成工具 API",
        "version": "1.0.0",
        "description": "基于Excel文件自动生成图表的API服务",
        "note": "此端点已弃用，请使用 /api/v1/info",
        "endpoints": {
            "health": "/health",
            "validate_access_code": "/api/validate-access-code (legacy)",
            "generate_chart": "/api/generate-chart (legacy)",
            "chart_types": "/api/chart-types (legacy)",
            "v1_endpoints": "/api/v1/*"
        },
        "supported_file_formats": [".xlsx", ".xls"],
        "supported_chart_types": ["bar", "line", "pie", "scatter", "area", "heatmap", "box", "violin", "histogram"]
    }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "error": "Endpoint not found",
            "message": f"The requested URL {request.url} was not found on this server."
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "message": "An unexpected error occurred on the server."
        }
    )

# Legacy API endpoints - 已弃用，请使用 /api/v1/* 端点
# 以下端点保留以向后兼容，但建议迁移到v1 API

@app.post("/api/validate-access-code")
async def legacy_validate_access_code(request: dict):
    """[LEGACY] 验证访问码 - 请使用 /api/v1/access-codes/validate"""
    logger.warning("使用已弃用的legacy API: /api/validate-access-code")
    from app.api_v1 import router as v1_router
    # 重定向到v1 API（简化处理）
    return {"warning": "此端点已弃用，请使用 /api/v1/access-codes/validate", "deprecated": True}

@app.get("/api/chart-types")
async def legacy_get_chart_types():
    """[LEGACY] 获取图表类型 - 请使用 /api/v1/charts/types"""
    logger.warning("使用已弃用的legacy API: /api/chart-types")
    from app.api_v1 import router as v1_router
    return {"warning": "此端点已弃用，请使用 /api/v1/charts/types", "deprecated": True}

# 其他重要的legacy端点可以保留作为重定向
@app.get("/api/info")
async def legacy_api_info():
    """[LEGACY] API信息 - 请使用 /api/v1/info"""
    return {
        "message": "此端点已弃用，请使用 /api/v1/info",
        "deprecated": True,
        "new_endpoint": "/api/v1/info",
        "migration_guide": "所有legacy API将在未来版本中移除，请尽快迁移到v1 API"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )