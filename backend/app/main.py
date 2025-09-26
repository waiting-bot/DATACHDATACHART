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
from app.models import Base
from app.services.access_code_service import AccessCodeService, UsageLogService, SystemConfigService
from app.services.file_service import file_service
from app.services.excel_service import excel_parser
from app.schemas import *

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

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
    
    logger.info("Application startup complete")
    
    yield
    
    logger.info("Shutting down Chart Generation API...")
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
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # React dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    """API information endpoint"""
    return {
        "name": "智能图表生成工具 API",
        "version": "1.0.0",
        "description": "基于Excel文件自动生成图表的API服务",
        "endpoints": {
            "health": "/health",
            "validate_access_code": "/api/validate-access-code",
            "generate_chart": "/api/generate-chart",
            "chart_types": "/api/chart-types"
        },
        "supported_file_formats": [".xlsx", ".xls"],
        "supported_chart_types": ["bar", "line", "pie", "scatter", "area"]
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

# Access Code Management APIs
@app.post("/api/access-codes", response_model=AccessCodeResponse)
async def create_access_code(
    access_code_data: AccessCodeCreate,
    db: Session = Depends(get_db)
):
    """Create access code"""
    try:
        service = AccessCodeService(db)
        access_code = service.create_access_code(access_code_data)
        return access_code
    except Exception as e:
        logger.error(f"Failed to create access code: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/validate-access-code", response_model=AccessCodeValidateResponse)
async def validate_access_code(
    request: AccessCodeValidateRequest,
    db: Session = Depends(get_db)
):
    """Validate access code"""
    try:
        service = AccessCodeService(db)
        is_valid, code_record, message = service.validate_access_code(request.access_code)
        
        if is_valid and code_record:
            return AccessCodeValidateResponse(
                is_valid=True,
                message=message,
                access_code=code_record,
                remaining_usage=code_record.remaining_usage
            )
        else:
            return AccessCodeValidateResponse(
                is_valid=False,
                message=message
            )
    except Exception as e:
        logger.error(f"Failed to validate access code: {e}")
        raise HTTPException(status_code=500, detail="Validation failed")

@app.get("/api/access-codes/{access_code_id}", response_model=AccessCodeResponse)
async def get_access_code(
    access_code_id: int,
    db: Session = Depends(get_db)
):
    """Get access code details"""
    try:
        service = AccessCodeService(db)
        access_code = service.get_access_code_by_id(access_code_id)
        if not access_code:
            raise HTTPException(status_code=404, detail="Access code not found")
        return access_code
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get access code: {e}")
        raise HTTPException(status_code=500, detail="Failed to get access code")

@app.get("/api/access-codes", response_model=List[AccessCodeResponse])
async def get_access_codes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get access code list"""
    try:
        service = AccessCodeService(db)
        access_codes = service.get_all_access_codes(skip=skip, limit=limit)
        return access_codes
    except Exception as e:
        logger.error(f"Failed to get access codes: {e}")
        raise HTTPException(status_code=500, detail="Failed to get access codes")

@app.get("/api/access-codes/statistics", response_model=AccessCodeStatisticsResponse)
async def get_access_code_statistics(
    db: Session = Depends(get_db)
):
    """Get access code statistics"""
    try:
        service = AccessCodeService(db)
        stats = service.get_access_code_statistics()
        return AccessCodeStatisticsResponse(**stats)
    except Exception as e:
        logger.error(f"Failed to get statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")

# Chart Type APIs
@app.get("/api/chart-types", response_model=ChartTypesResponse)
async def get_chart_types():
    """Get supported chart types"""
    chart_types = [
        ChartTypeInfo(
            type=ChartType.LINE,
            name="折线图",
            description="显示数据随时间变化的趋势",
            suitable_for=["时间序列数据", "趋势分析", "连续数据"]
        ),
        ChartTypeInfo(
            type=ChartType.BAR,
            name="柱状图",
            description="比较不同类别的数据",
            suitable_for=["分类数据", "数量比较", "离散数据"]
        ),
        ChartTypeInfo(
            type=ChartType.PIE,
            name="饼图",
            description="显示各部分占总体的比例",
            suitable_for=["比例分析", "占比显示", "部分与整体"]
        ),
        ChartTypeInfo(
            type=ChartType.SCATTER,
            name="散点图",
            description="显示两个变量之间的关系",
            suitable_for=["相关性分析", "数据分布", "双变量关系"]
        ),
        ChartTypeInfo(
            type=ChartType.AREA,
            name="面积图",
            description="显示数据随时间变化的累积效果",
            suitable_for=["累积数据", "时间序列", "总量分析"]
        ),
        ChartTypeInfo(
            type=ChartType.HEATMAP,
            name="热力图",
            description="显示数据的密度和分布",
            suitable_for=["矩阵数据", "密度分析", "相关性热力图"]
        ),
        ChartTypeInfo(
            type=ChartType.BOX,
            name="箱线图",
            description="显示数据的分布和异常值",
            suitable_for=["数据分布", "异常值检测", "统计分析"]
        ),
        ChartTypeInfo(
            type=ChartType.VIOLIN,
            name="小提琴图",
            description="显示数据的分布密度",
            suitable_for=["数据分布", "密度分析", "统计可视化"]
        ),
        ChartTypeInfo(
            type=ChartType.HISTOGRAM,
            name="直方图",
            description="显示数据的频率分布",
            suitable_for=["频率分布", "数据分布", "统计分析"]
        )
    ]
    
    return ChartTypesResponse(chart_types=chart_types)

# File Upload APIs
@app.post("/api/upload-file", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    access_code: str = Form(...),
    chart_type: Optional[ChartType] = Form(None),
    db: Session = Depends(get_db)
):
    """上传Excel文件"""
    try:
        # 保存文件
        file_info = await file_service.save_uploaded_file(file, access_code, db)
        
        return FileUploadResponse(
            success=True,
            message="文件上传成功",
            file_info=file_info,
            remaining_usage=file_info.get("remaining_usage"),
            validation_details=file_info.get("validation_details")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文件上传失败: {e}")
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")

@app.post("/api/validate-file", response_model=FileValidationResponse)
async def validate_file(
    request: FileValidationRequest,
    db: Session = Depends(get_db)
):
    """验证文件"""
    try:
        from app.utils.file_validator import file_validator
        
        # 执行完整验证
        is_valid, message, validation_details = file_validator.full_validation(
            request.file_path, 
            request.original_filename, 
            request.file_size
        )
        
        # 获取文件信息
        file_info = file_service.get_file_info(Path(request.file_path))
        
        return FileValidationResponse(
            success=is_valid,
            message=message,
            validation_details=validation_details,
            file_info=file_info
        )
        
    except Exception as e:
        logger.error(f"文件验证失败: {e}")
        raise HTTPException(status_code=500, detail=f"文件验证失败: {str(e)}")

@app.post("/api/parse-excel", response_model=ExcelParseResponse)
async def parse_excel(
    request: ExcelParseRequest,
    db: Session = Depends(get_db)
):
    """解析Excel文件"""
    try:
        # 执行完整解析
        parse_result = excel_parser.full_parse(request.file_path, request.chart_type)
        
        return ExcelParseResponse(**parse_result)
        
    except Exception as e:
        logger.error(f"Excel解析失败: {e}")
        raise HTTPException(status_code=500, detail=f"Excel解析失败: {str(e)}")

@app.get("/api/storage-stats")
async def get_storage_stats():
    """获取存储统计信息"""
    try:
        stats = file_service.get_storage_stats()
        return {
            "success": True,
            "message": "存储统计获取成功",
            "stats": stats
        }
        
    except Exception as e:
        logger.error(f"获取存储统计失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取存储统计失败: {str(e)}")

# Placeholder for chart generation (will be implemented in next phase)
@app.post("/api/generate-chart")
async def generate_chart():
    """Generate chart from Excel file - Placeholder"""
    raise HTTPException(status_code=501, detail="This endpoint will be implemented in the next phase")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )