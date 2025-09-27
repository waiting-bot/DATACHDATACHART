import React, { useState, useEffect } from 'react'

const SimpleApp: React.FC = () => {
  const [currentStep, setCurrentStep] = useState('access_code')
  const [accessCode, setAccessCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedFileInfo, setUploadedFileInfo] = useState<any>(null)
  const [chartPreviews, setChartPreviews] = useState<any[]>([])
  const [selectedChartTypes, setSelectedChartTypes] = useState<string[]>(['bar', 'line'])
  const [generatedCharts, setGeneratedCharts] = useState<any[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    // 应用初始化
  }, [])

  const handleValidateCode = async () => {
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
        setCurrentStep('file_upload')
      } else {
        throw new Error('访问码验证失败')
      }
    } catch (err: any) {
      setError(err.message || '网络请求失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('请上传 Excel 文件（.xlsx 或 .xls 格式）')
      return
    }

    setUploadedFile(file)
    uploadFile(file)
  }

  const uploadFile = (file: File) => {
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
  }

  const handleGeneratePreviews = async () => {
    if (!uploadedFileInfo || selectedChartTypes.length === 0) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:8000/api/v1/charts/previews/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: uploadedFileInfo.file_path,
          chart_types: selectedChartTypes,
          width: 400,
          height: 300
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || '预览生成失败')
      }

      if (result.success) {
        setChartPreviews(result.previews)
        setError('')
      } else {
        throw new Error('预览生成失败')
      }
    } catch (err: any) {
      setError(err.message || '预览生成失败')
    } finally {
      setIsLoading(false)
    }
  }

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
      const generatedCharts = charts.map((chart, index) => ({
        id: `${chart.chart_type}_${index}`,
        type: chart.chart_type,
        title: chart.chart_name || `${chart.chart_type} 图表`,
        url: chart.chart_data.startsWith('data:image') ? chart.chart_data : `data:image/png;base64,${chart.chart_data}`,
        format: chart.format || 'png'
      }))

      setGeneratedCharts(generatedCharts)
      setCurrentStep('chart_display')
      setError('')
    } catch (err: any) {
      setError(err.message || '图表生成失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadChart = (chart: any) => {
    const link = document.createElement('a')
    link.href = chart.url
    link.download = `${chart.title}.${chart.format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

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
    setChartPreviews([])
    setSelectedChartTypes(['bar', 'line'])
    setGeneratedCharts([])
    setError('')
    setUploadProgress(0)
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'access_code':
        return (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
              智能图表生成工具
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  访问码
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => {
                    console.log('Access code input changed:', e.target.value)
                    setAccessCode(e.target.value)
                  }}
                  placeholder="请输入访问码"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                  disabled={isLoading}
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div>
                      <p className="text-red-700 font-medium">验证失败</p>
                      <p className="text-red-600 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={handleValidateCode}
                disabled={isLoading || !accessCode.trim()}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200 font-medium"
              >
                {isLoading ? '验证中...' : '验证访问码'}
              </button>
            </div>
          </div>
        )

      case 'file_upload':
        return (
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
              上传 Excel 文件
            </h2>
            
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {uploadedFile ? (
                <div className="space-y-4">
                  <div className="text-green-600 font-medium">
                    ✓ 已选择文件: {uploadedFile.name}
                  </div>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        上传进度: {uploadProgress}%
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-gray-500">
                    拖拽 Excel 文件到此处，或点击下方按钮选择文件
                  </div>
                  <label className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 cursor-pointer transition duration-200 font-medium">
                    选择文件
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isLoading}
                    />
                  </label>
                  <div className="text-sm text-gray-500">
                    支持 .xlsx 和 .xls 格式
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div>
                    <p className="text-red-700 font-medium">上传失败</p>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {uploadedFileInfo && (
              <div className="mt-6 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="text-green-700 font-medium">文件上传成功！</span>
                  </div>
                  <div className="mt-2 text-sm text-green-600">
                    <p>文件名: {uploadedFileInfo.original_name || uploadedFile?.name}</p>
                    <p>文件大小: {(uploadedFileInfo.file_size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => {
                      setCurrentStep('chart_generation')
                    }}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition duration-200 font-medium flex items-center space-x-2"
                  >
                    <span>继续生成图表</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      resetState()
                      setCurrentStep('access_code')
                    }}
                    className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition duration-200 font-medium"
                  >
                    重新开始
                  </button>
                </div>
              </div>
            )}
          </div>
        )

      case 'chart_generation':
        return (
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
              选择图表类型
            </h2>
            
              
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {['bar', 'line', 'pie', 'area'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleChartTypeToggle(type)}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    selectedChartTypes.includes(type)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-sm font-medium capitalize">
                    {type === 'bar' ? '柱状图' : 
                     type === 'line' ? '折线图' : 
                     type === 'pie' ? '饼图' : '面积图'}
                  </div>
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div>
                    <p className="text-red-700 font-medium">操作失败</p>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center space-x-4">
              <button
                onClick={handleGenerateCharts}
                disabled={isLoading || selectedChartTypes.length === 0}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200 font-medium"
              >
                {isLoading ? '生成中...' : '生成图表'}
              </button>
              <button
                onClick={() => setCurrentStep('file_upload')}
                className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition duration-200 font-medium"
              >
                返回上一步
              </button>
            </div>
          </div>
        )

      case 'chart_display':
        return (
          <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
              生成的图表
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {generatedCharts.map((chart) => (
                <div key={chart.id} className="border rounded-lg p-4 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {chart.title}
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 min-h-[300px] flex items-center justify-center">
                    <img 
                      src={chart.url} 
                      alt={chart.title}
                      className="max-w-full max-h-[400px] object-contain"
                    />
                  </div>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => handleDownloadChart(chart)}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200 font-medium"
                    >
                      下载图表
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setCurrentStep('chart_generation')}
                className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition duration-200 font-medium"
              >
                重新生成
              </button>
              <button
                onClick={() => {
                  resetState()
                  setCurrentStep('access_code')
                }}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition duration-200 font-medium"
              >
                开始新的项目
              </button>
            </div>
          </div>
        )

      default:
        return <div>未知步骤</div>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            智能图表生成工具
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            上传 Excel 文件，自动生成精美的数据可视化图表
          </p>
        </div>

        <div className="space-y-8">
          {renderCurrentStep()}
        </div>

        <div className="text-center mt-16 text-gray-500">
          <p>© 2024 智能图表生成工具. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export default SimpleApp