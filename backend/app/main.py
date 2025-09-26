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

# Chart Generation APIs
@app.post("/api/generate-chart", response_model=ChartGenerationResponse)
async def generate_chart(
    file: UploadFile = File(...),
    access_code: str = Form(...),
    chart_type: Optional[ChartType] = Form('bar'),
    chart_title: Optional[str] = Form('数据图表'),
    width: Optional[int] = Form(800),
    height: Optional[int] = Form(600),
    format: Optional[str] = Form('png'),
    db: Session = Depends(get_db)
):
    """生成图表"""
    try:
        start_time = datetime.now()
        
        # 1. 验证访问码
        access_service = AccessCodeService(db)
        is_valid, code_record, message = access_service.validate_access_code(access_code)
        
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
        
        if not code_record.can_use():
            raise HTTPException(status_code=400, detail="访问码使用次数已达上限")
        
        # 2. 上传和处理文件
        file_info = await file_service.save_uploaded_file(file, access_code, db)
        
        # 3. 解析Excel文件
        parse_result = excel_parser.full_parse(
            file_info['file_path'], 
            chart_type.value if chart_type else 'bar'
        )
        
        if not parse_result.get('success'):
            raise HTTPException(status_code=400, detail=parse_result.get('message', 'Excel解析失败'))
        
        # 4. 生成图表
        chart_data = parse_result.get('chart_data', {})
        
        # 优化图表尺寸
        if width == 800 and height == 600:  # 使用默认值时才优化
            optimized_width, optimized_height = chart_generator.optimize_chart_size(chart_data, chart_type.value)
            width, height = optimized_width, optimized_height
        
        chart_result = chart_generator.generate_chart(
            data=chart_data,
            chart_type=chart_type.value,
            title=chart_title or '数据图表',
            width=width,
            height=height,
            format=format.lower()
        )
        
        if not chart_result.get('success'):
            raise HTTPException(status_code=500, detail=chart_result.get('message', '图表生成失败'))
        
        # 5. 更新访问码使用次数
        usage_log = UsageLog(
            access_code_id=code_record.id,
            file_name=file.filename,
            file_size=file.size,
            chart_type=chart_type,
            success=True,
            processing_time=int((datetime.now() - start_time).total_seconds() * 1000)
        )
        db.add(usage_log)
        code_record.increment_usage()
        db.commit()
        
        # 6. 清理临时文件
        try:
            import os
            if os.path.exists(file_info['file_path']):
                os.remove(file_info['file_path'])
        except Exception as e:
            logger.warning(f"清理临时文件失败: {e}")
        
        return ChartGenerationResponse(
            success=True,
            message="图表生成成功",
            chart_data=chart_result,
            chart_type=chart_type,
            remaining_usage=code_record.remaining_usage
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"图表生成失败: {e}")
        raise HTTPException(status_code=500, detail=f"图表生成失败: {str(e)}")

@app.post("/api/generate-chart-from-data", response_model=ChartGenerationResponse)
async def generate_chart_from_data(
    request: ChartGenerationRequest,
    db: Session = Depends(get_db)
):
    """从已有数据生成图表"""
    try:
        # 1. 验证访问码
        access_service = AccessCodeService(db)
        is_valid, code_record, message = access_service.validate_access_code(request.access_code)
        
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
        
        if not code_record.can_use():
            raise HTTPException(status_code=400, detail="访问码使用次数已达上限")
        
        # 2. 生成图表
        chart_result = chart_generator.generate_chart(
            data=request.chart_data,
            chart_type=request.chart_type.value if request.chart_type else 'bar',
            title=request.chart_title or '数据图表',
            width=request.width or 800,
            height=request.height or 600,
            format=request.format or 'png'
        )
        
        if not chart_result.get('success'):
            raise HTTPException(status_code=500, detail=chart_result.get('message', '图表生成失败'))
        
        # 3. 更新访问码使用次数
        usage_log = UsageLog(
            access_code_id=code_record.id,
            chart_type=request.chart_type,
            success=True
        )
        db.add(usage_log)
        code_record.increment_usage()
        db.commit()
        
        return ChartGenerationResponse(
            success=True,
            message="图表生成成功",
            chart_data=chart_result,
            chart_type=request.chart_type,
            remaining_usage=code_record.remaining_usage
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"图表生成失败: {e}")
        raise HTTPException(status_code=500, detail=f"图表生成失败: {str(e)}")

