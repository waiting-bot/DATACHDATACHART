// 基础类型定义
export interface BaseResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 访问码相关类型
export interface AccessCode {
  id?: number
  access_code: string
  max_usage: number
  usage_count: number
  is_active: boolean
  created_at?: string
  expires_at?: string | null
  last_used_at?: string | null
}

export interface AccessCodeValidation {
  valid: boolean
  remaining_uses: number
  max_usage: number
  expires_at?: string
}

// 文件上传相关类型
export interface FileUpload {
  file: File
  name: string
  size: number
  type: string
  lastModified: number
}

export interface UploadProgress {
  loaded: number
  total: number
  progress: number
}

// 图表相关类型
export interface ChartData {
  labels: string[]
  datasets: ChartDataset[]
}

export interface ChartDataset {
  label: string
  data: number[]
  backgroundColor?: string | string[]
  borderColor?: string | string[]
  borderWidth?: number
}

// 新增图表数据接口 (用于后端返回的Base64图像)
export interface GeneratedChart {
  chart_type: string
  chart_name: string
  chart_data: string // Base64 encoded image
  width: number
  height: number
  format: string
  file_size?: number
}

export interface PreviewChart {
  chart_type: string
  chart_name: string
  preview_data: string // Base64 encoded image
  width: number
  height: number
  format: string
  description?: string
}

export interface ChartOptions {
  responsive?: boolean
  maintainAspectRatio?: boolean
  plugins?: {
    title?: {
      display: boolean
      text: string
    }
    legend?: {
      display: boolean
      position?: 'top' | 'bottom' | 'left' | 'right'
    }
  }
}

export interface ChartConfig {
  type: SimpleChartType
  data: ChartData
  options?: ChartOptions
}

export type SimpleChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'doughnut' | 'radar'

export interface ChartTypeOption {
  id: SimpleChartType
  name: string
  description: string
  icon?: string
}

// 图表生成相关类型
export interface ChartGenerationRequest {
  access_code: string
  chart_type: SimpleChartType
  file: File
}

export interface ChartGenerationResponse {
  success: boolean
  chart?: {
    image: string // base64 encoded
    format: 'png' | 'svg'
    chart_type: SimpleChartType
    size?: {
      width: number
      height: number
    }
  }
  remaining_uses: number
  error?: string
  processing_time?: number
}

// 应用状态相关类型
export interface AppState {
  // 访问码状态
  accessCode: string | null
  isValidAccessCode: boolean | null
  remainingUses: number | null
  maxUsage: number | null
  
  // 文件上传状态
  uploadedFile: File | null
  isUploading: boolean
  uploadProgress: number
  uploadError: string | null
  
  // 图表生成状态
  generatedChart: string | null
  chartType: SimpleChartType
  isGenerating: boolean
  generationError: string | null
  
  // UI状态
  isLoading: boolean
  error: string | null
  currentStep: AppStep
}

export type AppStep = 'access-code' | 'upload' | 'generate' | 'result'

// 工作流步骤枚举
export enum WorkflowStep {
  ACCESS_CODE = 'access_code',
  FILE_UPLOAD = 'file_upload',
  CHART_GENERATION = 'chart_generation',
  CHART_DISPLAY = 'chart_display'
}

// 图表类型枚举 (扩展)
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  SCATTER = 'scatter',
  AREA = 'area',
  HEATMAP = 'heatmap',
  BOX = 'box',
  VIOLIN = 'violin',
  HISTOGRAM = 'histogram'
}

// API错误类型
export interface ApiError {
  code: string
  message: string
  details?: any
}

// 表单验证相关类型
export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
}

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

// 文件验证相关类型
export interface FileValidationRule {
  maxSize?: number // in bytes
  allowedTypes?: string[]
  allowedExtensions?: string[]
  custom?: (file: File) => boolean | string
}

// 用户界面相关类型
export interface UIComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface ButtonProps extends UIComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export interface InputProps extends UIComponentProps {
  type?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  label?: string
  required?: boolean
}

export interface HeaderProps {
  title?: string
  onLogoClick?: () => void
  showStatus?: boolean
  className?: string
  extraActions?: React.ReactNode
}

export interface StatusBarProps {
  remainingUsage: number
  maxUsage: number
  isAccessCodeValid: boolean
  currentStep: WorkflowStep
}

export interface WorkflowStepperProps {
  currentStep: WorkflowStep
  steps: Array<{
    id: WorkflowStep
    title: string
    description: string
    icon: string
  }>
  onStepClick?: (step: WorkflowStep) => void
}

export interface AccessCodeInputProps {
  value: string
  onChange: (value: string) => void
  onValidate?: (isValid: boolean) => void
  onValidated?: (data: any) => void
  loading?: boolean
  error?: string
}

// 工具函数类型
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// 事件类型
export interface AppEvents {
  'upload-progress': CustomEvent<number>
  'access-code-validated': CustomEvent<AccessCodeValidation>
  'chart-generated': CustomEvent<ChartGenerationResponse>
  'error': CustomEvent<{ type: string; message: string }>
}

// 配置类型
export interface AppConfig {
  api: {
    baseUrl: string
    timeout: number
  }
  upload: {
    maxFileSize: number // in MB
    supportedFormats: string[]
  }
  app: {
    name: string
    version: string
    debug: boolean
  }
}

// 默认导出
export default {
  // 常量
  CHART_TYPES: {
    BAR: 'bar' as ChartType,
    LINE: 'line' as ChartType,
    PIE: 'pie' as ChartType,
    SCATTER: 'scatter' as ChartType,
    AREA: 'area' as ChartType,
    DOUGHNUT: 'doughnut' as ChartType,
    RADAR: 'radar' as ChartType,
  },
  
  // 默认配置
  DEFAULT_CONFIG: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    SUPPORTED_FORMATS: ['.xlsx', '.xls'],
    API_TIMEOUT: 30000,
  },
}