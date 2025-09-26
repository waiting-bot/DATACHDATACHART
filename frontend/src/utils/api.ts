import axios from 'axios'
import type { AxiosInstance, AxiosResponse, AxiosError } from 'axios'

// API 基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

// 标准响应接口
export interface StandardResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

// 错误详情接口
export interface ErrorDetail {
  code: string
  message: string
  details?: Record<string, any>
}

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token等
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse<StandardResponse>) => {
    return response
  },
  (error: AxiosError<StandardResponse>) => {
    // 处理网络错误和API错误
    if (error.response) {
      // 服务器返回了错误状态码
      const errorData = error.response.data
      throw {
        code: errorData?.error?.code || 'API_ERROR',
        message: errorData?.error?.message || error.message || '请求失败',
        details: errorData?.error?.details,
        status: error.response.status,
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      throw {
        code: 'NETWORK_ERROR',
        message: '网络连接失败，请检查网络设置',
        details: error.message,
      }
    } else {
      // 请求配置错误
      throw {
        code: 'REQUEST_ERROR',
        message: '请求配置错误',
        details: error.message,
      }
    }
  }
)

// API 类
export class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = apiClient
  }

  // 通用请求方法
  private async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any,
    config?: any
  ): Promise<StandardResponse<T>> {
    try {
      const response = await this.client.request<StandardResponse<T>>({
        method,
        url,
        data,
        ...config,
      })
      return response.data
    } catch (error: any) {
      throw error
    }
  }

  // GET 请求
  async get<T = any>(url: string, config?: any): Promise<StandardResponse<T>> {
    return this.request<T>('GET', url, undefined, config)
  }

  // POST 请求
  async post<T = any>(url: string, data?: any, config?: any): Promise<StandardResponse<T>> {
    return this.request<T>('POST', url, data, config)
  }

  // PUT 请求
  async put<T = any>(url: string, data?: any, config?: any): Promise<StandardResponse<T>> {
    return this.request<T>('PUT', url, data, config)
  }

  // DELETE 请求
  async delete<T = any>(url: string, config?: any): Promise<StandardResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config)
  }

  // 文件上传（使用 FormData）
  async uploadFile(url: string, file: File, additionalData?: Record<string, any>): Promise<StandardResponse> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value))
      })
    }

    return this.request('POST', url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  }

  // 访问码相关 API
  async validateAccessCode(accessCode: string): Promise<StandardResponse> {
    return this.post('/validate-access-code', { access_code: accessCode })
  }

  async getAccessCodeUsage(accessCode: string): Promise<StandardResponse> {
    return this.get(`/access-codes/${accessCode}/usage`)
  }

  // 文件上传相关 API
  async uploadExcelFile(file: File, accessCode: string): Promise<StandardResponse> {
    return this.uploadFile('/files/upload', file, { access_code: accessCode })
  }

  // 图表生成相关 API
  async generatePreviews(filePath: string, chartTypes: string[]): Promise<StandardResponse> {
    return this.post('/generate-previews', {
      file_path: filePath,
      chart_types: chartTypes,
      width: 400,
      height: 300
    })
  }

  async generateSelectedCharts(
    filePath: string, 
    selectedChartTypes: string[], 
    accessCode: string
  ): Promise<StandardResponse> {
    return this.post('/generate-selected-charts', {
      file_path: filePath,
      selected_chart_types: selectedChartTypes,
      access_code: accessCode,
      width: 800,
      height: 600,
      format: 'png'
    })
  }

  async generateChartFromData(
    chartData: any, 
    chartType: string, 
    accessCode: string
  ): Promise<StandardResponse> {
    return this.post('/generate-chart-from-data', {
      chart_data: chartData,
      chart_type: chartType,
      access_code: accessCode
    })
  }

  // 图表类型相关 API
  async getChartTypes(): Promise<StandardResponse> {
    return this.get('/chart-types')
  }

  async getChartSuggestions(filePath: string): Promise<StandardResponse> {
    return this.post('/chart-suggestions', { file_path: filePath })
  }

  // 系统健康检查
  async healthCheck(): Promise<StandardResponse> {
    return this.get('/health')
  }

  // 获取系统信息
  async getSystemInfo(): Promise<StandardResponse> {
    return this.get('/system/info')
  }
}

// 创建默认 API 客户端实例
export const apiClientInstance = new ApiClient()

// 便捷的 API 调用函数
export const api = {
  validateAccessCode: (accessCode: string) => apiClientInstance.validateAccessCode(accessCode),
  uploadExcelFile: (file: File, accessCode: string) => apiClientInstance.uploadExcelFile(file, accessCode),
  generatePreviews: (filePath: string, chartTypes: string[]) => apiClientInstance.generatePreviews(filePath, chartTypes),
  generateSelectedCharts: (filePath: string, selectedChartTypes: string[], accessCode: string) => 
    apiClientInstance.generateSelectedCharts(filePath, selectedChartTypes, accessCode),
  generateChartFromData: (chartData: any, chartType: string, accessCode: string) => 
    apiClientInstance.generateChartFromData(chartData, chartType, accessCode),
  getChartTypes: () => apiClientInstance.getChartTypes(),
  getChartSuggestions: (filePath: string) => apiClientInstance.getChartSuggestions(filePath),
  healthCheck: () => apiClientInstance.healthCheck(),
  getSystemInfo: () => apiClientInstance.getSystemInfo(),
}

export default apiClientInstance