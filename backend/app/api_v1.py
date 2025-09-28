"""
API v1 路由模块
符合dev-preferences.md规范的API路由
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
import logging

from app.database import get_db
from app.services.access_code_service import AccessCodeService, UsageLogService, SystemConfigService
from app.services.file_service import file_service
from app.services.excel_service import excel_parser
from app.services.chart_service import chart_generator
from app.schemas import *
from app.exceptions import create_success_response, ErrorCode, ErrorMessage
from pathlib import Path

from app.logging_config import get_logger, log_performance
logger = get_logger(__name__)

# 创建路由器
router = APIRouter(prefix="/api/v1", tags=["v1"])

# === 健康检查和信息API ===

@router.get("/health")
async def health_check():
    """健康检查端点"""
    from app.database import check_database_connection
    db_status = check_database_connection()
    return create_success_response({
        "status": "healthy" if db_status else "unhealthy",
        "database": "connected" if db_status else "disconnected",
        "version": "1.0.0"
    })

@router.get("/info")
async def api_info():
    """API信息端点"""
    return create_success_response({
        "name": "智能图表生成工具 API",
        "version": "1.0.0",
        "description": "基于Excel文件自动生成图表的API服务",
        "endpoints": {
            "health": "/api/v1/health",
            "validate_access_code": "/api/v1/access-codes/validate",
            "generate_chart": "/api/v1/charts/generate",
            "chart_types": "/api/v1/charts/types",
            "config_options": "/api/v1/charts/config/options",
            "config_validate": "/api/v1/charts/config/validate",
            "chart_templates": "/api/v1/charts/templates"
        },
        "supported_file_formats": [".xlsx", ".xls"],
        "supported_chart_types": ["bar", "line", "pie", "scatter", "area", "heatmap", "box", "violin", "histogram"]
    })

# === 访问码管理API ===

@router.post("/access-codes", response_model=StandardResponse)
async def create_access_code(
    access_code_data: AccessCodeCreate,
    db: Session = Depends(get_db)
):
    """创建访问码"""
    try:
        service = AccessCodeService(db)
        access_code = service.create_access_code(access_code_data)
        return create_success_response(access_code)
    except Exception as e:
        logger.error(f"创建访问码失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/access-codes/validate", response_model=StandardResponse)
async def validate_access_code(
    request: AccessCodeValidateRequest,
    db: Session = Depends(get_db)
):
    """验证访问码"""
    try:
        service = AccessCodeService(db)
        is_valid, code_record, message = service.validate_access_code(request.access_code)
        
        if is_valid and code_record:
            response_data = AccessCodeValidateResponse(
                is_valid=True,
                message=message,
                access_code=code_record,
                remaining_usage=code_record.remaining_usage
            )
            return create_success_response(response_data)
        else:
            raise HTTPException(status_code=400, detail=message)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"验证访问码失败: {e}")
        raise HTTPException(status_code=500, detail="验证失败")

@router.get("/access-codes/{access_code_id}", response_model=StandardResponse)
async def get_access_code(
    access_code_id: int,
    db: Session = Depends(get_db)
):
    """获取访问码详情"""
    try:
        service = AccessCodeService(db)
        access_code = service.get_access_code_by_id(access_code_id)
        if not access_code:
            raise HTTPException(status_code=404, detail="访问码不存在")
        return create_success_response(access_code)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取访问码失败: {e}")
        raise HTTPException(status_code=500, detail="获取访问码失败")

@router.get("/access-codes", response_model=StandardResponse)
async def get_access_codes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """获取访问码列表"""
    try:
        service = AccessCodeService(db)
        access_codes = service.get_all_access_codes(skip=skip, limit=limit)
        return create_success_response(access_codes)
    except Exception as e:
        logger.error(f"获取访问码列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取访问码列表失败")

@router.get("/access-codes/statistics", response_model=StandardResponse)
async def get_access_code_statistics(
    db: Session = Depends(get_db)
):
    """获取访问码统计信息"""
    try:
        service = AccessCodeService(db)
        stats = service.get_access_code_statistics()
        return create_success_response(stats)
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        raise HTTPException(status_code=500, detail="获取统计信息失败")

# === 图表类型API ===

@router.get("/charts/types", response_model=StandardResponse)
async def get_chart_types():
    """获取支持的图表类型"""
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
    
    return create_success_response(ChartTypesResponse(chart_types=chart_types))

# === 文件上传API ===

@router.post("/files/upload", response_model=StandardResponse)
@log_performance
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
        
        response_data = FileUploadResponse(
            success=True,
            message="文件上传成功",
            file_info=file_info,
            remaining_usage=file_info.get("remaining_usage"),
            validation_details=file_info.get("validation_details")
        )
        
        return create_success_response(response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文件上传失败: {e}")
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")

# === Excel数据解析API ===

@router.post("/files/parse-excel", response_model=StandardResponse)
@log_performance
async def parse_excel_data(
    request: ExcelParseRequest,
    db: Session = Depends(get_db)
):
    """解析Excel文件并返回数据结构信息"""
    try:
        # 验证文件是否存在
        if not Path(request.file_path).exists():
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 解析Excel文件
        excel_data = excel_parser.parse_excel_file(request.file_path)
        
        # 构建响应数据
        response_data = ExcelParseResponse(
            success=True,
            message="Excel文件解析成功",
            file_info={
                "file_path": request.file_path,
                "chart_type": request.chart_type.value if request.chart_type else None
            },
            data_validation=excel_data.get("data_validation"),
            processing_info=excel_data.get("processing_info"),
            data_types=excel_data.get("data_types"),
            suggested_charts=excel_data.get("suggested_charts"),
            chart_data=excel_data.get("chart_data"),
            summary=excel_data.get("summary")
        )
        
        return create_success_response(response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Excel文件解析失败: {e}")
        raise HTTPException(status_code=500, detail=f"Excel文件解析失败: {str(e)}")

# === 智能推荐API ===

@router.post("/charts/smart-recommendations", response_model=StandardResponse)
@log_performance
async def smart_recommend_charts(
    request: SmartRecommendationRequest,
    db: Session = Depends(get_db)
):
    """基于Excel文件数据特征智能推荐图表类型"""
    try:
        # 验证文件是否存在
        if not Path(request.file_path).exists():
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 解析Excel文件获取数据特征
        excel_data = excel_parser.parse_excel_file(request.file_path)
        
        # 分析数据特征
        data_features = analyze_data_features(excel_data)
        
        # 基于数据特征生成推荐
        recommendations = generate_chart_recommendations(data_features, request.max_recommendations)
        
        # 构建响应
        response_data = SmartRecommendationResponse(
            success=True,
            message="智能推荐生成成功",
            data_features=data_features,
            recommendations=recommendations,
            file_info={
                "file_path": request.file_path,
                "total_rows": len(excel_data.get("chart_data", {}).get("raw_data", {}).get("data", [])),
                "total_columns": len(excel_data.get("chart_data", {}).get("raw_data", {}).get("columns", []))
            }
        )
        
        return create_success_response(response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"智能推荐失败: {e}")
        raise HTTPException(status_code=500, detail=f"智能推荐失败: {str(e)}")

def analyze_data_features(excel_data: Dict[str, Any]) -> DataFeatures:
    """分析Excel数据特征"""
    chart_data = excel_data.get("chart_data", {})
    raw_data = chart_data.get("raw_data", {})
    
    columns = raw_data.get("columns", [])
    data_types = raw_data.get("data_types", {})
    data_rows = raw_data.get("data", [])
    
    # 分类数据列
    numeric_columns = [col for col in columns if data_types.get(col) == "numeric"]
    categorical_columns = [col for col in columns if data_types.get(col) in ["string", "category"]]
    temporal_columns = [col for col in columns if any(keyword in col.lower() for keyword in ["时间", "日期", "time", "date", "年", "月", "日", "季度"])]
    
    return DataFeatures(
        column_count=len(columns),
        row_count=len(data_rows),
        numeric_columns=numeric_columns,
        categorical_columns=categorical_columns,
        temporal_columns=temporal_columns,
        data_types=data_types,
        has_multiple_series=len(numeric_columns) > 1,
        has_time_data=len(temporal_columns) > 0
    )

def generate_chart_recommendations(features: DataFeatures, max_recommendations: int) -> List[ChartRecommendation]:
    """基于数据特征生成图表推荐"""
    recommendations = []
    
    # 推荐规则引擎
    if features.has_time_data and len(features.numeric_columns) >= 1:
        # 时间序列数据
        recommendations.append(ChartRecommendation(
            chart_type="line",
            confidence=0.9,
            reason="检测到时间序列数据，适合展示趋势变化",
            suitable_scenarios=["趋势分析", "时间序列展示", "变化监测"],
            suggested_data_mapping={"x_axis": features.temporal_columns[0], "y_axis": features.numeric_columns[0]}
        ))
        
        if len(features.numeric_columns) >= 2:
            recommendations.append(ChartRecommendation(
                chart_type="bar_line",
                confidence=0.85,
                reason="时间序列+多数值数据，适合对比数值与趋势",
                suitable_scenarios=["多指标趋势对比", "目标达成分析"],
                suggested_data_mapping={"x_axis": features.temporal_columns[0], "y1_axis": features.numeric_columns[0], "y2_axis": features.numeric_columns[1]}
            ))
    
    if len(features.categorical_columns) >= 1 and len(features.numeric_columns) >= 1:
        # 分类对比数据
        recommendations.append(ChartRecommendation(
            chart_type="bar",
            confidence=0.8,
            reason="检测到分类+数值数据，适合对比不同类别",
            suitable_scenarios=["类别对比", "排名展示", "性能比较"],
            suggested_data_mapping={"x_axis": features.categorical_columns[0], "y_axis": features.numeric_columns[0]}
        ))
        
        if len(features.numeric_columns) == 1 and len(features.categorical_columns) <= 5:
            recommendations.append(ChartRecommendation(
                chart_type="pie",
                confidence=0.75,
                reason="分类数量适中+单一数值，适合展示占比关系",
                suitable_scenarios=["占比分析", "构成展示", "份额对比"],
                suggested_data_mapping={"labels": features.categorical_columns[0], "values": features.numeric_columns[0]}
            ))
    
    if len(features.numeric_columns) >= 2 and not features.has_time_data:
        # 多数值数据对比
        recommendations.append(ChartRecommendation(
            chart_type="scatter",
            confidence=0.7,
            reason="检测到多个数值列，适合分析相关性",
            suitable_scenarios=["相关性分析", "数据分布", "异常值检测"],
            suggested_data_mapping={"x_axis": features.numeric_columns[0], "y_axis": features.numeric_columns[1]}
        ))
    
    if len(features.categorical_columns) >= 2 and len(features.numeric_columns) >= 1:
        # 多维度数据
        recommendations.append(ChartRecommendation(
            chart_type="radar",
            confidence=0.65,
            reason="检测到多维度分类数据，适合多指标对比",
            suitable_scenarios=["多维度评估", "能力雷达图", "综合分析"],
            suggested_data_mapping={"categories": features.categorical_columns[:5], "values": features.numeric_columns[0]}
        ))
    
    # 按置信度排序，返回前N个推荐
    recommendations.sort(key=lambda x: x.confidence, reverse=True)
    return recommendations[:max_recommendations]

# === 图表生成API ===

@router.post("/charts/generate", response_model=StandardResponse)
@log_performance
async def generate_chart(
    request: ChartGenerationRequest,
    db: Session = Depends(get_db)
):
    """生成图表（支持文件上传或直接数据）"""
    try:
        service = AccessCodeService(db)
        
        # 验证访问码
        is_valid, code_record, message = service.validate_access_code(request.access_code)
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
        
        # 处理文件上传或直接数据生成
        if request.chart_data:
            # 直接从数据生成图表
            chart_result = chart_generator.generate_chart(
                data=request.chart_data,
                chart_type=request.chart_type.value if hasattr(request.chart_type, 'value') else request.chart_type or 'bar',
                title=request.chart_title or "数据图表",
                width=request.width or 800,
                height=request.height or 600,
                format=request.format or 'png'
            )
        else:
            # 需要文件路径，这里简化处理
            raise HTTPException(status_code=400, detail="请提供图表数据或文件路径")
        
        # 使用访问码
        success, use_message, _ = service.use_access_code(request.access_code)
        if not success:
            raise HTTPException(status_code=400, detail=use_message)
        
        response_data = ChartGenerationResponse(
            success=True,
            message="图表生成成功",
            chart_data=chart_result,
            chart_type=request.chart_type,
            remaining_usage=code_record.remaining_usage - 1 if code_record else None
        )
        
        return create_success_response(response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"图表生成失败: {e}")
        logger.error(f"请求参数: chart_type={request.chart_type}, chart_title={request.chart_title}")
        # 返回用户友好的错误信息
        if "chart_type" in str(e).lower():
            raise HTTPException(status_code=400, detail="不支持的图表类型，请选择其他图表类型")
        elif "access_code" in str(e).lower():
            raise HTTPException(status_code=400, detail="访问码验证失败，请检查访问码是否正确")
        elif "file" in str(e).lower():
            raise HTTPException(status_code=400, detail="文件处理失败，请重新上传文件")
        else:
            raise HTTPException(status_code=500, detail="图表生成失败，请稍后重试")

# === 预览图生成API ===

@router.post("/charts/previews/generate", response_model=StandardResponse)
async def generate_previews(
    request: PreviewGenerationRequest,
    db: Session = Depends(get_db)
):
    """生成预览图（不消耗访问码）"""
    try:
        if not Path(request.file_path).exists():
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 解析Excel文件
        excel_data = excel_parser.parse_excel_file(request.file_path)
        
        # 生成预览图
        previews = chart_generator.generate_multiple_previews(
            data=excel_data,
            chart_types=request.chart_types,
            width=request.width or 400,
            height=request.height or 300
        )
        
        response_data = PreviewGenerationResponse(
            success=True,
            message="预览图生成成功",
            previews=previews,
            file_info={"file_path": request.file_path}
        )
        
        return create_success_response(response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"预览图生成失败: {e}")
        raise HTTPException(status_code=500, detail=f"预览图生成失败: {str(e)}")

@router.post("/charts/previews/selected-generate", response_model=StandardResponse)
async def generate_selected_charts(
    request: SelectedChartsGenerationRequest,
    db: Session = Depends(get_db)
):
    """生成选中的高质量图表（消耗访问码）"""
    try:
        service = AccessCodeService(db)
        
        # 验证访问码
        is_valid, code_record, message = service.validate_access_code(request.access_code)
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
        
        if not Path(request.file_path).exists():
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 解析Excel文件
        excel_data = excel_parser.parse_excel_file(request.file_path)
        
        # 生成选中的图表
        charts = []
        for chart_type in request.selected_chart_types:
            # 使用配置参数或默认值
            chart_title = request.chart_config.title if request.chart_config else f"{chart_type}图表"
            color_scheme = request.chart_config.color_scheme if request.chart_config else "business_blue_gray"
            
            chart_result = chart_generator.generate_chart(
                data=excel_data,
                chart_type=chart_type,
                title=chart_title,
                width=request.width or 800,
                height=request.height or 600,
                format=request.format or 'png',
                color_scheme=color_scheme
            )
            
            if not chart_result.get('success'):
                logger.warning(f"图表生成失败 {chart_type}: {chart_result.get('message')}")
                continue
            
            chart_info = GeneratedChartInfo(
                chart_type=chart_type,
                chart_name=chart_generator.get_chart_name(chart_type),
                chart_data=chart_result.get('image_data', ''),
                width=request.width or 800,
                height=request.height or 600,
                format=request.format or 'png',
                file_size=len(chart_result.get('image_data', ''))
            )
            charts.append(chart_info)
        
        # 使用访问码（只消耗1次，不管生成多少图表）
        success, use_message, _ = service.use_access_code(request.access_code)
        if not success:
            raise HTTPException(status_code=400, detail=use_message)
        
        response_data = SelectedChartsGenerationResponse(
            success=True,
            message="图表生成成功",
            charts=charts,
            remaining_usage=code_record.remaining_usage - 1 if code_record else None
        )
        
        return create_success_response(response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"选中图表生成失败: {e}")
        raise HTTPException(status_code=500, detail=f"选中图表生成失败: {str(e)}")

# === 图表配置API ===

@router.get("/charts/config/options", response_model=StandardResponse)
async def get_chart_config_options():
    """获取图表配置选项"""
    try:
        options = {
            "color_schemes": [
                {"value": "business_blue_gray", "name": "商务蓝灰", "description": "专业商务配色，适合正式汇报"},
                {"value": "professional_black_gray", "name": "专业黑灰", "description": "经典黑白配色，适合各类场合"},
                {"value": "modern_blue", "name": "现代蓝色", "description": "清新现代蓝色，适合创新展示"},
                {"value": "elegant_purple", "name": "优雅紫色", "description": "高雅紫色渐变，适合高端展示"}
            ],
            "resolutions": [
                {"value": "150dpi", "name": "标准 (150dpi)", "description": "适合屏幕显示"},
                {"value": "300dpi", "name": "高清 (300dpi)", "description": "适合打印和高清展示"}
            ],
            "output_formats": [
                {"value": "png", "name": "PNG", "description": "透明背景，适合网页和PPT"},
                {"value": "svg", "name": "SVG", "description": "矢量格式，无损缩放"},
                {"value": "jpg", "name": "JPG", "description": "压缩格式，文件较小"}
            ],
            "chart_types": [
                {"value": "bar", "name": "柱状图", "description": "比较不同类别的数据"},
                {"value": "line", "name": "折线图", "description": "显示数据变化趋势"},
                {"value": "pie", "name": "饼图", "description": "显示比例关系"},
                {"value": "area", "name": "面积图", "description": "显示累积变化"},
                {"value": "scatter", "name": "散点图", "description": "显示数据分布"},
                {"value": "radar", "name": "雷达图", "description": "多维度数据对比"}
            ]
        }
        
        return create_success_response(options)
    except Exception as e:
        logger.error(f"获取配置选项失败: {e}")
        raise HTTPException(status_code=500, detail="获取配置选项失败")

@router.post("/charts/config/validate", response_model=StandardResponse)
async def validate_chart_config(
    config: ChartConfigRequest
):
    """验证图表配置"""
    try:
        # 验证配置参数
        validation_errors = []
        
        if config.width and (config.width < 200 or config.width > 2000):
            validation_errors.append("图表宽度应在200-2000像素之间")
        
        if config.height and (config.height < 200 or config.height > 2000):
            validation_errors.append("图表高度应在200-2000像素之间")
        
        if config.title and len(config.title) > 100:
            validation_errors.append("图表标题长度不能超过100字符")
        
        if validation_errors:
            return {
                "success": False,
                "data": None,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "; ".join(validation_errors)
                }
            }
        
        # 验证通过，返回配置建议
        suggestions = []
        if config.color_scheme == "business_blue_gray":
            suggestions.append("商务蓝灰配色非常适合企业报表")
        
        if config.resolution == "300dpi":
            suggestions.append("300dpi分辨率适合打印使用")
        
        return create_success_response({
            "valid": True,
            "suggestions": suggestions,
            "optimized_config": config.dict()
        })
    except Exception as e:
        logger.error(f"验证图表配置失败: {e}")
        raise HTTPException(status_code=500, detail="图表配置验证失败")

@router.post("/charts/config/preview", response_model=StandardResponse)
async def generate_config_preview(
    request: dict
):
    """生成配置预览图（不消耗访问码）"""
    try:
        # 这里应该生成一个预览图
        # 目前返回模拟数据
        preview_data = {
            "preview_url": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2NjYiPuWVhuWTgeWbvueJhzwvdGV4dD48L3N2Zz4=",
            "config_applied": request.get("config", {}),
            "estimated_file_size": "150KB",
            "generation_time": "1-2秒"
        }
        
        return create_success_response(preview_data)
    except Exception as e:
        logger.error(f"生成配置预览失败: {e}")
        raise HTTPException(status_code=500, detail="配置预览生成失败")

# === 图表模板API ===

@router.get("/charts/templates", response_model=StandardResponse)
async def get_chart_templates(
    chart_type: Optional[ChartType] = None,
    is_public: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """获取图表模板列表"""
    try:
        # 这里应该从数据库获取模板
        # 目前返回示例模板
        templates = [
            {
                "id": 1,
                "name": "月度销售报告",
                "chart_type": "bar",
                "config": {
                    "title": "月度销售报告",
                    "color_scheme": "business_blue_gray",
                    "resolution": "300dpi",
                    "show_axis_labels": True,
                    "output_format": "png"
                },
                "description": "适用于月度销售数据展示",
                "is_public": True,
                "usage_count": 156,
                "created_at": "2024-01-15T10:30:00Z"
            },
            {
                "id": 2,
                "name": "项目进度追踪",
                "chart_type": "line",
                "config": {
                    "title": "项目进度追踪",
                    "color_scheme": "modern_blue",
                    "resolution": "300dpi",
                    "show_axis_labels": True,
                    "output_format": "png"
                },
                "description": "适用于项目管理进度展示",
                "is_public": True,
                "usage_count": 89,
                "created_at": "2024-01-20T14:20:00Z"
            }
        ]
        
        # 过滤模板
        if chart_type:
            templates = [t for t in templates if t["chart_type"] == chart_type]
        if is_public is not None:
            templates = [t for t in templates if t["is_public"] == is_public]
        
        return create_success_response(templates)
    except Exception as e:
        logger.error(f"获取图表模板失败: {e}")
        raise HTTPException(status_code=500, detail="获取图表模板失败")

@router.post("/charts/templates", response_model=StandardResponse)
async def create_chart_template(
    template: ChartTemplateRequest,
    db: Session = Depends(get_db)
):
    """创建图表模板"""
    try:
        # 这里应该保存到数据库
        # 目前返回模拟响应
        created_template = {
            "id": 3,
            "name": template.name,
            "chart_type": template.chart_type,
            "config": template.config,
            "description": template.description,
            "is_public": template.is_public,
            "usage_count": 0,
            "created_at": "2024-01-25T16:45:00Z"
        }
        
        return create_success_response(created_template)
    except Exception as e:
        logger.error(f"创建图表模板失败: {e}")
        raise HTTPException(status_code=500, detail="创建图表模板失败")

@router.get("/charts/templates/{template_id}", response_model=StandardResponse)
async def get_chart_template(
    template_id: int,
    db: Session = Depends(get_db)
):
    """获取图表模板详情"""
    try:
        # 这里应该从数据库获取
        # 目前返回示例数据
        template = {
            "id": template_id,
            "name": "月度销售报告",
            "chart_type": "bar",
            "config": {
                "title": "月度销售报告",
                "color_scheme": "business_blue_gray",
                "resolution": "300dpi",
                "show_axis_labels": True,
                "output_format": "png"
            },
            "description": "适用于月度销售数据展示",
            "is_public": True,
            "usage_count": 156,
            "created_at": "2024-01-15T10:30:00Z"
        }
        
        return create_success_response(template)
    except Exception as e:
        logger.error(f"获取图表模板详情失败: {e}")
        raise HTTPException(status_code=500, detail="获取图表模板详情失败")