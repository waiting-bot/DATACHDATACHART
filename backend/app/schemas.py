"""
Pydantic 模型定义
用于 API 请求和响应的数据验证
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class AccessCodeStatus(str, Enum):
    """访问码状态枚举"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"
    EXHAUSTED = "exhausted"

class ChartType(str, Enum):
    """图表类型枚举"""
    LINE = "line"
    BAR = "bar"
    PIE = "pie"
    SCATTER = "scatter"
    AREA = "area"
    HEATMAP = "heatmap"
    BOX = "box"
    VIOLIN = "violin"
    HISTOGRAM = "histogram"
    TABLE = "table"
    RADAR = "radar"
    
class CombinationChartType(str, Enum):
    """组合图表类型枚举"""
    BAR_BAR = "bar_bar"  # 柱形+柱形
    LINE_LINE = "line_line"  # 折线+折线
    BAR_LINE = "bar_line"  # 柱形+折线
    BAR_AREA = "bar_area"  # 柱形+面积
    LINE_AREA = "line_area"  # 折线+面积

# 访问码相关模型
class AccessCodeBase(BaseModel):
    """访问码基础模型"""
    max_usage: int = Field(..., gt=0, description="最大使用次数")
    description: Optional[str] = Field(None, description="描述")
    expires_at: Optional[datetime] = Field(None, description="过期时间")
    created_by: Optional[str] = Field(None, description="创建者")

class AccessCodeCreate(AccessCodeBase):
    """创建访问码请求模型"""
    access_code: str = Field(..., min_length=1, max_length=50, description="访问码")

class AccessCodeUpdate(BaseModel):
    """更新访问码请求模型"""
    max_usage: Optional[int] = Field(None, gt=0, description="最大使用次数")
    is_active: Optional[bool] = Field(None, description="是否激活")
    description: Optional[str] = Field(None, description="描述")
    expires_at: Optional[datetime] = Field(None, description="过期时间")

class AccessCodeResponse(AccessCodeBase):
    """访问码响应模型"""
    id: int
    access_code: str
    usage_count: int
    is_active: bool
    status: AccessCodeStatus
    remaining_usage: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AccessCodeValidateRequest(BaseModel):
    """验证访问码请求模型"""
    access_code: str = Field(..., description="访问码")

class AccessCodeValidateResponse(BaseModel):
    """验证访问码响应模型"""
    is_valid: bool
    message: str
    access_code: Optional[AccessCodeResponse] = None
    remaining_usage: Optional[int] = None

class AccessCodeStatisticsResponse(BaseModel):
    """访问码统计响应模型"""
    total_codes: int
    active_codes: int
    total_usage: int
    remaining_usage: int
    usage_rate: float

# 使用记录相关模型
class UsageLogCreate(BaseModel):
    """创建使用记录请求模型"""
    access_code_id: int = Field(..., description="访问码ID")
    ip_address: Optional[str] = Field(None, description="IP地址")
    user_agent: Optional[str] = Field(None, description="用户代理")
    file_name: Optional[str] = Field(None, description="文件名")
    file_size: Optional[int] = Field(None, description="文件大小")
    chart_type: Optional[ChartType] = Field(None, description="图表类型")
    success: bool = Field(True, description="是否成功")
    error_message: Optional[str] = Field(None, description="错误信息")
    processing_time: Optional[int] = Field(None, description="处理时间（毫秒）")

class UsageLogResponse(UsageLogCreate):
    """使用记录响应模型"""
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class UsageStatisticsResponse(BaseModel):
    """使用统计响应模型"""
    total_attempts: int
    successful_attempts: int
    failed_attempts: int
    success_rate: float
    chart_types: Dict[str, int]
    period_days: int

# 文件上传相关模型
class FileUploadRequest(BaseModel):
    """文件上传请求模型"""
    access_code: str = Field(..., description="访问码")
    chart_type: Optional[ChartType] = Field(None, description="图表类型")

class FileUploadResponse(BaseModel):
    """文件上传响应模型"""
    success: bool
    message: str
    file_info: Optional[Dict[str, Any]] = None
    remaining_usage: Optional[int] = None
    validation_details: Optional[Dict[str, Any]] = None

class FileValidationRequest(BaseModel):
    """文件验证请求模型"""
    file_path: str = Field(..., description="文件路径")
    original_filename: str = Field(..., description="原始文件名")
    file_size: int = Field(..., description="文件大小")

class FileValidationResponse(BaseModel):
    """文件验证响应模型"""
    success: bool
    message: str
    validation_details: Optional[Dict[str, Any]] = None
    file_info: Optional[Dict[str, Any]] = None

class ExcelParseRequest(BaseModel):
    """Excel解析请求模型"""
    file_path: str = Field(..., description="文件路径")
    chart_type: Optional[ChartType] = Field('bar', description="图表类型")

