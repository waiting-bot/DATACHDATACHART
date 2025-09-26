import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

// API响应类型定义
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 访问码验证响应
interface AccessCodeResponse {
  valid: boolean
  remaining_uses: number
  max_usage: number
  expires_at?: string
}

// 图表生成响应
interface ChartGenerationResponse {
  success: boolean
  chart?: {
    image: string
    format: 'png' | 'svg'
    chart_type: string
  }
  remaining_uses: number
  error?: string
}

// 图表类型响应
interface ChartTypesResponse {
  types: Array<{
    id: string
    name: string
    description: string
  }>
}

class ApiService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // 请求拦截器
    this.api.interceptors.request.use(
      (config) => {
        // 可以在这里添加认证token等
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      (error: AxiosError) => {
        if (error.response) {
          // 服务器响应错误
          console.error('API Error:', error.response.data)
        } else if (error.request) {
          // 请求已发送但无响应
          console.error('Network Error:', error.message)
        } else {
          // 请求配置错误
          console.error('Request Error:', error.message)
        }
        return Promise.reject(error)
      }
    )
  }

  // 访问码验证
  async validateAccessCode(accessCode: string): Promise<ApiResponse<AccessCodeResponse>> {
    try {
      const response = await this.api.post<ApiResponse<AccessCodeResponse>>(
        '/api/validate-access-code',
        { access_code: accessCode }
      )
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message
        throw new Error(errorMessage)
      }
      throw new Error('验证访问码时发生未知错误')
    }
  }

  // 生成图表
  async generateChart(
    accessCode: string,
    file: File,
    chartType: string = 'bar'
  ): Promise<ApiResponse<ChartGenerationResponse>> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('access_code', accessCode)
      formData.append('chart_type', chartType)

      const response = await this.api.post<ApiResponse<ChartGenerationResponse>>(
        '/api/generate-chart',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              // 触发进度事件
              window.dispatchEvent(
                new CustomEvent('upload-progress', { detail: progress })
              )
            }
          },
        }
      )
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message
        throw new Error(errorMessage)
      }
      throw new Error('生成图表时发生未知错误')
    }
  }

  // 获取支持的图表类型
  async getChartTypes(): Promise<ApiResponse<ChartTypesResponse>> {
    try {
      const response = await this.api.get<ApiResponse<ChartTypesResponse>>(
        '/api/chart-types'
      )
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message
        throw new Error(errorMessage)
      }
      throw new Error('获取图表类型时发生未知错误')
    }
  }

  // 检查服务状态
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    try {
      const response = await this.api.get<ApiResponse<{ status: string }>>(
        '/health'
      )
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message
        throw new Error(errorMessage)
      }
      throw new Error('检查服务状态时发生未知错误')
    }
  }

  // 通用的GET请求
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get<ApiResponse<T>>(url, config)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message
        throw new Error(errorMessage)
      }
      throw new Error('GET请求失败')
    }
  }

  // 通用的POST请求
  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.post<ApiResponse<T>>(url, data, config)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message
        throw new Error(errorMessage)
      }
      throw new Error('POST请求失败')
    }
  }

  // 通用的PUT请求
  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put<ApiResponse<T>>(url, data, config)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message
        throw new Error(errorMessage)
      }
      throw new Error('PUT请求失败')
    }
  }

  // 通用的DELETE请求
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.delete<ApiResponse<T>>(url, config)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message
        throw new Error(errorMessage)
      }
      throw new Error('DELETE请求失败')
    }
  }
}

// 创建API服务实例
export const apiService = new ApiService()

// 默认导出
export default apiService

// 类型导出
export type {
  ApiResponse,
  AccessCodeResponse,
  ChartGenerationResponse,
  ChartTypesResponse,
}