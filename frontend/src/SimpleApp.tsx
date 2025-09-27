import React, { useState, useEffect, useCallback } from 'react'

const SimpleApp: React.FC = () => {
  const [currentStep, setCurrentStep] = useState('access_code')
  const [accessCode, setAccessCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedFileInfo, setUploadedFileInfo] = useState<Record<string, unknown> | null>(null)
  // const [chartPreviews, setChartPreviews] = useState<any[]>([]) // 暂时未使用
  const [selectedChartTypes, setSelectedChartTypes] = useState<string[]>(['bar', 'line'])
  const [chartConfig, setChartConfig] = useState({
    title: '数据图表',
    colorScheme: 'business_blue_gray',
    resolution: '300dpi',
    showAxisLabels: true,
    outputFormat: 'png'
  })
  const [generatedCharts, setGeneratedCharts] = useState<Array<{id: string; type: string; title: string; url: string; format: string}>>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [imageZoom, setImageZoom] = useState<Record<string, number>>({})
  
  // 访问码验证状态管理
  const [accessCodeInfo, setAccessCodeInfo] = useState<{
    isValid: boolean
    remainingUsage?: number
    maxUsage?: number
    message?: string
  } | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // 检测移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 移动端手势支持
  useEffect(() => {
    if (!isMobile) return

    let touchStartX = 0
    let touchEndX = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX
    }

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX
      handleSwipe()
    }

    const handleSwipe = () => {
      const swipeThreshold = 50
      const diff = touchStartX - touchEndX

      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          // 向左滑动 - 下一步
          handleSwipeNext()
        } else {
          // 向右滑动 - 上一步
          handleSwipePrev()
        }
      }
    }

    const handleSwipeNext = () => {
      const steps = ['access_code', 'file_upload', 'chart_generation', 'chart_display']
      const currentIndex = steps.indexOf(currentStep)
      if (currentIndex < steps.length - 1) {
        // 验证是否可以进入下一步
        if (currentStep === 'access_code' && accessCode.length === 6) {
          handleValidateCode()
        } else if (currentStep === 'file_upload' && uploadedFileInfo) {
          setCurrentStep('chart_generation')
        } else if (currentStep === 'chart_generation' && selectedChartTypes.length > 0) {
          handleGenerateCharts()
        }
      }
    }

    const handleSwipePrev = () => {
      const steps = ['access_code', 'file_upload', 'chart_generation', 'chart_display']
      const currentIndex = steps.indexOf(currentStep)
      if (currentIndex > 0) {
        setCurrentStep(steps[currentIndex - 1])
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isMobile, currentStep, accessCode, uploadedFileInfo, selectedChartTypes])

  useEffect(() => {
    // 应用初始化
  }, [])

  // 实时访问码验证
  const validateAccessCode = useCallback(async (code: string) => {
    if (code.length !== 6) {
      setAccessCodeInfo(null)
      return
    }

    setIsValidating(true)
    try {
      const response = await fetch('http://localhost:8000/api/v1/access-codes/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_code: code }),
      })

      const result = await response.json()

      if (result.success) {
        setAccessCodeInfo({
          isValid: true,
          remainingUsage: result.data.remaining_usage,
          maxUsage: result.data.max_usage,
          message: '验证成功'
        })
      } else {
        setAccessCodeInfo({
          isValid: false,
          message: result.error?.message || '访问码无效'
        })
      }
    } catch (err) {
      setAccessCodeInfo({
        isValid: false,
        message: '网络错误，请检查连接'
      })
    } finally {
      setIsValidating(false)
    }
  }, [])

  // 防抖验证
  useEffect(() => {
    const timer = setTimeout(() => {
      if (accessCode.length === 6) {
        validateAccessCode(accessCode)
      } else {
        setAccessCodeInfo(null)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [accessCode, validateAccessCode])

  const handleValidateCode = useCallback(async () => {
    if (!accessCode.trim()) {
      setError('请输入访问码')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:8000/api/v1/access-codes/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_code: accessCode }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || '访问码验证失败')
      }

      if (result.success) {
        // 移动端震动反馈
        if (isMobile && 'vibrate' in navigator) {
          navigator.vibrate(50)
        }
        setCurrentStep('file_upload')
      } else {
        throw new Error('访问码验证失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络请求失败')
    } finally {
      setIsLoading(false)
    }
  }, [accessCode, isMobile])

  const uploadFile = useCallback((file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('access_code', accessCode)

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100)
        setUploadProgress(progress)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const result = JSON.parse(xhr.responseText)
        if (result.success) {
          setUploadedFileInfo(result.data.file_info)
          setError('')
          
          // 移动端成功反馈
          if (isMobile && 'vibrate' in navigator) {
            navigator.vibrate([100, 50, 100])
          }
          
          // 添加成功反馈
          setUploadProgress(100)
          setTimeout(() => {
            setCurrentStep('chart_generation')
            setUploadProgress(0)
          }, 800)
        } else {
          setError(result.error?.message || '文件上传失败')
        }
      } else {
        setError('文件上传失败')
      }
      setIsLoading(false)
    })

    xhr.addEventListener('error', () => {
      setError('网络错误，请重试')
      setIsLoading(false)
      setUploadProgress(0)
    })

    xhr.open('POST', 'http://localhost:8000/api/v1/files/upload')
    setIsLoading(true)
    xhr.send(formData)
  }, [accessCode, isMobile])

  const handleFileUpload = useCallback((file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('请上传 Excel 文件（.xlsx 或 .xls 格式）')
      return
    }

    setUploadedFile(file)
    uploadFile(file)
  }, [uploadFile])

  // 预览生成功能暂时禁用，提升用户体验
  // const handleGeneratePreviews = async () => { ... }

  const handleGenerateCharts = async () => {
    console.log('handleGenerateCharts called')
    console.log('uploadedFileInfo:', uploadedFileInfo)
    console.log('selectedChartTypes:', selectedChartTypes)
    
    if (!uploadedFileInfo) {
      console.log('No uploaded file info')
      setError('请先上传文件')
      return
    }
    
    if (selectedChartTypes.length === 0) {
      console.log('No chart types selected')
      setError('请选择图表类型')
      return
    }

    setIsLoading(true)
    setError('')
    console.log('Starting chart generation...')

    try {
      // 使用正确的API端点生成选中的图表
      const response = await fetch('http://localhost:8000/api/v1/charts/previews/selected-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_code: accessCode,
          file_path: uploadedFileInfo.file_path,
          selected_chart_types: selectedChartTypes,
          width: 800,
          height: 600,
          format: 'png'
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || '图表生成失败')
      }

      // 处理返回的图表数据
      const charts = result.data.charts || []
      
      if (charts.length === 0) {
        throw new Error('未生成任何图表，请检查数据格式')
      }

      // 转换为前端显示格式
      const generatedCharts = charts.map((chart: {chart_type: string; chart_name?: string; chart_data: string; format?: string}, index: number) => ({
        id: `${chart.chart_type}_${index}`,
        type: chart.chart_type,
        title: chart.chart_name || `${chart.chart_type} 图表`,
        url: chart.chart_data.startsWith('data:image') ? chart.chart_data : `data:image/png;base64,${chart.chart_data}`,
        format: chart.format || 'png'
      }))

      setGeneratedCharts(generatedCharts)
      setCurrentStep('chart_display')
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '图表生成失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadChart = (chart: {id: string; title: string; url: string; format: string}) => {
    const link = document.createElement('a')
    link.href = chart.url
    link.download = `${chart.title}.${chart.format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 移动端图片交互处理
  const handleImageTouch = (chartId: string, action: 'in' | 'out' | 'reset') => {
    if (!isMobile) return
    
    setImageZoom(prev => {
      const currentZoom = prev[chartId] || 1
      let newZoom = currentZoom
      
      switch (action) {
        case 'in':
          newZoom = Math.min(currentZoom + 0.5, 3)
          break
        case 'out':
          newZoom = Math.max(currentZoom - 0.5, 0.5)
          break
        case 'reset':
          newZoom = 1
          break
      }
      
      return {
        ...prev,
        [chartId]: newZoom
      }
    })
  }

  // 获取配置选项
  const [configOptions, setConfigOptions] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    const fetchConfigOptions = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/charts/config/options')
        const result = await response.json()
        if (result.success) {
          setConfigOptions(result.data)
        }
      } catch (error) {
        console.error('获取配置选项失败:', error)
      }
    }
    
    fetchConfigOptions()
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleFileSelect called')
    console.log('Event target:', e.target)
    console.log('Files:', e.target.files)
    const files = e.target.files
    if (files && files.length > 0) {
      console.log('File selected:', files[0].name)
      handleFileUpload(files[0])
    } else {
      console.log('No files selected')
    }
  }

  const handleChartTypeToggle = (type: string) => {
    console.log('handleChartTypeToggle called with type:', type)
    setSelectedChartTypes(prev => {
      console.log('Previous selectedChartTypes:', prev)
      const newSelection = prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
      console.log('New selectedChartTypes:', newSelection)
      return newSelection
    })
  }

  const resetState = () => {
    setUploadedFile(null)
    setUploadedFileInfo(null)
    // setChartPreviews([]) // 暂时未使用
    setSelectedChartTypes(['bar', 'line'])
    setGeneratedCharts([])
    setError('')
    setUploadProgress(0)
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'access_code':
        return (
          <div className="animate-fade-in">
            <div className="professional-card p-8 max-w-md mx-auto">
              {/* 专业标题 */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-700">AI驱动的智能图表生成</span>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  输入访问码，高效生成汇报图表
                </h2>
                <p className="text-sm text-gray-500">
                  6位数字访问码，立即开始专业图表制作
                </p>
              </div>
              
              <div className="space-y-6">
                {/* 访问码输入 */}
                <div>
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => {
                      setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                      setError('')
                    }}
                    placeholder="6位数字访问码"
                    className={`professional-input access-code-input ${isMobile ? 'text-2xl py-4' : ''} ${accessCodeInfo ? (accessCodeInfo.isValid ? 'border-green-500 focus:border-green-600' : 'border-red-500 focus:border-red-600') : ''}`}
                    disabled={isLoading}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && accessCode.length === 6) {
                        handleValidateCode()
                      }
                    }}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-400">
                      {accessCode.length}/6 位数字
                    </span>
                    {accessCode.length === 6 && (
                      <>
                        {isValidating ? (
                          <span className="flex items-center text-xs text-blue-600">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse mr-1"></div>
                            验证中...
                          </span>
                        ) : accessCodeInfo ? (
                          <span className={`flex items-center text-xs ${accessCodeInfo.isValid ? 'text-green-600' : 'text-red-600'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-1 ${accessCodeInfo.isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            {accessCodeInfo.isValid ? '验证成功' : '验证失败'}
                          </span>
                        ) : (
                          <span className="flex items-center text-xs text-green-600">
                            <span className="status-indicator success"></span>
                            格式正确
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-slide-up">
                    <div className="flex items-start space-x-2">
                      <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-red-600 text-xs">!</span>
                      </div>
                      <div>
                        <p className="text-red-700 font-medium text-sm">验证失败</p>
                        <p className="text-red-600 text-xs mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 验证按钮 */}
                <button
                  onClick={handleValidateCode}
                  disabled={isLoading || accessCode.length !== 6}
                  className="professional-btn professional-btn-primary w-full"
                >
                  {isLoading ? (
                    <>
                      <div className="loading-spinner mr-2"></div>
                      验证中...
                    </>
                  ) : (
                    '开始使用'
                  )}
                </button>

                {/* 底部帮助和信息 */}
                <div className="text-center">
                  {/* 实时验证状态显示 */}
                  {accessCodeInfo && (
                    <div className={`mb-3 p-3 rounded-lg border ${accessCodeInfo.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      {accessCodeInfo.isValid ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-800">
                            剩余次数 <span className="font-bold">{accessCodeInfo.remainingUsage}</span> 次
                          </span>
                          {accessCodeInfo.remainingUsage !== undefined && accessCodeInfo.remainingUsage <= 5 && (
                            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded ml-2">
                              即将用完
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-red-700">
                            {accessCodeInfo.message}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 验证中状态 */}
                  {isValidating && (
                    <div className="mb-3 p-3 rounded-lg border border-blue-200 bg-blue-50">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-blue-700">验证中...</span>
                      </div>
                    </div>
                  )}
                  
                  {/* 默认帮助信息 */}
                  {!accessCodeInfo && !isValidating && (
                    <p className="text-xs text-gray-400">
                      访问码过期？联系管理员重置
                    </p>
                  )}
                  <p className="text-xs text-gray-300 mt-1">
                    小红书 @准点办公室
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'file_upload':
        return (
          <div className="animate-fade-in">
            <div className="professional-card p-8 max-w-2xl mx-auto">
              {/* 页面标题 */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  上传数据文件
                </h2>
                <p className="text-sm text-gray-500">
                  支持 .xlsx/.xls 格式，数据仅本地处理，上传后自动删除
                </p>
              </div>
              
              {/* 上传区域 */}
              <div
                className={`upload-zone p-8 md:p-12 text-center transition-all duration-300 ${
                  isDragging ? 'drag-over' : ''
                } ${isMobile ? 'min-h-[300px] flex items-center justify-center' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onTouchStart={(e) => {
                  // 移动端触摸反馈
                  if (isMobile) {
                    e.currentTarget.classList.add('drag-over')
                  }
                }}
                onTouchEnd={(e) => {
                  if (isMobile) {
                    e.currentTarget.classList.remove('drag-over')
                  }
                }}
              >
                {uploadedFile ? (
                  <div className="space-y-4">
                    {/* 文件信息 */}
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-green-600 text-lg">✓</span>
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-800">{uploadedFile.name}</p>
                        <p className="text-sm text-gray-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    
                    {/* 上传进度 */}
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">上传中</span>
                          <span className="font-medium text-blue-600">{uploadProgress}%</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {uploadProgress === 100 && (
                      <div className="text-center">
                        <span className="status-indicator success"></span>
                        <span className="text-green-600 font-medium ml-2">上传完成</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* 上传图标 */}
                    <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                    </div>
                    
                    {/* 上传说明 */}
                    <div>
                      <p className="text-gray-700 font-medium mb-2">
                        点击上传或拖拽文件至此处
                      </p>
                      <p className="text-sm text-gray-500">
                        支持 .xlsx/.xls 格式，单文件 ≤ 20MB
                      </p>
                    </div>
                    
                    {/* 选择文件按钮 */}
                    <label className={`professional-btn professional-btn-primary inline-block cursor-pointer ${isMobile ? 'py-4 text-lg' : ''}`}>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                      {isMobile ? '选择Excel文件' : '选择文件'}
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isLoading}
                        capture={false}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 animate-slide-up">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 text-sm">!</span>
                    </div>
                    <div>
                      <p className="text-red-700 font-medium">上传失败</p>
                      <p className="text-red-600 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 成功状态和操作 */}
              {uploadedFileInfo && (
                <div className="mt-8 space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm">✓</span>
                      </div>
                      <div>
                        <p className="text-green-700 font-medium">文件上传成功！</p>
                        <p className="text-green-600 text-sm mt-1">
                          数据已加载，可以开始配置图表
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => setCurrentStep('chart_generation')}
                      className="professional-btn professional-btn-primary"
                    >
                      配置图表
                    </button>
                    <button
                      onClick={() => {
                        resetState()
                        setCurrentStep('access_code')
                      }}
                      className="professional-btn professional-btn-secondary"
                    >
                      重新上传
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 'chart_generation':
        return (
          <div className="animate-fade-in">
            <div className="max-w-6xl mx-auto">
              {/* 页面标题 */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  图表配置
                </h2>
                <p className="text-sm text-gray-500">
                  选择图表类型和样式，生成专业的汇报图表
                </p>
              </div>
              
              {/* 配置区域 - 移动端垂直布局 */}
              <div className={`${isMobile ? 'space-y-6' : 'grid lg:grid-cols-3 gap-8'}`}>
                {/* 配置面板 */}
                <div className={isMobile ? '' : 'lg:col-span-1 space-y-6'}>
                  <div className="professional-card p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">图表设置</h3>
                    
                    {/* 图表类型选择 */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm">📊</span>
                        <label className="text-sm font-medium text-gray-700">图表类型</label>
                      </div>
                      <div className={`grid gap-2 ${isMobile ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {['bar', 'line', 'pie', 'area', 'scatter', 'radar'].map((type) => (
                          <button
                            key={type}
                            onClick={() => handleChartTypeToggle(type)}
                            className={`chart-type-btn ${isMobile ? 'py-3 text-sm' : ''} ${
                              selectedChartTypes.includes(type) ? 'selected' : ''
                            }`}
                          >
                            {type === 'bar' ? '柱状图' : 
                             type === 'line' ? '折线图' : 
                             type === 'pie' ? '饼图' : 
                             type === 'area' ? '面积图' : 
                             type === 'scatter' ? '散点图' : '雷达图'}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* 图表标题 */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm">📝</span>
                        <label className="text-sm font-medium text-gray-700">图表标题</label>
                      </div>
                      <input
                        type="text"
                        value={chartConfig.title}
                        onChange={(e) => setChartConfig(prev => ({...prev, title: e.target.value}))}
                        placeholder="输入图表标题"
                        className="professional-input"
                      />
                    </div>
                    
                    {/* 配色方案 */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm">🎨</span>
                        <label className="text-sm font-medium text-gray-700">配色方案</label>
                      </div>
                      <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {(configOptions?.color_schemes as Array<{value: string; name: string; description: string}> || [
                          {value: 'business_blue_gray', name: '商务蓝灰', description: '专业商务配色'},
                          {value: 'professional_black_gray', name: '专业黑灰', description: '经典黑白配色'}
                        ]).map((scheme) => (
                          <button
                            key={scheme.value}
                            onClick={() => setChartConfig(prev => ({...prev, colorScheme: scheme.value}))}
                            className={`chart-type-btn text-left ${isMobile ? 'py-3' : ''} ${
                              chartConfig.colorScheme === scheme.value ? 'selected' : ''
                            }`}
                          >
                            <div className="font-medium">{scheme.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{scheme.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* 输出设置 */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm">⚙️</span>
                        <label className="text-sm font-medium text-gray-700">输出设置</label>
                      </div>
                      
                      {/* 格式选择 */}
                      <div className="mb-3">
                        <label className="text-xs text-gray-600 mb-1 block">输出格式</label>
                        <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                          {(configOptions?.output_formats as Array<{value: string; name: string; description: string}> || [
                            {value: 'png', name: 'PNG', description: '透明背景，适合网页和PPT'},
                            {value: 'svg', name: 'SVG', description: '矢量格式，无损缩放'},
                            {value: 'jpg', name: 'JPG', description: '压缩格式，文件较小'}
                          ]).map((format) => (
                            <button
                              key={format.value}
                              onClick={() => setChartConfig(prev => ({...prev, outputFormat: format.value}))}
                              className={`chart-type-btn flex-1 ${isMobile ? 'py-3' : ''} ${
                                chartConfig.outputFormat === format.value ? 'selected' : ''
                              }`}
                            >
                              <div className="font-medium">{format.name}</div>
                              <div className="text-xs text-gray-500 mt-1">{format.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* 分辨率选择 */}
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">分辨率</label>
                        <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                          {(configOptions?.resolutions as Array<{value: string; name: string; description: string}> || [
                            {value: '150dpi', name: '标准 (150dpi)', description: '适合屏幕显示'},
                            {value: '300dpi', name: '高清 (300dpi)', description: '适合打印和高清展示'}
                          ]).map((res) => (
                            <button
                              key={res.value}
                              onClick={() => setChartConfig(prev => ({...prev, resolution: res.value}))}
                              className={`chart-type-btn flex-1 ${isMobile ? 'py-3' : ''} ${
                                chartConfig.resolution === res.value ? 'selected' : ''
                              }`}
                            >
                              <div className="font-medium">{res.name}</div>
                              <div className="text-xs text-gray-500 mt-1">{res.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 预览区域 */}
                <div className={isMobile ? '' : 'lg:col-span-2'}>
                  <div className="professional-card p-6 h-full">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">实时预览</h3>
                    
                    {/* 预览区域 */}
                    <div className={`bg-gray-50 rounded-lg p-4 md:p-8 text-center flex items-center justify-center border-2 border-dashed border-gray-200 ${
                      isMobile ? 'min-h-[250px]' : 'min-h-[400px]'
                    }`}>
                      {selectedChartTypes.length > 0 ? (
                        <div className="space-y-4">
                          <div className={`mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center ${
                            isMobile ? 'w-20 h-20' : 'w-32 h-32'
                          }`}>
                            <span className={isMobile ? 'text-xl' : 'text-2xl'}>📊</span>
                          </div>
                          <div>
                            <p className={`font-medium text-gray-800 ${isMobile ? 'text-sm' : ''}`}>{chartConfig.title}</p>
                            <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              {selectedChartTypes.map(type => 
                                type === 'bar' ? '柱状图' : 
                                type === 'line' ? '折线图' : 
                                type === 'pie' ? '饼图' : 
                                type === 'area' ? '面积图' : 
                                type === 'scatter' ? '散点图' : '雷达图'
                              ).join(' / ')}
                            </p>
                            <p className={`text-gray-400 mt-2 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                              {chartConfig.colorScheme === 'business_blue_gray' ? '商务蓝灰' : '专业黑灰'} · {chartConfig.outputFormat.toUpperCase()} · {chartConfig.resolution}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className={`bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4 ${
                            isMobile ? 'w-12 h-12' : 'w-16 h-16'
                          }`}>
                            <span className={`text-gray-400 ${isMobile ? 'text-lg' : 'text-xl'}`}>📊</span>
                          </div>
                          <p className={`text-gray-500 ${isMobile ? 'text-sm' : ''}`}>请选择图表类型开始配置</p>
                        </div>
                      )}
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className={`mt-6 flex gap-3 ${isMobile ? 'flex-col' : 'flex-col sm:flex-row'}`}>
                      <button
                        onClick={handleGenerateCharts}
                        disabled={isLoading || selectedChartTypes.length === 0}
                        className={`professional-btn professional-btn-primary flex-1 ${isMobile ? 'py-4' : ''}`}
                      >
                        {isLoading ? (
                          <>
                            <div className="loading-spinner mr-2"></div>
                            生成中...
                          </>
                        ) : (
                          '生成图表'
                        )}
                      </button>
                      <button
                        onClick={() => setCurrentStep('file_upload')}
                        className={`professional-btn professional-btn-secondary ${isMobile ? 'py-4' : ''}`}
                      >
                        返回上传
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'chart_display':
        return (
          <div className="animate-fade-in">
            <div className="max-w-4xl mx-auto">
              {/* 成功标题 */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-600 text-2xl">✓</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  图表生成成功
                </h2>
                <p className="text-sm text-gray-500">
                  已保存为 {chartConfig.outputFormat.toUpperCase()} 格式 · {chartConfig.resolution} · {chartConfig.colorScheme === 'business_blue_gray' ? '商务蓝灰' : '专业黑灰'}
                </p>
              </div>
              
              {/* 图表展示 */}
              <div className="professional-card p-4 md:p-8 mb-6">
                <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
                  {generatedCharts.map((chart) => (
                    <div key={chart.id} className="space-y-4">
                      {/* 图表信息 */}
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold text-gray-800 ${isMobile ? 'text-base' : 'text-lg'}`}>
                          {chart.title}
                        </h3>
                        <span className="status-indicator success"></span>
                      </div>
                      
                      {/* 图表预览 */}
                      <div className={`bg-gray-50 rounded-lg p-4 flex items-center justify-center border border-gray-200 relative ${
                        isMobile ? 'min-h-[200px]' : 'min-h-[300px] p-6'
                      }`}>
                        <img 
                          src={chart.url} 
                          alt={chart.title}
                          className={`object-contain transition-transform duration-200 ${
                            isMobile ? 'max-h-[180px]' : 'max-h-[280px] max-w-full'
                          }`}
                          style={{
                            transform: `scale(${imageZoom[chart.id] || 1})`
                          }}
                        />
                        
                        {/* 移动端缩放控制 */}
                        {isMobile && (
                          <div className="absolute bottom-2 right-2 flex gap-1">
                            <button
                              onClick={() => handleImageTouch(chart.id, 'out')}
                              className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleImageTouch(chart.id, 'reset')}
                              className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 text-xs"
                            >
                              {Math.round((imageZoom[chart.id] || 1) * 100)}%
                            </button>
                            <button
                              onClick={() => handleImageTouch(chart.id, 'in')}
                              className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* 下载操作 */}
                      <div className={`flex gap-3 ${isMobile ? 'flex-col' : ''}`}>
                        <button
                          onClick={() => handleDownloadChart(chart)}
                          className={`professional-btn professional-btn-primary ${isMobile ? 'py-3' : 'flex-1'}`}
                        >
                          <svg className={`mr-2 ${isMobile ? 'w-4 h-4' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                          下载图表
                        </button>
                        <button
                          onClick={() => {
                            // 复制到剪贴板功能
                            navigator.clipboard.writeText(window.location.href)
                            if (isMobile && 'vibrate' in navigator) {
                              navigator.vibrate(50)
                            }
                          }}
                          className={`professional-btn professional-btn-secondary ${isMobile ? 'py-3' : ''}`}
                          title="复制链接"
                        >
                          <svg className={`w-4 h-4`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* 场景提示 */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs">💡</span>
                    </div>
                    <div>
                      <p className="text-blue-800 font-medium text-sm">使用建议</p>
                      <p className="text-blue-700 text-xs mt-1">
                        此图表已优化，可直接插入PPT演示文稿、邮件汇报或会议材料。支持透明背景，在任何背景下都能完美显示。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 后续操作 */}
              <div className={`flex gap-4 justify-center ${isMobile ? 'flex-col' : 'flex-col sm:flex-row'}`}>
                <button
                  onClick={() => setCurrentStep('chart_generation')}
                  className={`professional-btn professional-btn-secondary ${isMobile ? 'py-4' : ''}`}
                >
                  重新配置
                </button>
                <button
                  onClick={() => {
                    resetState()
                    setCurrentStep('access_code')
                  }}
                  className={`professional-btn professional-btn-primary ${isMobile ? 'py-4' : ''}`}
                >
                  开始新项目
                </button>
              </div>
              
              {/* 底部提示 */}
              <div className="text-center mt-8">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                  <span>📁 图表已缓存，3天内可重新下载</span>
                  <span>•</span>
                  <button className="text-blue-500 hover:text-blue-600">反馈问题 →</button>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return <div>未知步骤</div>
    }
  }

  return (
    <div className="professional-bg touch-manipulation">
      <div className="min-h-screen flex flex-col safe-area-inset">
        {/* 顶部品牌标识 */}
        <header className="text-center pt-6 md:pt-8 pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-gradient">
              DataReport
            </h1>
            {isMobile && (
              <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
                ← → 滑动切换
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            职场汇报图表工具
          </p>
        </header>

        {/* 主要内容区域 */}
        <main className="flex-1 px-4 pb-8">
          <div className="max-w-4xl mx-auto">
            {renderCurrentStep()}
          </div>
        </main>

        {/* 专业页脚 */}
        <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 py-6 mt-auto">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-gentle"></div>
              <span className="text-sm text-green-600 font-medium">系统正常</span>
            </div>
            <p className="text-xs text-gray-400">
              © 2024 DataReport. 专注职场汇报效率 | 专业图表生成工具
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default SimpleApp