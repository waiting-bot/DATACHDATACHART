import React, { useState, useCallback, useEffect } from 'react'
import { Eye, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'

interface PreviewChart {
  chart_type: string
  chart_name: string
  preview_data: string // Base64 encoded image
  width: number
  height: number
  format: string
  description?: string
}

interface ChartPreviewProps {
  filePath?: string
  accessCode?: string
  chartTypes?: string[]
  onPreviewGenerated?: (previews: PreviewChart[]) => void
  onPreviewError?: (error: string) => void
  autoGenerate?: boolean
  className?: string
}

const ChartPreview: React.FC<ChartPreviewProps> = ({
  filePath,
  accessCode = '',
  chartTypes = ['bar', 'line', 'pie'],
  onPreviewGenerated,
  onPreviewError,
  autoGenerate = false,
  className = ''
}) => {
  const [previews, setPreviews] = useState<PreviewChart[]>([])
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null)
  const [error, setError] = useState<string>('')
  const [retryCount, setRetryCount] = useState<number>(0)

  // 生成预览图
  const generatePreviews = useCallback(async () => {
    if (!filePath || !accessCode.trim()) {
      setError('请先上传文件并输入访问码')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const response = await fetch('http://localhost:8000/api/v1/generate-previews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath,
          chart_types: chartTypes,
          width: 400,
          height: 300
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || '预览生成失败')
      }

      if (result.success && result.data?.previews) {
        const previewCharts = result.data.previews.map((preview: any) => ({
          chart_type: preview.chart_type,
          chart_name: preview.chart_name,
          preview_data: preview.preview_data,
          width: preview.width,
          height: preview.height,
          format: preview.format,
          description: preview.description
        }))

        setPreviews(previewCharts)
        setSelectedPreview(previewCharts[0]?.chart_type || null)
        onPreviewGenerated?.(previewCharts)
        
        // 清除错误状态
        setError('')
        setRetryCount(0)
      } else {
        throw new Error(result.message || '预览生成失败')
      }

    } catch (err: any) {
      const errorMessage = err.message || '网络请求失败'
      setError(errorMessage)
      onPreviewError?.(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }, [filePath, accessCode, chartTypes, onPreviewGenerated, onPreviewError])

  // 重试生成
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1)
    generatePreviews()
  }, [generatePreviews])

  // 自动生成预览
  useEffect(() => {
    if (autoGenerate && filePath && accessCode.trim()) {
      generatePreviews()
    }
  }, [autoGenerate, filePath, accessCode, generatePreviews])

  // 清除预览
  const clearPreviews = useCallback(() => {
    setPreviews([])
    setSelectedPreview(null)
    setError('')
    setRetryCount(0)
  }, [])

  // 获取当前选中的预览图
  const selectedPreviewData = previews.find(p => p.chart_type === selectedPreview)

  // 获取图表中文显示名称
  const getChartDisplayName = useCallback((chartType: string) => {
    const chartNames: { [key: string]: string } = {
      'line': '折线图',
      'bar': '柱状图',
      'pie': '饼图',
      'scatter': '散点图',
      'area': '面积图',
      'heatmap': '热力图',
      'box': '箱线图',
      'violin': '小提琴图',
      'histogram': '直方图'
    }
    return chartNames[chartType] || chartType
  }, [])

  // 获取图表颜色主题
  const getChartColor = useCallback((chartType: string) => {
    const colors: { [key: string]: string } = {
      'line': 'from-blue-500 to-blue-600',
      'bar': 'from-green-500 to-green-600',
      'pie': 'from-purple-500 to-purple-600',
      'scatter': 'from-orange-500 to-orange-600',
      'area': 'from-cyan-500 to-cyan-600',
      'heatmap': 'from-red-500 to-red-600',
      'box': 'from-indigo-500 to-indigo-600',
      'violin': 'from-pink-500 to-pink-600',
      'histogram': 'from-yellow-500 to-yellow-600'
    }
    return colors[chartType] || 'from-gray-500 to-gray-600'
  }, [])

  if (!filePath) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-400 mb-4">
          <Eye className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无预览</h3>
        <p className="text-gray-600">请先上传Excel文件</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* 控制面板 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">图表预览</h3>
          <p className="text-sm text-gray-600">
            {previews.length > 0 
              ? `已生成 ${previews.length} 个预览图` 
              : '点击生成预览图查看不同图表效果'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {previews.length > 0 && (
            <button
              onClick={clearPreviews}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              清除预览
            </button>
          )}
          
          <button
            onClick={generatePreviews}
            disabled={isGenerating || !accessCode.trim()}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                {previews.length > 0 ? '重新生成' : '生成预览'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* 错误状态 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">预览生成失败</span>
          </div>
          <p className="text-red-700 mt-1 mb-3">{error}</p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
          >
            <RefreshCw className="w-3 h-3" />
            重试 ({retryCount})
          </button>
        </div>
      )}

      {/* 生成状态 */}
      {isGenerating && (
        <div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <div>
              <p className="font-medium text-gray-900">正在生成预览图...</p>
              <p className="text-sm text-gray-600">这可能需要几秒钟时间</p>
            </div>
          </div>
        </div>
      )}

      {/* 预览图网格 */}
      {previews.length > 0 && (
        <div className="space-y-6">
          {/* 预览图选择器 */}
          <div className="flex flex-wrap gap-2">
            {previews.map((preview) => (
              <button
                key={preview.chart_type}
                onClick={() => setSelectedPreview(preview.chart_type)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200
                  ${selectedPreview === preview.chart_type
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700'
                  }
                `}
              >
                <div className={`w-3 h-3 rounded bg-gradient-to-br ${getChartColor(preview.chart_type)}`}></div>
                <span className="text-sm font-medium">{getChartDisplayName(preview.chart_type)}</span>
                <span className="text-xs text-gray-500">{preview.width}×{preview.height}</span>
              </button>
            ))}
          </div>

          {/* 主要预览区域 */}
          {selectedPreviewData && (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {getChartDisplayName(selectedPreviewData.chart_type)}
                    </h4>
                    {selectedPreviewData.description && (
                      <p className="text-sm text-gray-600 mt-1">{selectedPreviewData.description}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedPreviewData.width}×{selectedPreviewData.height} • {selectedPreviewData.format.toUpperCase()}
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-gray-50">
                <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <img
                    src={`data:${selectedPreviewData.format === 'svg' ? 'image/svg+xml' : 'image/png'};base64,${selectedPreviewData.preview_data}`}
                    alt={`${getChartDisplayName(selectedPreviewData.chart_type)} 预览`}
                    className="w-full h-auto"
                    style={{ backgroundColor: 'transparent' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 缩略图网格 */}
          {previews.length > 1 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">所有预览</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {previews.map((preview) => (
                  <div
                    key={preview.chart_type}
                    onClick={() => setSelectedPreview(preview.chart_type)}
                    className={`
                      relative group cursor-pointer rounded-lg border-2 overflow-hidden transition-all duration-200
                      ${selectedPreview === preview.chart_type
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }
                    `}
                  >
                    <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center">
                      <img
                        src={`data:${preview.format === 'svg' ? 'image/svg+xml' : 'image/png'};base64,${preview.preview_data}`}
                        alt={`${getChartDisplayName(preview.chart_type)} 缩略图`}
                        className="w-full h-full object-contain p-2"
                        style={{ backgroundColor: 'transparent' }}
                      />
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-white text-sm font-medium truncate">
                        {getChartDisplayName(preview.chart_type)}
                      </p>
                    </div>
                    
                    {selectedPreview === preview.chart_type && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 提示信息 */}
      {!previews.length && !isGenerating && !error && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">预览功能</h4>
          <p className="text-gray-600 mb-4">
            生成小尺寸预览图，帮助您选择最适合的图表类型
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>预览图不消耗访问码次数</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChartPreview