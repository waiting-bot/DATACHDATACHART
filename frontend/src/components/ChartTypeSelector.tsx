import React, { useState, useCallback } from 'react'
import { Eye, Check, TrendingUp, BarChart2, PieChart, Activity, Grid3X3, Box, BarChart, Music } from 'lucide-react'

interface ChartType {
  type: string
  name: string
  description: string
  icon: React.ReactNode
  suitableFor: string[]
  preview?: string // Base64 encoded preview image
}

interface ChartTypeSelectorProps {
  availableTypes?: string[]
  selectedTypes?: string[]
  onSelectionChange?: (types: string[]) => void
  onTypeSelect?: (type: string) => void
  multiSelect?: boolean
  disabled?: boolean
  showPreviews?: boolean
}

const ChartTypeSelector: React.FC<ChartTypeSelectorProps> = ({
  availableTypes,
  selectedTypes = [],
  onSelectionChange,
  onTypeSelect,
  multiSelect = false,
  disabled = false,
  showPreviews = true
}) => {
  const [hoveredType, setHoveredType] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<boolean>(showPreviews)

  // 所有支持的图表类型
  const allChartTypes: ChartType[] = [
    {
      type: 'bar',
      name: '柱状图',
      description: '比较不同类别之间的数值差异',
      icon: <BarChart2 className="w-6 h-6" />,
      suitableFor: ['分类数据对比', '数值比较', '排名展示']
    },
    {
      type: 'line',
      name: '折线图',
      description: '展示数据随时间或类别变化的趋势',
      icon: <TrendingUp className="w-6 h-6" />,
      suitableFor: ['时间序列数据', '趋势分析', '连续数据变化']
    },
    {
      type: 'pie',
      name: '饼图',
      description: '显示各部分占整体的比例关系',
      icon: <PieChart className="w-6 h-6" />,
      suitableFor: ['占比分析', '构成比例', '百分比展示']
    },
    {
      type: 'scatter',
      name: '散点图',
      description: '展示两个变量之间的相关关系',
      icon: <Activity className="w-6 h-6" />,
      suitableFor: ['相关性分析', '数据分布', '异常值检测']
    },
    {
      type: 'area',
      name: '面积图',
      description: '强调数值随时间变化的累积效果',
      icon: <BarChart className="w-6 h-6" />,
      suitableFor: ['累积变化', '总量趋势', '区间分析']
    },
    {
      type: 'heatmap',
      name: '热力图',
      description: '通过颜色深浅展示数据的密度或强度',
      icon: <Grid3X3 className="w-6 h-6" />,
      suitableFor: ['矩阵数据', '密度分布', '热度分析']
    },
    {
      type: 'box',
      name: '箱线图',
      description: '显示数据的分布情况和异常值',
      icon: <Box className="w-6 h-6" />,
      suitableFor: ['数据分布', '异常值检测', '统计分析']
    },
    {
      type: 'violin',
      name: '小提琴图',
      description: '结合箱线图和密度图，展示数据分布',
      icon: <Music className="w-6 h-6" />,
      suitableFor: ['密度分布', '多组数据对比', '分布形态']
    },
    {
      type: 'histogram',
      name: '直方图',
      description: '展示数值数据的分布频率',
      icon: <BarChart className="w-6 h-6" />,
      suitableFor: ['频率分布', '数据分箱', '统计分布']
    }
  ]

  // 过滤可用的图表类型
  const chartTypes = availableTypes 
    ? allChartTypes.filter(type => availableTypes.includes(type.type))
    : allChartTypes

  // 处理图表类型选择
  const handleTypeSelect = useCallback((type: string) => {
    if (disabled) return

    if (multiSelect) {
      const newSelection = selectedTypes.includes(type)
        ? selectedTypes.filter(t => t !== type)
        : [...selectedTypes, type]
      
      onSelectionChange?.(newSelection)
    } else {
      onTypeSelect?.(type)
    }
  }, [selectedTypes, multiSelect, disabled, onSelectionChange, onTypeSelect])

  // 处理鼠标悬停
  const handleMouseEnter = useCallback((type: string) => {
    setHoveredType(type)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredType(null)
  }, [])

  // 判断是否选中
  const isSelected = useCallback((type: string) => {
    return multiSelect ? selectedTypes.includes(type) : selectedTypes[0] === type
  }, [selectedTypes, multiSelect])

  // 获取推荐图表类型（基于数据特征）
  const getRecommendedTypes = useCallback(() => {
    // 这里可以根据数据特征返回推荐类型
    // 简化版本，推荐最常用的几种
    return ['bar', 'line', 'pie']
  }, [])

  const recommendedTypes = getRecommendedTypes()

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* 标题和控制 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">选择图表类型</h2>
          <p className="text-gray-600">
            {multiSelect 
              ? '选择一个或多个图表类型进行生成' 
              : '选择最适合您数据的图表类型'
            }
          </p>
        </div>
        
        {showPreviews && (
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Eye className="w-4 h-4" />
            {previewMode ? '隐藏预览' : '显示预览'}
          </button>
        )}
      </div>

      {/* 推荐图表类型 */}
      {recommendedTypes.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            推荐图表类型
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {chartTypes
              .filter(type => recommendedTypes.includes(type.type))
              .map((chartType) => (
                <div
                  key={chartType.type}
                  className={`
                    relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-200
                    ${isSelected(chartType.type)
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md hover:bg-gray-50'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  onClick={() => handleTypeSelect(chartType.type)}
                  onMouseEnter={() => handleMouseEnter(chartType.type)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="flex items-start gap-4">
                    <div className={`
                      flex-shrink-0 p-3 rounded-lg
                      ${isSelected(chartType.type) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}
                    `}>
                      {chartType.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{chartType.name}</h4>
                        {isSelected(chartType.type) && (
                          <Check className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{chartType.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {chartType.suitableFor.map((use, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full"
                          >
                            {use}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* 预览区域 */}
                  {previewMode && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="text-center text-gray-400 text-sm">
                        <Eye className="w-4 h-4 inline mr-1" />
                        预览效果（实时生成）
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 所有图表类型 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">所有图表类型</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chartTypes.map((chartType) => (
            <div
              key={chartType.type}
              className={`
                relative p-4 rounded-lg border cursor-pointer transition-all duration-200
                ${isSelected(chartType.type)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => handleTypeSelect(chartType.type)}
              onMouseEnter={() => handleMouseEnter(chartType.type)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`
                  flex-shrink-0 p-2 rounded-md
                  ${isSelected(chartType.type) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}
                `}>
                  {React.cloneElement(chartType.icon as React.ReactElement, { className: 'w-5 h-5' })}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{chartType.name}</h4>
                    {isSelected(chartType.type) && (
                      <Check className="w-4 h-4 text-blue-500" />
                    )}
                    {recommendedTypes.includes(chartType.type) && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        推荐
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">{chartType.description}</p>
              
              <div className="flex flex-wrap gap-1">
                {chartType.suitableFor.slice(0, 2).map((use, index) => (
                  <span
                    key={index}
                    className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                  >
                    {use}
                  </span>
                ))}
                {chartType.suitableFor.length > 2 && (
                  <span className="text-xs text-gray-500">
                    +{chartType.suitableFor.length - 2}
                  </span>
                )}
              </div>

              {/* 悬停时的详细信息 */}
              {hoveredType === chartType.type && !isSelected(chartType.type) && (
                <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-90">
                  点击选择
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 选择状态提示 */}
      {selectedTypes.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-blue-900">
                已选择 {selectedTypes.length} 个图表类型
              </span>
              <div className="text-sm text-blue-700 mt-1">
                {selectedTypes.map(type => {
                  const chart = chartTypes.find(c => c.type === type)
                  return chart ? chart.name : type
                }).join(', ')}
              </div>
            </div>
            {multiSelect && (
              <button
                onClick={() => onSelectionChange?.([])}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                清空选择
              </button>
            )}
          </div>
        </div>
      )}

      {/* 禁用状态提示 */}
      {disabled && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg border border-gray-300">
          <p className="text-sm text-gray-600">
            图表类型选择已禁用，请先完成前置步骤
          </p>
        </div>
      )}
    </div>
  )
}

export default ChartTypeSelector