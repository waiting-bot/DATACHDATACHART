import React, { useEffect, useCallback } from 'react'
import { useAppStore, WorkflowStep } from '@/store'
import Header from '@/components/Header'
import StatusBar from '@/components/StatusBar'
import WorkflowStepper from '@/components/WorkflowStepper'
import AccessCodeInput from '@/components/AccessCodeInput'
import FileUpload from '@/components/FileUpload'
import ChartTypeSelector from '@/components/ChartTypeSelector'
import ChartPreview from '@/components/ChartPreview'
import ChartDisplay from '@/components/ChartDisplay'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import { useApi } from '@/hooks/useApi'
import { pwaManager } from '@/utils/pwa'

// 工作流步骤配置
const workflowSteps = [
  {
    id: WorkflowStep.ACCESS_CODE,
    title: '访问码验证',
    description: '输入访问码验证身份',
    icon: '🔑'
  },
  {
    id: WorkflowStep.FILE_UPLOAD,
    title: '文件上传',
    description: '上传 Excel 数据文件',
    icon: '📁'
  },
  {
    id: WorkflowStep.CHART_GENERATION,
    title: '图表生成',
    description: '选择类型并生成图表',
    icon: '📊'
  },
  {
    id: WorkflowStep.CHART_DISPLAY,
    title: '图表展示',
    description: '查看和下载生成的图表',
    icon: '👁️'
  }
]

