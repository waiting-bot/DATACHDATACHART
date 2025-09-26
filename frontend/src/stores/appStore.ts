import { create } from 'zustand'
import type { 
  WorkflowStep, 
  ChartType, 
  GeneratedChart, 
  PreviewChart 
} from '@/types'

// 应用状态类型定义
interface AppState {
  // 访问码状态
  accessCode: string | null
  isAccessCodeValid: boolean | null
  remainingUsage: number | null
  maxUsage: number | null
  
  // 文件上传状态
  uploadedFile: File | null
  uploadedFilePath: string | null
  isUploading: boolean
  uploadProgress: number
  uploadError: string | null
  
  // 图表生成状态
  chartPreviews: PreviewChart[]
  selectedChartTypes: ChartType[]
  generatedCharts: GeneratedChart[]
  isGenerating: boolean
  generationError: string | null
  
  // UI状态
  isLoading: boolean
  loadingMessage: string
  error: string | null
  errorCode: string | null
  currentStep: WorkflowStep
  
  // 操作方法
  setAccessCode: (code: string) => void
  validateAccessCode: (isValid: boolean, remaining?: number, max?: number) => void
  setUploadedFile: (file: File | null, filePath?: string | null) => void
  setUploading: (isUploading: boolean, progress?: number) => void
  setUploadError: (error: string | null) => void
  setChartPreviews: (previews: PreviewChart[]) => void
  setSelectedChartTypes: (types: ChartType[]) => void
  setGeneratedCharts: (charts: GeneratedChart[]) => void
  setGenerating: (isGenerating: boolean) => void
  setGenerationError: (error: string | null) => void
  setLoading: (loading: boolean, message?: string) => void
  setError: (error: string | null, code?: string) => void
  setStep: (step: WorkflowStep) => void
  nextStep: () => void
  previousStep: () => void
  clearError: () => void
  reset: () => void
}

// 初始状态
const initialState = {
  accessCode: null,
  isAccessCodeValid: null,
  remainingUsage: null,
  maxUsage: null,
  uploadedFile: null,
  uploadedFilePath: null,
  isUploading: false,
  uploadProgress: 0,
  uploadError: null,
  chartPreviews: [],
  selectedChartTypes: [],
  generatedCharts: [],
  isGenerating: false,
  generationError: null,
  isLoading: false,
  loadingMessage: '',
  error: null,
  errorCode: null,
  currentStep: WorkflowStep.ACCESS_CODE,
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
      isAccessCodeValid: isValid,
      remainingUsage: remaining ?? null,
      maxUsage: max ?? null,
      error: isValid ? null : '访问码无效',
      errorCode: isValid ? null : 'INVALID_ACCESS_CODE'
    })
  },
  
  // 文件上传操作
  setUploadedFile: (file: File | null, filePath: string | null = null) => {
    set({ 
      uploadedFile: file, 
      uploadedFilePath: filePath,
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
  
  // 图表相关操作
  setChartPreviews: (previews: PreviewChart[]) => {
    set({ chartPreviews: previews })
  },
  
  setSelectedChartTypes: (types: ChartType[]) => {
    set({ selectedChartTypes: types })
  },
  
  setGeneratedCharts: (charts: GeneratedChart[]) => {
    set({ 
      generatedCharts: charts,
      generationError: null
    })
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
  
  // 工作流步骤操作
  setStep: (step: WorkflowStep) => {
    set({ currentStep: step })
  },
  
  nextStep: () => {
    const { currentStep } = get()
    const steps = [
      WorkflowStep.ACCESS_CODE,
      WorkflowStep.FILE_UPLOAD,
      WorkflowStep.CHART_GENERATION,
      WorkflowStep.CHART_DISPLAY
    ]
    
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      set({ currentStep: steps[currentIndex + 1] })
    }
  },
  
  previousStep: () => {
    const { currentStep } = get()
    const steps = [
      WorkflowStep.ACCESS_CODE,
      WorkflowStep.FILE_UPLOAD,
      WorkflowStep.CHART_GENERATION,
      WorkflowStep.CHART_DISPLAY
    ]
    
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      set({ currentStep: steps[currentIndex - 1] })
    }
  },
  
  // 通用状态操作
  setLoading: (isLoading: boolean, message: string = '') => {
    set({ 
      isLoading,
      loadingMessage: message || (isLoading ? '加载中...' : ''),
      error: isLoading ? null : get().error
    })
  },
  
  setError: (error: string | null, code: string | null = null) => {
    set({ 
      error, 
      errorCode: code,
      isLoading: false 
    })
  },
  
  clearError: () => {
    set({ 
      error: null, 
      errorCode: null,
      isLoading: false 
    })
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
    isAccessCodeValid: store.isAccessCodeValid,
    remainingUsage: store.remainingUsage,
    maxUsage: store.maxUsage,
    setAccessCode: store.setAccessCode,
    validateAccessCode: store.validateAccessCode,
  }
}

export const useFileUploadState = () => {
  const store = useAppStore()
  return {
    uploadedFile: store.uploadedFile,
    uploadedFilePath: store.uploadedFilePath,
    isUploading: store.isUploading,
    uploadProgress: store.uploadProgress,
    uploadError: store.uploadError,
    setUploadedFile: store.setUploadedFile,
    setUploading: store.setUploading,
    setUploadError: store.setUploadError,
  }
}

export const useChartGenerationState = () => {
  const store = useAppStore()
  return {
    chartPreviews: store.chartPreviews,
    selectedChartTypes: store.selectedChartTypes,
    generatedCharts: store.generatedCharts,
    isGenerating: store.isGenerating,
    generationError: store.generationError,
    setChartPreviews: store.setChartPreviews,
    setSelectedChartTypes: store.setSelectedChartTypes,
    setGeneratedCharts: store.setGeneratedCharts,
    setGenerating: store.setGenerating,
    setGenerationError: store.setGenerationError,
  }
}

export const useUIState = () => {
  const store = useAppStore()
  return {
    isLoading: store.isLoading,
    loadingMessage: store.loadingMessage,
    error: store.error,
    errorCode: store.errorCode,
    currentStep: store.currentStep,
    setLoading: store.setLoading,
    setError: store.setError,
    clearError: store.clearError,
    setStep: store.setStep,
    nextStep: store.nextStep,
    previousStep: store.previousStep,
  }
}