class ExcelParseResponse(BaseModel):
    """Excel解析响应模型"""
    success: bool
    message: str
    file_info: Optional[Dict[str, Any]] = None
    data_validation: Optional[Dict[str, Any]] = None
    processing_info: Optional[Dict[str, Any]] = None
    data_types: Optional[Dict[str, str]] = None
    suggested_charts: Optional[List[str]] = None
    chart_data: Optional[Dict[str, Any]] = None
    summary: Optional[Dict[str, Any]] = None

# 图表生成相关模型
class ChartGenerationRequest(BaseModel):
    """图表生成请求模型"""
    access_code: str = Field(..., description="访问码")
    chart_type: Optional[ChartType] = Field(None, description="图表类型")
    chart_data: Optional[Dict[str, Any]] = Field(None, description="图表数据（用于从数据生成图表）")
    chart_title: Optional[str] = Field(None, description="图表标题")
    width: Optional[int] = Field(None, description="图表宽度")
    height: Optional[int] = Field(None, description="图表高度")
    format: Optional[str] = Field(None, description="输出格式")

class ChartGenerationResponse(BaseModel):
    """图表生成响应模型"""
    success: bool
    message: str
    chart_data: Optional[Dict[str, Any]] = None
    chart_type: Optional[ChartType] = None
    remaining_usage: Optional[int] = None

class ChartTypeInfo(BaseModel):
    """图表类型信息模型"""
    type: ChartType
    name: str
    description: str
    suitable_for: List[str]

class ChartTypesResponse(BaseModel):
    """支持的图表类型响应模型"""
    chart_types: List[ChartTypeInfo]

# 智能推荐相关模型
class DataFeatures(BaseModel):
    """数据特征模型"""
    column_count: int = Field(..., description="总列数")
    row_count: int = Field(..., description="总行数")
    numeric_columns: List[str] = Field(..., description="数值列")
    categorical_columns: List[str] = Field(..., description="分类列")
    temporal_columns: List[str] = Field(..., description="时间列")
    data_types: Dict[str, str] = Field(..., description="数据类型映射")
    has_multiple_series: bool = Field(..., description="是否有多数据系列")
    has_time_data: bool = Field(..., description="是否包含时间数据")

class ChartRecommendation(BaseModel):
    """图表推荐模型"""
    chart_type: str = Field(..., description="图表类型")
    confidence: float = Field(..., ge=0, le=1, description="推荐置信度")
    reason: str = Field(..., description="推荐原因")
    suitable_scenarios: List[str] = Field(..., description="适用场景")
    suggested_data_mapping: Optional[Dict[str, Any]] = Field(None, description="建议的数据映射")

class SmartRecommendationRequest(BaseModel):
    """智能推荐请求模型"""
    file_path: str = Field(..., description="Excel文件路径")
    max_recommendations: int = Field(2, description="最大推荐数量")

class SmartRecommendationResponse(BaseModel):
    """智能推荐响应模型"""
    success: bool
    message: str
    data_features: DataFeatures
    recommendations: List[ChartRecommendation]
    file_info: Optional[Dict[str, Any]] = None

# 预览图相关模型
class PreviewGenerationRequest(BaseModel):
    """预览图生成请求模型"""
    file_path: str = Field(..., description="文件路径")
    chart_types: List[str] = Field(..., description="要生成预览的图表类型列表")
    width: Optional[int] = Field(400, description="预览图宽度")
    height: Optional[int] = Field(300, description="预览图高度")

class PreviewChartInfo(BaseModel):
    """预览图表信息模型"""
    chart_type: str
    chart_name: str
    preview_data: str  # Base64编码的预览图
    width: int
    height: int
    format: str
    description: Optional[str] = None

class PreviewGenerationResponse(BaseModel):
    """预览图生成响应模型"""
    success: bool
    message: str
    previews: List[PreviewChartInfo]
    file_info: Optional[Dict[str, Any]] = None

class ChartConfig(BaseModel):
    """图表配置模型"""
    color_scheme: Optional[str] = Field("business_blue_gray", description="配色方案")
    title: Optional[str] = Field("数据图表", description="图表标题")
    show_axis_labels: Optional[bool] = Field(True, description="显示轴标签")
    output_format: Optional[str] = Field("png", description="输出格式")

class SelectedChartsGenerationRequest(BaseModel):
    """选中图表生成请求模型"""
    file_path: str = Field(..., description="文件路径")
    selected_chart_types: List[str] = Field(..., description="用户选中的图表类型列表")
    access_code: str = Field(..., description="访问码")
    width: Optional[int] = Field(800, description="图表宽度")
    height: Optional[int] = Field(600, description="图表高度")
    format: Optional[str] = Field("png", description="输出格式")
    chart_config: Optional[ChartConfig] = Field(None, description="图表配置")