const App: React.FC = () => {
  const {
    currentStep,
    accessCode,
    isAccessCodeValid,
    remainingUsage,
    maxUsage,
    uploadedFile,
    uploadedFilePath,
    chartPreviews,
    selectedChartTypes,
    generatedCharts,
    isLoading,
    error,
    setStep,
    nextStep,
    previousStep,
    setAccessCode,
    validateAccessCode,
    setUploadedFile,
    setChartPreviews,
    setSelectedChartTypes,
    setGeneratedCharts,
    setLoading,
    setError,
    clearError
  } = useAppStore()

  const { execute: checkHealth } = useApi()

  // 初始化健康检查
  useEffect(() => {
    const initApp = async () => {
      try {
        await checkHealth(() => {
          console.log('Backend service is healthy')
        }, (error) => {
          console.warn('Backend health check failed:', error)
        })
      } catch (err) {
        console.warn('Health check error:', err)
      }
    }

    initApp()
  }, [checkHealth])

  // PWA 初始化
  useEffect(() => {
    // 开发阶段禁用 PWA 功能
    if (import.meta.env.DEV || !pwaManager) {
      console.log('PWA disabled in development mode')
      return
    }

    // 检查 PWA 状态
    const pwaStatus = pwaManager.getPWAStatus()
    console.log('PWA Status:', pwaStatus)

    // 监听网络状态变化
    const handleOnline = () => {
      console.log('Network connection restored')
      // 可以在这里添加网络恢复后的逻辑
    }

    const handleOffline = () => {
      console.log('Network connection lost')
      // 可以在这里添加离线状态处理
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      pwaManager.destroy()
    }
  }, [])

  // 处理访问码验证
  const handleAccessCodeValidated = useCallback(async (accessCodeInfo: any) => {
    if (accessCodeInfo.remaining_usage > 0) {
      setTimeout(() => {
        nextStep()
      }, 1000)
    } else {
      setError('访问码使用次数已用完', 'ACCESS_CODE_EXHAUSTED')
    }
  }, [nextStep, setError])

  // 处理文件上传成功
  const handleFileUploadSuccess = useCallback(async (response: any) => {
    if (response.success && response.file_info) {
      setUploadedFile(uploadedFile!, response.file_info.file_path)
      
      // 自动生成预览图
      setTimeout(() => {
        nextStep()
      }, 1000)
    }
  }, [uploadedFile, setUploadedFile, nextStep])

  // 处理预览图生成
  const handlePreviewGenerated = useCallback((previews: any[]) => {
    setChartPreviews(previews)
    
    // 如果预览图生成成功，自动推荐图表类型
    if (previews.length > 0) {
      const recommendedTypes = previews.slice(0, 3).map(p => p.chart_type)
      setSelectedChartTypes(recommendedTypes)
    }
  }, [setChartPreviews, setSelectedChartTypes])

  // 处理图表生成
  const handleChartGenerate = useCallback(async () => {
    if (!uploadedFilePath || selectedChartTypes.length === 0 || !accessCode) {
      setError('请确保已选择图表类型', 'VALIDATION_ERROR')
      return
    }

    setLoading(true, '正在生成图表...')

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiBaseUrl}/api/v1/generate-selected-charts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: uploadedFilePath,
          selected_chart_types: selectedChartTypes,
          access_code: accessCode,
          width: 800,
          height: 600,
          format: 'png'
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || '图表生成失败')
      }

      if (result.success && result.data?.charts) {
        setGeneratedCharts(result.data.charts)
        
        // 更新剩余使用次数
        if (result.data.remaining_usage !== undefined) {
          // 这里需要更新 store 中的 remainingUsage
        }
        
        clearError()
        nextStep()
      } else {
        throw new Error('图表生成失败')
      }
    } catch (err: any) {
      setError(err.message || '图表生成失败', 'CHART_GENERATION_FAILED')
    } finally {
      setLoading(false)
    }
  }, [uploadedFilePath, selectedChartTypes, accessCode, setLoading, setError, clearError, setGeneratedCharts, nextStep])

  // 处理图表下载
  const handleChartDownload = useCallback((chart: any) => {
    if (!accessCode || remainingUsage === 0) {
      setError('访问码无效或使用次数已用完', 'ACCESS_CODE_ERROR')
      return
    }

    // 下载逻辑由 ChartDisplay 组件处理
    console.log('Downloading chart:', chart.chart_name)
  }, [accessCode, remainingUsage, setError])

  // 获取当前步骤组件
  const renderCurrentStep = () => {
    switch (currentStep) {
      case WorkflowStep.ACCESS_CODE:
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in" 
               style={{ 
                 padding: '40px 20px',
                 animation: 'fade-in 0.5s ease-in-out'
               }}>
            <div className="w-full max-w-2xl mx-auto" style={{ maxWidth: '672px', margin: '0 auto' }}>
              {/* 欢迎标题 */}
              <div className="text-center mb-8" style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4" 
                    style={{ 
                      fontSize: 'clamp(2rem, 5vw, 3rem)', 
                      fontWeight: '700',
                      background: 'linear-gradient(135deg, #2563eb 0%, #9333ea 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      marginBottom: '16px'
                    }}>
                  智能图表生成工具
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto"
                   style={{ 
                     fontSize: '1.25rem', 
                     color: '#4b5563',
                     maxWidth: '672px', 
                     margin: '0 auto'
                   }}>
                  AI驱动的数据可视化平台，让您的数据讲述生动故事
                </p>
              </div>
              
              {/* 功能特点卡片 */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="card p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">多种图表</h3>
                  <p className="text-sm text-gray-600">支持柱状图、折线图、饼图等多种图表类型</p>
                </div>
                
                <div className="card p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">快速生成</h3>
                  <p className="text-sm text-gray-600">上传Excel文件，秒级生成高质量图表</p>
                </div>
                
                <div className="card p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎨</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">透明背景</h3>
                  <p className="text-sm text-gray-600">PNG/SVG格式，透明背景，便于设计使用</p>
                </div>
              </div>
              
              {/* 访问码输入 */}
              <div className="glass rounded-2xl p-8 backdrop-blur-sm">
                <AccessCodeInput
                  value={accessCode}
                  onChange={setAccessCode}
                  onValidate={(isValid) => {
                    if (isValid) {
                      validateAccessCode(accessCode)
                    }
                  }}
                  onValidated={handleAccessCodeValidated}
                  loading={isLoading && loadingMessage.includes('验证')}
                  error={error}
                />
              </div>
            </div>
          </div>
        )

      case WorkflowStep.FILE_UPLOAD:
        return (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">上传数据文件</h2>
              <p className="text-gray-600">
                上传您的 Excel 文件，我们将自动解析并生成相应的图表
              </p>
            </div>
            <FileUpload
              onFileSelect={(file) => {
                setUploadedFile(file)
              }}
              onUploadSuccess={handleFileUploadSuccess}
              onUploadError={(error) => {
                setError(error, 'FILE_UPLOAD_ERROR')
              }}
              accessCode={accessCode}
              disabled={!isAccessCodeValid || isLoading}
            />
            {uploadedFile && (
              <div className="mt-6 text-center">
                <button
                  onClick={nextStep}
                  disabled={!isAccessCodeValid || isLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  继续生成图表
                </button>
              </div>
            )}
          </div>
        )

      case WorkflowStep.CHART_GENERATION:
        return (
          <div className="space-y-8">
            {/* 文件信息 */}
            {uploadedFile && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">已上传文件</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>文件名: {uploadedFile.name}</span>
                  <span>大小: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
            )}

            {/* 图表类型选择 */}
            <ChartTypeSelector
              selectedTypes={selectedChartTypes}
              onSelectionChange={setSelectedChartTypes}
              multiSelect={true}
              disabled={isLoading}
              showPreviews={false}
            />

            {/* 预览图生成 */}
            <ChartPreview
              filePath={uploadedFilePath || undefined}
              accessCode={accessCode}
              chartTypes={selectedChartTypes}
              onPreviewGenerated={handlePreviewGenerated}
              onPreviewError={(error) => {
                setError(error, 'PREVIEW_GENERATION_FAILED')
              }}
              autoGenerate={selectedChartTypes.length > 0}
            />

            {/* 生成按钮 */}
            <div className="flex justify-center">
              <button
                onClick={handleChartGenerate}
                disabled={selectedChartTypes.length === 0 || !isAccessCodeValid || isLoading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    生成中...
                  </>
                ) : (
                  <>
                    生成选定图表
                  </>
                )}
              </button>
            </div>
          </div>
        )

      case WorkflowStep.CHART_DISPLAY:
        return (
          <div className="space-y-6">
            <ChartDisplay
              charts={generatedCharts}
              accessCode={accessCode}
              onDownload={handleChartDownload}
              remainingUsage={remainingUsage}
            />
            
            {uploadedFilePath && (
              <div className="text-center">
                <button
                  onClick={() => {
                    setSelectedChartTypes([])
                    setStep(WorkflowStep.CHART_GENERATION)
                  }}
                  disabled={!isAccessCodeValid || isLoading}
                  className="px-6 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                >
                  重新生成图表
                </button>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const loadingMessage = isLoading ? '加载中...' : ''

  return (
    <div className="min-h-screen gradient-bg flex flex-col viewport-fix no-double-tap-zoom text-mobile" 
         style={{ 
           background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #f3e8ff 100%)',
           minHeight: '100vh',
           display: 'flex',
           flexDirection: 'column'
         }}>
      {/* 头部 */}
      <Header 
        title="智能图表生成工具"
        onLogoClick={() => {
          // 重置到第一步
          setStep(WorkflowStep.ACCESS_CODE)
        }}
      />

      {/* 状态栏 */}
      <StatusBar
        remainingUsage={remainingUsage}
        maxUsage={maxUsage}
        isAccessCodeValid={isAccessCodeValid}
        currentStep={currentStep}
      />

      {/* 主要内容 */}
      <main className="flex-1">
        {/* 工作流步骤指示器 */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <WorkflowStepper
              currentStep={currentStep}
              steps={workflowSteps}
              onStepClick={(step) => {
                // 只允许导航到已完成的步骤或下一步
                const currentIndex = workflowSteps.findIndex(s => s.id === currentStep)
                const targetIndex = workflowSteps.findIndex(s => s.id === step)
                if (targetIndex <= currentIndex + 1) {
                  setStep(step)
                }
              }}
            />
          </div>
        </div>

        {/* 内容区域 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-slide-up">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-red-800 font-medium">操作失败</h4>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
                <button
                  onClick={clearError}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  关闭
                </button>
              </div>
            </div>
          )}

          {/* 加载状态 */}
          {isLoading && (
            <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-xl animate-fade-in">
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-blue-800 font-medium">{loadingMessage}</span>
              </div>
            </div>
          )}

          {/* 当前步骤内容 */}
          <div className="transition-all duration-300 ease-in-out animate-fade-in">
            {renderCurrentStep()}
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* 品牌信息 */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <span className="text-white text-lg font-bold">📊</span>
                </div>
                <span className="text-xl font-bold text-gray-900">DataChart</span>
              </div>
              <p className="text-gray-600 mb-4">
                AI驱动的智能图表生成工具，让数据可视化变得简单高效。
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>支持Excel文件</span>
                <span>•</span>
                <span>透明背景</span>
                <span>•</span>
                <span>快速生成</span>
              </div>
            </div>
            
            {/* 产品链接 */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">产品功能</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors">图表类型</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">文件格式</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">使用教程</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">常见问题</a></li>
              </ul>
            </div>
            
            {/* 支持链接 */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">支持服务</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors">隐私政策</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">服务条款</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">联系我们</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">反馈建议</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-gray-500">
                &copy; 2024 DataChart. 保留所有权利.
              </p>
              <div className="flex items-center gap-6 mt-4 md:mt-0">
                <span className="text-sm text-gray-500">技术支持：AI + Python + React</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600">系统正常</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* PWA 安装提示 */}
      <PWAInstallPrompt />
    </div>
  )
}

export default App