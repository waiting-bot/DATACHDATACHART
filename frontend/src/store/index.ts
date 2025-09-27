import { create } from 'zustand'

// 工作流步骤枚举
export enum WorkflowStep {
  ACCESS_CODE = 'access_code',
  FILE_UPLOAD = 'file_upload', 
  CHART_GENERATION = 'chart_generation',
  CHART_DISPLAY = 'chart_display'
}

// 应用状态接口
interface AppState {
  // 工作流状态
  currentStep: WorkflowStep
  workflowHistory: WorkflowStep[]
  
  // 访问码状态
  accessCode: string
  isAccessCodeValid: boolean
  remainingUsage: number | null
  maxUsage: number | null
  
  // 文件状态
  uploadedFile: File | null
  uploadedFilePath: string | null
  fileInfo: {
    name: string
    size: number
    type: string
  } | null
  
  // 图表状态
  chartPreviews: any[]
  selectedChartTypes: string[]
  generatedCharts: any[]
  currentChart: any | null
  
  // 加载和错误状态
  isLoading: boolean
  loadingMessage: string
  error: string | null
  errorCode: string | null
  
  // 操作
  setStep: (step: WorkflowStep) => void
  nextStep: () => void
  previousStep: () => void
  
  setAccessCode: (code: string) => void
  validateAccessCode: (code: string) => Promise<boolean>
  
  setUploadedFile: (file: File | null, filePath?: string) => void
  clearUploadedFile: () => void
  
  setChartPreviews: (previews: any[]) => void
  setSelectedChartTypes: (types: string[]) => void
  setGeneratedCharts: (charts: any[]) => void
  setCurrentChart: (chart: any | null) => void
  
  setLoading: (loading: boolean, message?: string) => void
  setError: (error: string, code?: string) => void
  clearError: () => void
  
  reset: () => void
}

const initialState = {
  currentStep: WorkflowStep.ACCESS_CODE,
  workflowHistory: [WorkflowStep.ACCESS_CODE],
  
  accessCode: '',
  isAccessCodeValid: false,
  remainingUsage: null,
  maxUsage: null,
  
  uploadedFile: null,
  uploadedFilePath: null,
  fileInfo: null,
  
  chartPreviews: [],
  selectedChartTypes: [],
  generatedCharts: [],
  currentChart: null,
  
  isLoading: false,
  loadingMessage: '',
  error: null,
  errorCode: null,
}

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,
  
  // 工作流操作
  setStep: (step) => {
    const currentStep = get().currentStep
    if (currentStep !== step) {
      set((state) => ({
        currentStep: step,
        workflowHistory: [...state.workflowHistory.filter(s => s !== step), step]
      }))
    }
  },
  
  nextStep: () => {
    const steps = Object.values(WorkflowStep)
    const currentIndex = steps.indexOf(get().currentStep)
    if (currentIndex < steps.length - 1) {
      get().setStep(steps[currentIndex + 1])
    }
  },
  
  previousStep: () => {
    const history = get().workflowHistory
    if (history.length > 1) {
      const newHistory = history.slice(0, -1)
      const previousStep = newHistory[newHistory.length - 1]
      set({
        currentStep: previousStep,
        workflowHistory: newHistory
      })
    }
  },
  
  // 访问码操作
  setAccessCode: (code) => {
    set({ accessCode: code })
  },
  
  validateAccessCode: async (code) => {
    set({ isLoading: true, loadingMessage: '验证访问码...', error: null })
    
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiBaseUrl}/api/v1/access-codes/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_code: code }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error?.message || '访问码验证失败')
      }
      
      if (result.success && result.data) {
        set({
          isAccessCodeValid: true,
          remainingUsage: result.data.remaining_usage,
          maxUsage: result.data.max_usage,
          isLoading: false,
          error: null
        })
        return true
      } else {
        throw new Error('访问码验证失败')
      }
    } catch (error: any) {
      set({
        isAccessCodeValid: false,
        remainingUsage: null,
        maxUsage: null,
        isLoading: false,
        error: error.message || '网络请求失败',
        errorCode: 'ACCESS_CODE_VALIDATION_FAILED'
      })
      return false
    }
  },
  
  // 文件操作
  setUploadedFile: (file, filePath) => {
    if (file) {
      set({
        uploadedFile: file,
        uploadedFilePath: filePath || null,
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      })
    } else {
      set({
        uploadedFile: null,
        uploadedFilePath: null,
        fileInfo: null
      })
    }
  },
  
  clearUploadedFile: () => {
    set({
      uploadedFile: null,
      uploadedFilePath: null,
      fileInfo: null,
      chartPreviews: [],
      selectedChartTypes: [],
      generatedCharts: [],
      currentChart: null
    })
  },
  
  // 图表操作
  setChartPreviews: (previews) => {
    set({ chartPreviews: previews })
  },
  
  setSelectedChartTypes: (types) => {
    set({ selectedChartTypes: types })
  },
  
  setGeneratedCharts: (charts) => {
    set({ generatedCharts: charts })
    if (charts.length > 0 && !get().currentChart) {
      set({ currentChart: charts[0] })
    }
  },
  
  setCurrentChart: (chart) => {
    set({ currentChart: chart })
  },
  
  // 加载和错误状态
  setLoading: (loading, message = '') => {
    set({ 
      isLoading: loading, 
      loadingMessage: message,
      error: loading ? null : get().error // 开始加载时清除错误
    })
  },
  
  setError: (error, code) => {
    set({ 
      error, 
      errorCode: code,
      isLoading: false 
    })
  },
  
  clearError: () => {
    set({ error: null, errorCode: null })
  },
  
  // 重置状态
  reset: () => {
    set(initialState)
  }
}))