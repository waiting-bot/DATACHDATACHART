import React, { useState, useCallback } from 'react'
import { Download, ZoomIn, ZoomOut, RotateCcw, Info, Copy } from 'lucide-react'

interface ChartData {
  chart_type: string
  chart_name: string
  chart_data: string // Base64 encoded image
  width: number
  height: number
  format: string
  file_size?: number
}

interface ChartDisplayProps {
  charts: ChartData[]
  accessCode: string
  onChartSelect?: (chart: ChartData) => void
  onDownload?: (chart: ChartData) => void
  remainingUsage?: number
}

const ChartDisplay: React.FC<ChartDisplayProps> = ({
  charts,
  accessCode,
  onChartSelect,
  onDownload,
  remainingUsage
}) => {
  const [selectedChartIndex, setSelectedChartIndex] = useState<number>(0)
  const [zoomLevel, setZoomLevel] = useState<number>(100)
  const [isDownloading, setIsDownloading] = useState<{[key: string]: boolean}>({})
  const [copiedMessage, setCopiedMessage] = useState<string>('')

  const selectedChart = charts[selectedChartIndex]

  // 处理图表选择
  const handleChartSelect = useCallback((index: number) => {
    setSelectedChartIndex(index)
    const chart = charts[index]
    onChartSelect?.(chart)
  }, [charts, onChartSelect])

  // 处理缩放
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 25, 200))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 25, 50))
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoomLevel(100)
  }, [])

  // 处理下载
  const handleDownload = useCallback(async (chart: ChartData) => {
    if (!accessCode.trim()) {
      setCopiedMessage('请先输入访问码')
      setTimeout(() => setCopiedMessage(''), 3000)
      return
    }

    setIsDownloading(prev => ({ ...prev, [chart.chart_type]: true }))
    
    try {
      // 调用父组件的下载处理函数
      onDownload?.(chart)
      
      // 下载图片
      const link = document.createElement('a')
      link.href = chart.chart_data
      link.download = `${chart.chart_name}.${chart.format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setCopiedMessage(`${chart.chart_name} 下载成功`)
    } catch (error) {
      setCopiedMessage('下载失败，请重试')
    } finally {
      setIsDownloading(prev => ({ ...prev, [chart.chart_type]: false }))
      setTimeout(() => setCopiedMessage(''), 3000)
    }
  }, [accessCode, onDownload])

  // 复制图片到剪贴板
  const handleCopyImage = useCallback(async (chart: ChartData) => {
    try {
      const response = await fetch(chart.chart_data)
      const blob = await response.blob()
      
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ])
      
      setCopiedMessage('图片已复制到剪贴板')
      setTimeout(() => setCopiedMessage(''), 3000)
    } catch (error) {
      setCopiedMessage('复制失败，请重试')
      setTimeout(() => setCopiedMessage(''), 3000)
    }
  }, [])

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

  // 获取图表描述
  const getChartDescription = useCallback((chartType: string) => {
    const descriptions: { [key: string]: string } = {
      'line': '展示数据随时间或类别变化的趋势',
      'bar': '比较不同类别之间的数值差异',
      'pie': '显示各部分占整体的比例关系',
      'scatter': '展示两个变量之间的相关关系',
      'area': '强调数值随时间变化的累积效果',
      'heatmap': '通过颜色深浅展示数据的密度或强度',
      'box': '显示数据的分布情况和异常值',
      'violin': '结合箱线图和密度图，展示数据分布',
      'histogram': '展示数值数据的分布频率'
    }
    return descriptions[chartType] || ''
  }, [])

  // 格式化文件大小
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  if (charts.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto text-center py-12">
        <div className="text-gray-400 mb-4">
          <Info className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无图表</h3>
        <p className="text-gray-600">请先上传Excel文件生成图表</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* 图表选择器 */}
      {charts.length > 1 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">选择图表类型</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {charts.map((chart, index) => (
              <button
                key={chart.chart_type}
                onClick={() => handleChartSelect(index)}
                className={`
                  p-4 rounded-lg border-2 transition-all duration-200 text-left
                  ${selectedChartIndex === index 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="font-medium text-gray-900 mb-1">
                  {getChartDisplayName(chart.chart_type)}
                </div>
                <div className="text-sm text-gray-600">
                  {chart.width}×{chart.height}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatFileSize(chart.file_size || 0)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 当前图表显示 */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* 图表信息栏 */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {selectedChart?.chart_name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {getChartDescription(selectedChart?.chart_type || '')}
              </p>
              {selectedChart?.file_size && (
                <p className="text-xs text-gray-500 mt-1">
                  文件大小: {formatFileSize(selectedChart.file_size)} | 
                  尺寸: {selectedChart.width}×{selectedChart.height} | 
                  格式: {selectedChart.format.toUpperCase()}
                </p>
              )}
            </div>
            
            {/* 控制按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50}
                className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="缩小"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-600 min-w-[3rem] text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 200}
                className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="放大"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-2 rounded hover:bg-gray-200"
                title="重置缩放"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleCopyImage(selectedChart)}
                className="p-2 rounded hover:bg-gray-200"
                title="复制图片"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDownload(selectedChart)}
                disabled={isDownloading[selectedChart.chart_type] || !accessCode.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                {isDownloading[selectedChart.chart_type] ? '下载中...' : '下载图表'}
              </button>
            </div>
          </div>
        </div>

        {/* 图表显示区域 */}
        <div className="p-6 overflow-auto bg-gray-50">
          <div 
            className="mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            style={{ 
              maxWidth: `${selectedChart?.width || 800}px`,
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center'
            }}
          >
            {selectedChart && (
              <img
                src={selectedChart.chart_data}
                alt={selectedChart.chart_name}
                className="w-full h-auto"
                style={{ 
                  backgroundColor: 'transparent',
                  display: 'block'
                }}
              />
            )}
          </div>
        </div>

        {/* 剩余使用次数提示 */}
        {remainingUsage !== undefined && (
          <div className="p-4 border-t border-gray-200 bg-blue-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                剩余使用次数: <span className="font-medium">{remainingUsage}</span> 次
              </span>
              {remainingUsage <= 5 && (
                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                  使用次数即将用完
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 临时消息提示 */}
      {copiedMessage && (
        <div className="fixed top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-out">
          {copiedMessage}
        </div>
      )}

      {/* 样式 */}
      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-10px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .animate-fade-in-out {
          animation: fade-in-out 3s ease-in-out forwards;
        }
      `}</style>
    </div>
  )
}

export default ChartDisplay