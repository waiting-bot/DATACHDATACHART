import { useState, useCallback } from 'react'
import { api } from '@/utils/api'
import type { StandardResponse } from '@/utils/api'

// API 响应状态类型
interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  errorCode: string | null
}

// 通用的 API 调用 Hook
export function useApi<T = any>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
    errorCode: null,
  })

  const execute = useCallback(async (
    apiCall: () => Promise<StandardResponse<T>>,
    onSuccess?: (data: T) => void,
    onError?: (error: string, code?: string) => void
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null, errorCode: null }))

    try {
      const response = await apiCall()
      
      if (response.success && response.data !== undefined) {
        setState({
          data: response.data,
          loading: false,
          error: null,
          errorCode: null,
        })
        onSuccess?.(response.data)
      } else {
        const error = response.error?.message || '请求失败'
        const code = response.error?.code || 'API_ERROR'
        setState({
          data: null,
          loading: false,
          error,
          errorCode: code,
        })
        onError?.(error, code)
      }
    } catch (error: any) {
      const errorMessage = error.message || '网络请求失败'
      const errorCode = error.code || 'NETWORK_ERROR'
      setState({
        data: null,
        loading: false,
        error: errorMessage,
        errorCode,
      })
      onError?.(errorMessage, errorCode)
    }
  }, [])

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      errorCode: null,
    })
  }, [])

  return {
    ...state,
    execute,
    reset,
  }
}

// 访问码验证 Hook
export function useAccessCodeValidation() {
  const { execute, loading, error, errorCode } = useApi<boolean>()

  const validateAccessCode = useCallback(
    (accessCode: string, onSuccess?: () => void, onError?: (error: string) => void) => {
      execute(
        () => api.validateAccessCode(accessCode),
        (isValid) => {
          if (isValid) {
            onSuccess?.()
          } else {
            onError?.('访问码验证失败')
          }
        },
        onError
      )
    },
    [execute]
  )

  return {
    validateAccessCode,
    loading,
    error,
    errorCode,
  }
}

// 文件上传 Hook
export function useFileUpload() {
  const { execute, loading, error, errorCode, data } = useApi<any>()

  const uploadFile = useCallback(
    (file: File, accessCode: string, onSuccess?: (response: any) => void, onError?: (error: string) => void) => {
      execute(
        () => api.uploadExcelFile(file, accessCode),
        onSuccess,
        onError
      )
    },
    [execute]
  )

  return {
    uploadFile,
    loading,
    error,
    errorCode,
    data,
  }
}

// 预览图生成 Hook
export function usePreviewGeneration() {
  const { execute, loading, error, errorCode, data } = useApi<any[]>()

  const generatePreviews = useCallback(
    (filePath: string, chartTypes: string[], onSuccess?: (previews: any[]) => void, onError?: (error: string) => void) => {
      execute(
        () => api.generatePreviews(filePath, chartTypes),
        (response) => {
          const previews = response.data?.previews || []
          onSuccess?.(previews)
        },
        onError
      )
    },
    [execute]
  )

  return {
    generatePreviews,
    loading,
    error,
    errorCode,
    data,
  }
}

// 选中图表生成 Hook
export function useChartGeneration() {
  const { execute, loading, error, errorCode, data } = useApi<any[]>()

  const generateCharts = useCallback(
    (filePath: string, selectedChartTypes: string[], accessCode: string, onSuccess?: (charts: any[]) => void, onError?: (error: string) => void) => {
      execute(
        () => api.generateSelectedCharts(filePath, selectedChartTypes, accessCode),
        (response) => {
          const charts = response.data?.charts || []
          onSuccess?.(charts)
        },
        onError
      )
    },
    [execute]
  )

  return {
    generateCharts,
    loading,
    error,
    errorCode,
    data,
  }
}

// 图表类型获取 Hook
export function useChartTypes() {
  const { execute, loading, error, data } = useApi<any[]>()

  const fetchChartTypes = useCallback(
    (onSuccess?: (types: any[]) => void, onError?: (error: string) => void) => {
      execute(
        () => api.getChartTypes(),
        (response) => {
          const types = response.data?.chart_types || []
          onSuccess?.(types)
        },
        onError
      )
    },
    [execute]
  )

  return {
    fetchChartTypes,
    loading,
    error,
    data,
  }
}

// 图表建议获取 Hook
export function useChartSuggestions() {
  const { execute, loading, error, data } = useApi<any[]>()

  const fetchSuggestions = useCallback(
    (filePath: string, onSuccess?: (suggestions: string[]) => void, onError?: (error: string) => void) => {
      execute(
        () => api.getChartSuggestions(filePath),
        (response) => {
          const suggestions = response.data?.suggested_charts || []
          onSuccess?.(suggestions)
        },
        onError
      )
    },
    [execute]
  )

  return {
    fetchSuggestions,
    loading,
    error,
    data,
  }
}

// 系统健康检查 Hook
export function useHealthCheck() {
  const { execute, loading, error, data } = useApi<any>()

  const checkHealth = useCallback(
    (onSuccess?: (health: any) => void, onError?: (error: string) => void) => {
      execute(
        () => api.healthCheck(),
        onSuccess,
        onError
      )
    },
    [execute]
  )

  return {
    checkHealth,
    loading,
    error,
    data,
  }
}

// 防抖 Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useState(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  })

  return debouncedValue
}

// 本地存储 Hook
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, storedValue])

  return [storedValue, setValue] as const
}