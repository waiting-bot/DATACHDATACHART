import React, { useEffect, useCallback, useState } from 'react'
import { useAppStore, WorkflowStep } from '@/store'
import Header from '@/components/Header'
import StatusBar from '@/components/StatusBar'
import WorkflowStepper from '@/components/WorkflowStepper'
import FileUpload from '@/components/FileUpload'
import ChartTypeSelector from '@/components/ChartTypeSelector'
import ChartDisplay from '@/components/ChartDisplay'
import { useApi } from '@/hooks/useApi'
import { Key, CheckCircle, AlertCircle, Shield } from 'lucide-react'

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
    selectedChartTypes,
    generatedCharts,
    isLoading,
    error,
    setStep,
    nextStep,
    setAccessCode,
    validateAccessCode,
    setUploadedFile,
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
        await checkHealth(
          () => Promise.resolve({ success: true, data: {} }),
          (error) => {
          console.warn('Backend health check failed:', error)
        })
      } catch (err) {
        console.warn('Health check error:', err)
      }
    }

    initApp()
  }, [checkHealth])

    // PWA 初始化 - 已禁用
    useEffect(() => {
      // 开发阶段禁用 PWA 功能
      if (import.meta.env.DEV) {
        console.log('PWA disabled in development mode')
        return
      }

      // PWA功能已禁用
      console.log('PWA features disabled for MVP')
    }, [])

  // 处理文件上传成功
  const handleFileUploadSuccess = useCallback(async (response: any) => {
    if (response.success && response.data && response.data.file_info) {
      setLoading(true, '文件上传成功，正在解析数据...')
      setUploadedFile(uploadedFile, response.data.file_info.file_path)
      
      // 短暂延迟让用户看到成功状态
      setTimeout(() => {
        setLoading(false)
        nextStep()
      }, 1500)
    }
  }, [uploadedFile, setUploadedFile, nextStep, setLoading])

  // 预览图功能已简化

  // 处理图表生成
  const handleChartGenerate = useCallback(async () => {
    console.log('生成图表检查:', {
      uploadedFilePath: !!uploadedFilePath,
      selectedChartTypes: selectedChartTypes,
      selectedChartTypesLength: selectedChartTypes.length,
      accessCode: !!accessCode
    })
    
    if (!uploadedFilePath) {
      setError('请先上传文件', 'NO_FILE_UPLOADED')
      return
    }
    
    if (selectedChartTypes.length === 0) {
      setError('请选择至少一种图表类型', 'NO_CHART_TYPES_SELECTED')
      return
    }
    
    if (!accessCode) {
      setError('请先验证访问码', 'NO_ACCESS_CODE')
      return
    }

    setLoading(true, '正在生成图表，请稍候...')

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiBaseUrl}/api/v1/charts/previews/selected-generate`, {
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
        setLoading(false)
        // 显示成功状态后再跳转
        setTimeout(() => {
          nextStep()
        }, 1000)
      } else {
        throw new Error('图表生成失败')
      }
    } catch (err: any) {
      console.error('Chart generation error:', err)
      setError(err.message || '图表生成失败', 'CHART_GENERATION_FAILED')
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

  // 网络状态检测
  const [isOnline, setIsOnline] = useState(true)
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      clearError()
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setError('网络连接已断开，请检查网络设置', 'NETWORK_OFFLINE')
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // 初始状态检查
    setIsOnline(navigator.onLine)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [clearError, setError])

  // 简化的初始化 - 移除不必要的功能

  // 获取图表显示名称
  const getChartDisplayName = useCallback((type: string) => {
    const names: Record<string, string> = {
      'bar': '柱状图',
      'line': '折线图', 
      'pie': '饼图',
      'scatter': '散点图',
      'area': '面积图',
      'heatmap': '热力图',
      'box': '箱线图',
      'violin': '小提琴图',
      'histogram': '直方图'
    }
    return names[type] || type
  }, [])

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
              
                          {/* 主要内容区域 - 简化布局 */}
              <div className="max-w-md mx-auto">
                {/* 核心价值主张 */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full mb-6">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">AI驱动的智能图表生成</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <span className="text-xl">📊</span>
                      </div>
                      <p className="text-xs text-gray-600">多种图表</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <span className="text-xl">⚡</span>
                      </div>
                      <p className="text-xs text-gray-600">快速生成</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <span className="text-xl">🎨</span>
                      </div>
                      <p className="text-xs text-gray-600">透明背景</p>
                    </div>
                  </div>
                </div>
                
                {/* 访问码输入 */}
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Shield className="w-6 h-6 text-blue-600" />
                      <h2 className="text-lg font-bold text-gray-900">访问码验证</h2>
                    </div>
                    <p className="text-gray-500 text-sm">
                      请输入您购买的访问码以开始使用
                    </p>
                  </div>
                  
                  {/* 访问码输入框 */}
                  <div className="relative mb-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        placeholder="请输入访问码"
                        disabled={isLoading && loadingMessage.includes('验证')}
                        className={`
                          w-full pl-10 pr-10 py-3 border-2 rounded-lg transition-all duration-200
                          focus:outline-none focus:ring-2 focus:ring-offset-1
                          ${error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : accessCode.length >= 6
                            ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                          }
                          ${isLoading && loadingMessage.includes('验证') ? 'opacity-60 bg-gray-50' : 'bg-white'}
                        `}
                      />
                      
                      {/* 验证状态图标 */}
                      {accessCode && !(isLoading && loadingMessage.includes('验证')) && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          {accessCode.length >= 6 && !error ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* 验证消息 */}
                    {error && (
                      <div className="mt-2 text-sm text-red-600">
                        {error}
                      </div>
                    )}
                  </div>

                  {/* 验证按钮 */}
                  <button
                    onClick={() => {
                      if (accessCode.trim() && accessCode.length >= 6) {
                        validateAccessCode(accessCode)
                      }
                    }}
                    disabled={accessCode.length < 6 || (isLoading && loadingMessage.includes('验证'))}
                    className={`
                      w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
                      flex items-center justify-center gap-2
                      ${accessCode.length < 6 || (isLoading && loadingMessage.includes('验证'))
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl'
                      }
                    `}
                  >
                    {isLoading && loadingMessage.includes('验证') ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        验证中...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        验证访问码
                      </>
                    )}
                  </button>

                  {/* 使用提示 */}
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center gap-2 text-xs text-gray-400">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                      <span>访问码在小红书店铺购买获得</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case WorkflowStep.FILE_UPLOAD:
        return (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">上传数据文件</h2>
              <p className="text-gray-600">
                上传您的 Excel 文件，我们将自动解析并生成相应的图表
              </p>
            </div>
            
            <div className="glass rounded-2xl p-8 backdrop-blur-sm border border-white/20">
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
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-green-100 text-green-700 rounded-full">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">文件上传成功！</span>
                  </div>
                  
                  <button
                    onClick={nextStep}
                    disabled={!isAccessCodeValid || isLoading}
                    className="mt-4 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    继续生成图表
                  </button>
                </div>
              )}
            </div>
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
              onSelectionChange={(types) => {
                console.log('图表类型选择变更:', types)
                setSelectedChartTypes(types)
              }}
              multiSelect={true}
              disabled={false}
              loading={isLoading}
              showPreviews={false}
            />

            {/* 图表生成信息 */}
            <div className="bg-blue-50 rounded-lg p-6 text-center border border-blue-200">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm">📊</span>
                </div>
                <h3 className="text-lg font-medium text-blue-900">准备生成图表</h3>
              </div>
              <p className="text-blue-700 text-sm mb-4">
                已选择 {selectedChartTypes.length} 种图表类型，确认后开始生成高质量图表
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {selectedChartTypes.map((type) => (
                  <span key={type} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                    {getChartDisplayName(type)}
                  </span>
                ))}
              </div>
            </div>

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
              remainingUsage={remainingUsage || undefined}
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
  const errorCode = null // 这里可以从 store 中获取

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
        extraActions={null}
      />

      {/* 状态栏 */}
      <StatusBar
        remainingUsage={remainingUsage || 0}
        maxUsage={maxUsage || 0}
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
                // 增强的导航逻辑 - 只允许导航到已完成的步骤或下一步
                const targetIndex = workflowSteps.findIndex(s => s.id === step)
                
                // 检查前置条件
                if (targetIndex === 0) { // 访问码步骤
                  setStep(step)
                } else if (targetIndex === 1) { // 文件上传步骤
                  if (isAccessCodeValid) {
                    setStep(step)
                  } else {
                    setError('请先验证访问码', 'INVALID_ACCESS_CODE')
                  }
                } else if (targetIndex === 2) { // 图表生成步骤
                  if (isAccessCodeValid && uploadedFile) {
                    setStep(step)
                  } else if (!isAccessCodeValid) {
                    setError('请先验证访问码', 'INVALID_ACCESS_CODE')
                  } else if (!uploadedFile) {
                    setError('请先上传文件', 'NO_FILE_UPLOADED')
                  }
                } else if (targetIndex === 3) { // 图表显示步骤
                  if (isAccessCodeValid && uploadedFile && generatedCharts.length > 0) {
                    setStep(step)
                  } else if (!isAccessCodeValid) {
                    setError('请先验证访问码', 'INVALID_ACCESS_CODE')
                  } else if (!uploadedFile) {
                    setError('请先上传文件', 'NO_FILE_UPLOADED')
                  } else if (generatedCharts.length === 0) {
                    setError('请先生成图表', 'NO_CHARTS_GENERATED')
                  }
                }
              }}
            />
          </div>
        </div>

        {/* 内容区域 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 网络状态提示 */}
          {!isOnline && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl animate-slide-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600">📡</span>
                  </div>
                  <div>
                    <h4 className="text-yellow-800 font-medium">网络连接已断开</h4>
                    <p className="text-yellow-700 text-sm mt-1">请检查您的网络连接后重试</p>
                  </div>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="text-yellow-600 hover:text-yellow-800 text-sm font-medium px-3 py-1 border border-yellow-300 rounded hover:bg-yellow-100"
                >
                  刷新页面
                </button>
              </div>
            </div>
          )}

          {/* 错误提示 - 增强版 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600">⚠️</span>
                  </div>
                  <div>
                    <h4 className="text-red-800 font-medium">操作失败</h4>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                    
                    {/* 根据错误类型提供解决方案 */}
                    {errorCode === 'ACCESS_CODE_EXHAUSTED' && (
                      <div className="mt-3 p-3 bg-red-100 rounded-lg">
                        <p className="text-red-800 text-sm font-medium mb-2">解决方案：</p>
                        <ul className="text-red-700 text-sm space-y-1">
                          <li>• 购买新的访问码</li>
                          <li>• 联系客服获取帮助</li>
                        </ul>
                      </div>
                    )}
                    
                    {errorCode === 'NETWORK_ERROR' && (
                      <div className="mt-3 p-3 bg-red-100 rounded-lg">
                        <p className="text-red-800 text-sm font-medium mb-2">网络问题：</p>
                        <ul className="text-red-700 text-sm space-y-1">
                          <li>• 检查网络连接</li>
                          <li>• 稍后重试</li>
                          <li>• 刷新页面</li>
                        </ul>
                      </div>
                    )}
                    
                    {errorCode === 'FILE_UPLOAD_ERROR' && (
                      <div className="mt-3 p-3 bg-red-100 rounded-lg">
                        <p className="text-red-800 text-sm font-medium mb-2">文件问题：</p>
                        <ul className="text-red-700 text-sm space-y-1">
                          <li>• 确保文件格式为 .xlsx 或 .xls</li>
                          <li>• 文件大小不超过 10MB</li>
                          <li>• 文件未损坏</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={clearError}
                  className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 border border-red-300 rounded hover:bg-red-100 flex-shrink-0"
                >
                  关闭
                </button>
              </div>
            </div>
          )}

          {/* 加载状态 - 增强版 */}
          {isLoading && (
            <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-xl animate-fade-in">
              <div className="flex items-center justify-center gap-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <div className="absolute inset-0 rounded-full h-8 w-8 border-t-2 border-blue-300 animate-pulse"></div>
                </div>
                <div className="text-center">
                  <p className="text-blue-800 font-medium">{loadingMessage}</p>
                  {loadingMessage.includes('生成') && (
                    <p className="text-blue-600 text-sm mt-1">这可能需要几秒钟时间</p>
                  )}
                </div>
              </div>
              
              {/* 进度条动画 */}
              <div className="mt-4 w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full animate-progress"></div>
              </div>
            </div>
          )}

          {/* 当前步骤内容 */}
          <div className="transition-all duration-300 ease-in-out animate-fade-in">
            {renderCurrentStep()}
          </div>
        </div>
      </main>

      {/* 简化页脚 */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <span className="text-white text-sm font-bold">📊</span>
              </div>
              <span className="text-lg font-bold text-gray-900">DataChart</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>AI智能图表生成</span>
              <span>•</span>
              <span>透明背景</span>
              <span>•</span>
              <span>快速生成</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600">系统正常</span>
            </div>
          </div>
          <div className="text-center mt-4">
            <p className="text-xs text-gray-400">
              &copy; 2024 DataChart. 保留所有权利.
            </p>
          </div>
        </div>
      </footer>

      {/* PWA 安装提示 - 简化版 */}
      {/* 用户指南功能已移除以简化界面 */}
    </div>
  )
}

export default App