@app.get("/api/chart-suggestions")
async def get_chart_suggestions(
    file_path: str,
    db: Session = Depends(get_db)
):
    """获取图表类型建议"""
    try:
        # 解析Excel文件
        parse_result = excel_parser.full_parse(file_path, 'bar')
        
        if not parse_result.get('success'):
            raise HTTPException(status_code=400, detail=parse_result.get('message', 'Excel解析失败'))
        
        chart_data = parse_result.get('chart_data', {})
        
        # 获取建议
        suggestions = chart_generator.suggest_chart_type(chart_data)
        
        return {
            "success": True,
            "message": "图表类型建议获取成功",
            "suggestions": suggestions,
            "chart_data": chart_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取图表建议失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取图表建议失败: {str(e)}")

# Preview Chart Generation APIs
@app.post("/api/generate-previews", response_model=PreviewGenerationResponse)
async def generate_previews(
    request: PreviewGenerationRequest,
    db: Session = Depends(get_db)
):
    """生成预览图表（不消耗访问码）"""
    try:
        # 验证文件存在
        if not Path(request.file_path).exists():
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 解析Excel文件获取数据
        parse_result = excel_parser.full_parse(request.file_path, 'bar')
        
        if not parse_result.get('success'):
            raise HTTPException(status_code=400, detail=parse_result.get('message', 'Excel解析失败'))
        
        chart_data = parse_result.get('chart_data', {})
        
        # 生成预览图表
        previews = chart_generator.generate_multiple_previews(
            data=chart_data,
            chart_types=request.chart_types,
            width=request.width or 400,
            height=request.height or 300
        )
        
        # 获取文件信息
        file_info = file_service.get_file_info(Path(request.file_path))
        
        return PreviewGenerationResponse(
            success=True,
            message=f"成功生成 {len(previews)} 个预览图表",
            previews=[PreviewChartInfo(**preview) for preview in previews],
            file_info=file_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"预览图表生成失败: {e}")
        raise HTTPException(status_code=500, detail=f"预览图表生成失败: {str(e)}")

@app.post("/api/generate-selected-charts", response_model=SelectedChartsGenerationResponse)
async def generate_selected_charts(
    request: SelectedChartsGenerationRequest,
    db: Session = Depends(get_db)
):
    """生成用户选中的高质量图表（消耗访问码）"""
    start_time = datetime.now()
    
    try:
        # 1. 验证访问码
        access_service = AccessCodeService(db)
        is_valid, code_record, message = access_service.validate_access_code(request.access_code)
        
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
        
        if not code_record.can_use():
            raise HTTPException(status_code=400, detail="访问码使用次数已达上限")
        
        # 2. 验证文件存在
        if not Path(request.file_path).exists():
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 3. 解析Excel文件获取数据
        parse_result = excel_parser.full_parse(request.file_path, 'bar')
        
        if not parse_result.get('success'):
            raise HTTPException(status_code=400, detail=parse_result.get('message', 'Excel解析失败'))
        
        chart_data = parse_result.get('chart_data', {})
        
        # 4. 生成选中的图表
        generated_charts = []
        
        for chart_type in request.selected_chart_types:
            try:
                # 优化图表尺寸
                if request.width == 800 and request.height == 600:  # 使用默认值时才优化
                    optimized_width, optimized_height = chart_generator.optimize_chart_size(chart_data, chart_type)
                    width, height = optimized_width, optimized_height
                else:
                    width, height = request.width, request.height
                
                # 生成图表
                chart_result = chart_generator.generate_chart(
                    data=chart_data,
                    chart_type=chart_type,
                    title=f"{chart_generator.get_chart_name(chart_type)}",
                    width=width,
                    height=height,
                    format=request.format or 'png'
                )
                
                if chart_result.get('success'):
                    generated_charts.append({
                        'chart_type': chart_type,
                        'chart_name': chart_generator.get_chart_name(chart_type),
                        'chart_data': chart_result.get('image_data', ''),
                        'width': chart_result.get('width', width),
                        'height': chart_result.get('height', height),
                        'format': request.format or 'png',
                        'file_size': len(chart_result.get('image_data', ''))
                    })
                else:
                    logger.warning(f"图表生成失败 {chart_type}: {chart_result.get('message')}")
                    
            except Exception as e:
                logger.error(f"图表生成异常 {chart_type}: {e}")
        
        # 5. 更新访问码使用次数
        if generated_charts:
            usage_log = UsageLog(
                access_code_id=code_record.id,
                chart_type=", ".join(request.selected_chart_types),
                success=True,
                processing_time=int((datetime.now() - start_time).total_seconds() * 1000)
            )
            db.add(usage_log)
            code_record.increment_usage()
            db.commit()
        
        return SelectedChartsGenerationResponse(
            success=True,
            message=f"成功生成 {len(generated_charts)} 个图表",
            charts=[GeneratedChartInfo(**chart) for chart in generated_charts],
            remaining_usage=code_record.remaining_usage if code_record else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"选中图表生成失败: {e}")
        raise HTTPException(status_code=500, detail=f"选中图表生成失败: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )