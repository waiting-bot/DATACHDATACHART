import { create } from 'zustand'

// 应用状态类型定义
interface AppState {
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
  generatedChart: string | null  // base64 encoded image
  chartType: string
  isGenerating: boolean
  generationError: string | null
  
  // UI状态
  isLoading: boolean
  error: string | null
  currentStep: 'access-code' | 'upload' | 'generate' | 'result'
  
  // 操作方法
  setAccessCode: (code: string) => void
  validateAccessCode: (isValid: boolean, remaining?: number, max?: number) => void
  setUploadedFile: (file: File | null) => void
  setUploading: (isUploading: boolean, progress?: number) => void
  setUploadError: (error: string | null) => void
  setGeneratedChart: (chart: string | null) => void
  setChartType: (type: string) => void
  setGenerating: (isGenerating: boolean) => void
  setGenerationError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setCurrentStep: (step: 'access-code' | 'upload' | 'generate' | 'result') => void
  reset: () => void
}

// 初始状态
const initialState = {
  accessCode: null,
  isValidAccessCode: null,
  remainingUses: null,
  maxUsage: null,
  uploadedFile: null,
  isUploading: false,
  uploadProgress: 0,
  uploadError: null,
  generatedChart: null,
  chartType: 'bar',
  isGenerating: false,
  generationError: null,
  isLoading: false,
  error: null,
  currentStep: 'access-code' as const,
}

// 创建状态store
export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,
  
  // 访问码操作
  setAccessCode: (code: string) => {
    set({ accessCode: code, error: null })
  },
  
  validateAccessCode: (isValid: boolean, remaining?: number, max?: number) => {
    set({ 
      isValidAccessCode: isValid,
      remainingUses: remaining ?? null,
      maxUsage: max ?? null,
      error: isValid ? null : '访问码无效'
    })
  },
  
  // 文件上传操作
  setUploadedFile: (file: File | null) => {
    set({ 
      uploadedFile: file, 
      uploadError: null,
      error: null 
    })
  },
  
  setUploading: (isUploading: boolean, progress = 0) => {
    set({ 
      isUploading, 
      uploadProgress: progress,
      uploadError: null 
    })
  },
  
  setUploadError: (error: string | null) => {
    set({ uploadError: error, isUploading: false })
  },
  
  // 图表生成操作
  setGeneratedChart: (chart: string | null) => {
    set({ 
      generatedChart: chart,
      generationError: null,
      currentStep: chart ? 'result' : 'generate'
    })
  },
  
  setChartType: (type: string) => {
    set({ chartType: type })
  },
  
  setGenerating: (isGenerating: boolean) => {
    set({ 
      isGenerating,
      generationError: null 
    })
  },
  
  setGenerationError: (error: string | null) => {
    set({ generationError: error, isGenerating: false })
  },
  
  // 通用状态操作
  setLoading: (isLoading: boolean) => {
    set({ isLoading })
  },
  
  setError: (error: string | null) => {
    set({ error, isLoading: false })
  },
  
  setCurrentStep: (step: 'access-code' | 'upload' | 'generate' | 'result') => {
    set({ currentStep: step })
  },
  
  // 重置状态
  reset: () => {
    set(initialState)
  },
}))

// 选择器 hooks
export const useAccessCodeState = () => {
  const store = useAppStore()
  return {
    accessCode: store.accessCode,
    isValidAccessCode: store.isValidAccessCode,
    remainingUses: store.remainingUses,
    maxUsage: store.maxUsage,
    setAccessCode: store.setAccessCode,
    validateAccessCode: store.validateAccessCode,
  }
}

export const useFileUploadState = () => {
  const store = useAppStore()
  return {
    uploadedFile: store.uploadedFile,
    isUploading: store.isUploading,
    uploadProgress: store.uploadProgress,
    uploadError: store.uploadError,
    setUploadedFile: store.setUploadedFile,
    setUploading: store.setLoading,
    setUploadError: store.setUploadError,
  }
}

export const useChartGenerationState = () => {
  const store = useAppStore()
  return {
    generatedChart: store.generatedChart,
    chartType: store.chartType,
    isGenerating: store.isGenerating,
    generationError: store.generationError,
    setGeneratedChart: store.setGeneratedChart,
    setChartType: store.setChartType,
    setGenerating: store.setGenerating,
    setGenerationError: store.setGenerationError,
  }
}

export const useUIState = () => {
  const store = useAppStore()
  return {
    isLoading: store.isLoading,
    error: store.error,
    currentStep: store.currentStep,
    setLoading: store.setLoading,
    setError: store.setError,
    setCurrentStep: store.setCurrentStep,
  }
}