class GeneratedChartInfo(BaseModel):
    """生成的图表信息模型"""
    chart_type: str
    chart_name: str
    chart_data: str  # Base64编码的图表
    width: int
    height: int
    format: str
    file_size: Optional[int] = None

class SelectedChartsGenerationResponse(BaseModel):
    """选中图表生成响应模型"""
    success: bool
    message: str
    charts: List[GeneratedChartInfo]
    remaining_usage: Optional[int] = None

# 增强的图表配置相关模型
class ChartConfigRequest(BaseModel):
    """图表配置请求模型"""
    title: Optional[str] = Field("数据图表", description="图表标题")
    color_scheme: Optional[str] = Field("business_blue_gray", description="配色方案")
    resolution: Optional[str] = Field("300dpi", description="分辨率")
    show_axis_labels: Optional[bool] = Field(True, description="显示轴标签")
    output_format: Optional[str] = Field("png", description="输出格式")
    width: Optional[int] = Field(800, description="图表宽度")
    height: Optional[int] = Field(600, description="图表高度")

class ChartConfigResponse(BaseModel):
    """图表配置响应模型"""
    success: bool
    message: str
    config: ChartConfigRequest
    available_options: Optional[Dict[str, List[str]]] = None

class ColorSchemeInfo(BaseModel):
    """配色方案信息模型"""
    name: str
    value: str
    description: str
    preview_colors: List[str]

class AvailableColorSchemesResponse(BaseModel):
    """可用配色方案响应模型"""
    schemes: List[ColorSchemeInfo]

class ChartTemplateRequest(BaseModel):
    """图表模板请求模型"""
    name: str = Field(..., description="模板名称")
    chart_type: ChartType = Field(..., description="图表类型")
    config: ChartConfigRequest = Field(..., description="图表配置")
    description: Optional[str] = Field(None, description="模板描述")
    is_public: Optional[bool] = Field(False, description="是否公开")

class ChartTemplateResponse(BaseModel):
    """图表模板响应模型"""
    id: int
    name: str
    chart_type: ChartType
    config: ChartConfigRequest
    description: Optional[str]
    is_public: bool
    created_at: datetime
    usage_count: int
    
    class Config:
        from_attributes = True

# 系统配置相关模型
class SystemConfigRequest(BaseModel):
    """系统配置请求模型"""
    key: str = Field(..., description="配置键")
    value: str = Field(..., description="配置值")
    description: Optional[str] = Field(None, description="描述")

class SystemConfigResponse(BaseModel):
    """系统配置响应模型"""
    id: int
    key: str
    value: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# 通用响应模型
class StandardResponse(BaseModel):
    """标准API响应模型 - 符合dev-preferences.md规范"""
    success: bool
    data: Optional[Any] = None
    error: Optional[Dict[str, str]] = None

class ErrorDetail(BaseModel):
    """错误详情模型"""
    code: str
    message: str

class StandardErrorResponse(BaseModel):
    """标准错误响应模型"""
    success: bool = False
    data: Optional[Any] = None
    error: ErrorDetail

# 保持向后兼容的旧响应模型
class ApiResponse(BaseModel):
    """通用API响应模型"""
    success: bool
    message: str
    data: Optional[Any] = None
    error_code: Optional[str] = None

class PaginatedResponse(BaseModel):
    """分页响应模型"""
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int

# 错误响应模型
class ErrorResponse(BaseModel):
    """错误响应模型"""
    error: str
    error_code: str
    details: Optional[Dict[str, Any]] = None

# 验证器
@validator('max_usage')
def validate_max_usage(cls, v):
    """验证最大使用次数"""
    if v <= 0:
        raise ValueError('最大使用次数必须大于0')
    if v > 1000:
        raise ValueError('最大使用次数不能超过1000')
    return v

@validator('access_code')
def validate_access_code(cls, v):
    """验证访问码"""
    if not v or not v.strip():
        raise ValueError('访问码不能为空')
    if len(v) > 50:
        raise ValueError('访问码长度不能超过50个字符')
    return v.strip()

@validator('file_size')
def validate_file_size(cls, v):
    """验证文件大小"""
    if v is not None and v < 0:
        raise ValueError('文件大小不能为负数')
    if v is not None and v > 100 * 1024 * 1024:  # 100MB
        raise ValueError('文件大小不能超过100MB')
    return v

@validator('processing_time')
def validate_processing_time(cls, v):
    """验证处理时间"""
    if v is not None and v < 0:
        raise ValueError('处理时间不能为负数')
    if v is not None and v > 300000:  # 5分钟
        raise ValueError('处理时间不能超过5分钟')
    return v