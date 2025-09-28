import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Chart } from 'chart.js/auto'

// 图表实例配置接口
interface ChartInstance {
  id: string
  type: string
  name: string
  config: {
    dataSeries: {
      xAxis: string
      yAxis: string
      yAxis2?: string // 组合图表用
    }
    styling: {
      title: string
      colorScheme: string
      showLegend: boolean
      legendPosition: 'top' | 'right' | 'bottom' | 'hidden'
      showGridLines: boolean
      showDataLabels: boolean
      dataLabelFormat: '整数' | '1位小数' | '2位小数' | '百分比'
    }
    layout: {
      showAxisLabels: boolean
      xAxisLabel: string
      yAxisLabel: string
    }
  }
}

const SimpleApp: React.FC = () => {
  const [currentStep, setCurrentStep] = useState('access_code')
  const [accessCode, setAccessCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedFileInfo, setUploadedFileInfo] = useState<Record<string, unknown> | null>(null)
  // const [chartPreviews, setChartPreviews] = useState<any[]>([]) // 暂时未使用
  
  // 图表实例状态管理 - 新的配置系统
  const [chartInstances, setChartInstances] = useState<ChartInstance[]>([
    {
      id: 'chart1',
      type: 'bar',
      name: '图表1',
      config: {
        dataSeries: { xAxis: 'month', yAxis: 'sales' },
        styling: {
          title: '图表1：销售额',
          colorScheme: 'business_blue_gray',
          showLegend: true,
          legendPosition: 'top',
          showGridLines: true,
          showDataLabels: false,
          dataLabelFormat: '1位小数'
        },
        layout: {
          showAxisLabels: true,
          xAxisLabel: '',
          yAxisLabel: ''
        }
      }
    }
  ])
  const [activeChartId, setActiveChartId] = useState('chart1')
  
  // 全局配置状态
  const [globalConfig] = useState({
    outputFormat: 'png' as 'png' | 'svg' | 'jpg',
    resolution: '300dpi' as '150dpi' | '300dpi',
    baseStyle: 'business' as 'business' | 'simple' | 'highlight',
    allowOverride: true,
    unifiedSize: true
  })
  
  // 图表类型选择状态 - 恢复原版风格
  const [recommendedChartTypes, setRecommendedChartTypes] = useState<string[]>(['bar', 'line'])
  
  // 兼容旧的状态（逐步迁移）
  const [selectedChartTypes, setSelectedChartTypes] = useState<string[]>(['bar'])
  const [chartConfig, setChartConfig] = useState({
    title: '数据图表',
    colorScheme: 'business_blue_gray',
    resolution: '300dpi',
    showAxisLabels: true,
    outputFormat: 'png'
  })
  const [dataSeries, setDataSeries] = useState({
    xAxis: 'month',
    yAxis: 'sales'
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
  
  // Excel解析数据状态
  const [excelParsedData, setExcelParsedData] = useState<Record<string, unknown> | null>(null)
  const [isParsingExcel, setIsParsingExcel] = useState(false)
  const [parsingError, setParsingError] = useState<string | null>(null)
  const [chartPreviewError, setChartPreviewError] = useState<string | null>(null)
  
  // 图表管理函数 - 更新为使用选中的图表类型
  const addNewChart = useCallback((chartType: string) => {
    
    const newChartId = `chart${chartInstances.length + 1}`
    
    const newChart: ChartInstance = {
      id: newChartId,
      type: chartType,
      name: `图表${chartInstances.length + 1}`,
      config: {
        dataSeries: { xAxis: dataSeries.xAxis, yAxis: dataSeries.yAxis },
        styling: {
          title: `${getChartTypeName(chartType)}：${dataSeries.yAxis}`,
          colorScheme: chartConfig.colorScheme,
          showLegend: true,
          legendPosition: 'top',
          showGridLines: true,
          showDataLabels: false,
          dataLabelFormat: '1位小数'
        },
        layout: {
          showAxisLabels: true,
          xAxisLabel: '',
          yAxisLabel: ''
        }
      }
    }
    
    setChartInstances(prev => [...prev, newChart])
    setActiveChartId(newChartId)
  }, [chartInstances.length, dataSeries, chartConfig.colorScheme])
  
  const removeChart = useCallback((chartId: string) => {
    if (chartInstances.length === 1) {
      alert('至少需要保留一个图表')
      return
    }
    
    setChartInstances(prev => {
      const filtered = prev.filter(chart => chart.id !== chartId)
      // 重新命名图表
      return filtered.map((chart, index) => ({
        ...chart,
        id: `chart${index + 1}`,
        name: `图表${index + 1}`
      }))
    })
    
    // 如果删除的是当前图表，切换到第一个图表
    if (activeChartId === chartId) {
      setActiveChartId('chart1')
    }
  }, [chartInstances.length, activeChartId])
  
    
    
    
  // Excel数据解析函数 - 增强错误处理
  const parseExcelData = useCallback(async (filePath: string) => {
    if (!filePath) {
      console.warn('Excel文件路径为空，跳过解析')
      return null
    }
    
    setIsParsingExcel(true)
    setParsingError(null)
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/files/parse-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath, chart_type: 'bar' }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Excel数据解析失败')
      }
      
      const data = result.data
      
      // 数据格式验证
      if (!data.chart_data || !data.chart_data.raw_data) {
        throw new Error('Excel数据格式不正确，缺少必要的数据字段')
      }
      
      setExcelParsedData(data)
      
      // 智能设置默认的数据系列选择
      if (data.chart_data && data.chart_data.raw_data) {
        const rawData = data.chart_data.raw_data
        if (rawData.data_types && rawData.columns) {
          const dataTypes = rawData.data_types as Record<string, string>
          const columns = rawData.columns as string[]
          
          // 寻找第一个分类列作为X轴
          const categoricalColumn = columns.find(col => 
            dataTypes[col] === 'string' || dataTypes[col] === 'category'
          ) || columns[0]
          
          // 寻找第一个数值列作为Y轴
          const numericColumn = columns.find(col => dataTypes[col] === 'numeric') || columns[1]
          
          setDataSeries({
            xAxis: categoricalColumn,
            yAxis: numericColumn
          })
          
          // 智能设置图表类型选择
          const numericColumns = columns.filter(col => dataTypes[col] === 'numeric')
          const categoricalColumns = columns.filter(col => 
            dataTypes[col] === 'string' || dataTypes[col] === 'category'
          )
          
          const recommendations = []
          if (categoricalColumns.length >= 1 && numericColumns.length >= 1) {
            recommendations.push('bar', 'line')
            if (numericColumns.length === 1) {
              recommendations.push('pie')
            }
          }
          if (numericColumns.length >= 2) {
            recommendations.push('scatter', 'area')
          }
          
          const uniqueRecommendations = [...new Set(recommendations)]
          if (uniqueRecommendations.length > 0) {
            setSelectedChartTypes(uniqueRecommendations.slice(0, 2))
            setRecommendedChartTypes(uniqueRecommendations.slice(0, 4))
          }
        }
      }
      
      return data
    } catch (error) {
      console.error('Excel数据解析失败:', error)
      const errorMessage = error instanceof Error ? error.message : 'Excel数据解析失败'
      setParsingError(errorMessage)
      
      // 静默失败，不影响用户流程，但记录错误
      setTimeout(() => {
        setParsingError(null)
      }, 5000)
      
      return null
    } finally {
      setIsParsingExcel(false)
    }
  }, [])
  
  // 根据Excel数据智能推断数据系列选项 - 增强错误处理
  const getDataSeriesOptions = useCallback(() => {
    try {
      if (!excelParsedData || !excelParsedData.chart_data) {
        return {
          xAxis: ['month', 'department', 'product', 'region'],
          yAxis: ['sales', 'growth', 'quantity', 'profit']
        }
      }
      
      const chartData = excelParsedData.chart_data as any
      const rawData = chartData.raw_data
      
      if (!rawData || !rawData.data_types || !rawData.columns) {
        return {
          xAxis: ['month', 'department', 'product', 'region'],
          yAxis: ['sales', 'growth', 'quantity', 'profit']
        }
      }
    
    const dataTypes = rawData.data_types as Record<string, string>
    const columns = rawData.columns as string[]
    
    // 分析数据列，推断合适的X轴和Y轴选项
    const xAxisOptions: string[] = []
    const yAxisOptions: string[] = []
    
    columns.forEach(column => {
      const dataType = dataTypes[column]
      if (dataType === 'string' || dataType === 'category') {
        xAxisOptions.push(column)
      } else if (dataType === 'numeric') {
        yAxisOptions.push(column)
      }
    })
    
    // 如果没有推断出合适的选项，使用默认选项
    return {
      xAxis: xAxisOptions.length > 0 ? xAxisOptions : ['month', 'department', 'product', 'region'],
      yAxis: yAxisOptions.length > 0 ? yAxisOptions : ['sales', 'growth', 'quantity', 'profit']
    }
    } catch (error) {
      console.error('获取数据系列选项失败:', error)
      // 返回默认选项
      return {
        xAxis: ['month', 'department', 'product', 'region'],
        yAxis: ['sales', 'growth', 'quantity', 'profit']
      }
    }
  }, [excelParsedData])
  
  // 获取用于图表预览的数据
  const getPreviewData = useCallback(() => {
    if (!excelParsedData || !excelParsedData.chart_data) {
      // 使用默认mock数据
      return {
        month: ['1月', '2月', '3月', '4月', '5月', '6月'],
        department: ['销售', '市场', '技术', '运营'],
        product: ['产品A', '产品B', '产品C', '产品D'],
        region: ['华北', '华东', '华南', '西部'],
        sales: [120, 190, 300, 240, 280, 320],
        growth: [5, 8, 12, 7, 9, 15],
        quantity: [1200, 1900, 3000, 2400, 2800, 3200],
        profit: [12, 19, 30, 24, 28, 32]
      }
    }
    
    // 使用真实的Excel数据 - 转换API响应格式为预览需要的格式
    const chartData = excelParsedData.chart_data as any
    const rawData = chartData.raw_data
    if (!rawData || !rawData.columns || !rawData.data) {
      // 如果数据格式不符合预期，返回默认数据
      return {
        month: ['1月', '2月', '3月', '4月', '5月', '6月'],
        sales: [120, 190, 300, 240, 280, 320]
      }
    }
    
    // 将行列式数据转换为列式数据
    const columnData: Record<string, any[]> = {}
    const { columns, data } = rawData
    
    // 初始化每一列的数组
    columns.forEach((col: string) => {
      columnData[col] = []
    })
    
    // 填充数据
    data.forEach((row: any[]) => {
      row.forEach((value: any, index: number) => {
        if (columns[index]) {
          columnData[columns[index]].push(value)
        }
      })
    })
    
    return columnData
  }, [excelParsedData])
  
  // 图表预览引用 - 支持多图表
  const chartRefs = useRef<Record<string, any>>({})
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({})
  const [activePreviewIndex, setActivePreviewIndex] = useState(0)
  
  // 个性配置面板状态
  const [configSection, setConfigSection] = useState<'data' | 'styling' | 'layout' | 'advanced'>('styling')
  
  // 当前图表配置状态（基于选中的图表类型）
  const [currentChartConfig, setCurrentChartConfig] = useState({
    dataSeries: {
      xAxis: dataSeries.xAxis,
      yAxis: dataSeries.yAxis,
      yAxis2: '' // 组合图表用
    },
    styling: {
      title: chartConfig.title,
      colorScheme: chartConfig.colorScheme,
      showLegend: true,
      legendPosition: 'top' as 'top' | 'right' | 'bottom' | 'hidden',
      showGridLines: true,
      showDataLabels: false,
      dataLabelFormat: '1位小数' as '整数' | '1位小数' | '2位小数' | '百分比'
    },
    layout: {
      showAxisLabels: chartConfig.showAxisLabels,
      xAxisLabel: '',
      yAxisLabel: ''
    }
  })
  
  // 更新当前图表配置
  const updateCurrentChartConfig = useCallback((section: string, field: string, value: any) => {
    setCurrentChartConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }))
  }, [])
  
  // 获取数据系列选项
  const dataOptions = getDataSeriesOptions()

  // 获取图表类型中文名称
  const getChartTypeName = (chartType: string): string => {
    const typeNames: Record<string, string> = {
      'bar': '柱状图',
      'line': '折线图', 
      'pie': '饼图',
      'area': '面积图',
      'scatter': '散点图',
      'doughnut': '环形图',
      'bar_bar': '双柱图',
      'line_line': '双折线图',
      'bar_line': '柱线图',
      'bar_area': '柱面积图',
      'line_area': '折线面积图'
    }
    return typeNames[chartType] || chartType
  }

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

  // 颜色方案变化时强制更新图表
  useEffect(() => {
    if (currentStep !== 'chart_generation' || selectedChartTypes.length === 0) return
    
    console.log('🎨 颜色方案变化，强制重新创建图表')
    
    // 销毁所有现有图表
    Object.keys(chartRefs.current).forEach(chartKey => {
      if (chartRefs.current[chartKey]) {
        chartRefs.current[chartKey].destroy()
        delete chartRefs.current[chartKey]
      }
    })
  }, [chartConfig.colorScheme])

  // 图表实时预览 - 基于选中的图表类型
  useEffect(() => {
    if (currentStep !== 'chart_generation' || selectedChartTypes.length === 0) return

    // 使用真实Excel数据，如果没有则使用默认数据
    const previewData = getPreviewData()

    // 配色映射
    const colorSchemes = {
      business_blue_gray: {
        background: 'rgba(59, 130, 246, 0.6)',
        border: 'rgba(59, 130, 246, 1)'
      },
      professional_black_gray: {
        background: 'rgba(75, 85, 99, 0.6)',
        border: 'rgba(75, 85, 99, 1)'
      },
      modern_blue: {
        background: 'rgba(37, 99, 235, 0.6)',
        border: 'rgba(37, 99, 235, 1)'
      },
      elegant_purple: {
        background: 'rgba(147, 51, 234, 0.6)',
        border: 'rgba(147, 51, 234, 1)'
      },
      vibrant_teal_green: {
        background: 'rgba(20, 184, 166, 0.6)',
        border: 'rgba(20, 184, 166, 1)'
      }
    }

    // 为每个选中的图表类型创建图表
    selectedChartTypes.forEach((chartType, index) => {
      const canvasId = `chart-canvas-${chartType}`
      const canvas = canvasRefs.current[canvasId]
      
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          try {
            // 使用全局配色方案
            const colorSchemeName = chartConfig.colorScheme
            const colors = colorSchemes[colorSchemeName as keyof typeof colorSchemes] || colorSchemes.business_blue_gray
            
            // 根据图表类型调整数据配置
            let chartConfig_data: any
            
            if (chartType === 'pie' || chartType === 'doughnut') {
              chartConfig_data = {
                type: chartType,
                data: {
                  labels: previewData[dataSeries.xAxis as keyof typeof previewData] || [],
                  datasets: [{
                    label: dataSeries.yAxis,
                    data: previewData[dataSeries.yAxis as keyof typeof previewData] || [],
                    backgroundColor: [
                      'rgba(59, 130, 246, 0.8)',
                      'rgba(16, 185, 129, 0.8)',
                      'rgba(245, 158, 11, 0.8)',
                      'rgba(239, 68, 68, 0.8)',
                      'rgba(139, 92, 246, 0.8)',
                      'rgba(236, 72, 153, 0.8)'
                    ],
                    borderWidth: 2
                  }]
                }
              }
            } else if (chartType === 'area') {
              chartConfig_data = {
                type: 'line',
                data: {
                  labels: previewData[dataSeries.xAxis as keyof typeof previewData] || [],
                  datasets: [{
                    label: dataSeries.yAxis,
                    data: previewData[dataSeries.yAxis as keyof typeof previewData] || [],
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                  }]
                }
              }
            } else if (chartType.includes('_')) {
              // 处理组合图表
              const [type1, type2] = chartType.split('_')
              const isDualYAxis = type1 !== type2
              
              let datasets = []
              
              // 第一个数据系列
              datasets.push({
                label: dataSeries.yAxis,
                data: previewData[dataSeries.yAxis as keyof typeof previewData] || [],
                backgroundColor: type1 === 'bar' ? colors.background : (type1 === 'area' ? colors.background : 'transparent'),
                borderColor: colors.border,
                borderWidth: 2,
                type: type1 === 'area' ? 'line' : type1,
                fill: type1 === 'area' ? (type1 === 'area' ? 'origin' : false) : false,
                tension: type1 === 'area' ? 0.4 : 0,
                yAxisID: 'y'
              })
              
              // 第二个数据系列（如果有第二Y轴数据）
              const secondYAxis = currentChartConfig?.dataSeries?.yAxis2 || 
                               (dataOptions.yAxis.length > 1 ? dataOptions.yAxis[1] : null)
              
              if (secondYAxis && secondYAxis !== dataSeries.yAxis) {
                const colors2 = colorSchemes.secondary || colorSchemes.business_blue_gray
                datasets.push({
                  label: secondYAxis,
                  data: previewData[secondYAxis as keyof typeof previewData] || [],
                  backgroundColor: type2 === 'bar' ? colors2.background : (type2 === 'area' ? colors2.background : 'transparent'),
                  borderColor: colors2.border,
                  borderWidth: 2,
                  type: type2 === 'area' ? 'line' : type2,
                  fill: type2 === 'area' ? 'origin' : false,
                  tension: type2 === 'area' ? 0.4 : 0,
                  yAxisID: isDualYAxis ? 'y1' : 'y'
                })
              }
              
              chartConfig_data = {
                type: type1,
                data: {
                  labels: previewData[dataSeries.xAxis as keyof typeof previewData] || [],
                  datasets: datasets
                }
              }
            } else {
              chartConfig_data = {
                type: chartType,
                data: {
                  labels: previewData[dataSeries.xAxis as keyof typeof previewData] || [],
                  datasets: [{
                    label: dataSeries.yAxis,
                    data: previewData[dataSeries.yAxis as keyof typeof previewData] || [],
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 2
                  }]
                }
              }
            }
            
            // 设置通用选项
            chartConfig_data.options = {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: chartType !== 'pie' && chartType !== 'doughnut',
                  position: 'top'
                },
                title: {
                  display: true,
                  text: `${getChartTypeName(chartType)} - ${chartConfig.title}`
                }
              },
              scales: chartType !== 'pie' && chartType !== 'doughnut' ? 
                (chartType.includes('_') && chartType !== 'area' ? {
                  // 组合图表双Y轴配置
                  y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    grid: {
                      display: chartConfig.showAxisLabels,
                      color: 'rgba(0, 0, 0, 0.1)'
                    }
                  },
                  y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grid: {
                      drawOnChartArea: false
                    }
                  },
                  x: { 
                    grid: {
                      display: chartConfig.showAxisLabels,
                      color: 'rgba(0, 0, 0, 0.1)'
                    }
                  }
                } : {
                  // 普通图表单Y轴配置
                  y: { 
                    beginAtZero: true,
                    grid: {
                      display: chartConfig.showAxisLabels,
                      color: 'rgba(0, 0, 0, 0.1)'
                    }
                  },
                  x: { 
                    grid: {
                      display: chartConfig.showAxisLabels,
                      color: 'rgba(0, 0, 0, 0.1)'
                    }
                  }
                }) 
              : {}
            }

            // 创建图表实例
            chartRefs.current[chartType] = new Chart(ctx, chartConfig_data)
            
          } catch (error) {
            console.error(`创建 ${getChartTypeName(chartType)} 图表失败:`, error)
            const errorMessage = error instanceof Error ? error.message : `${getChartTypeName(chartType)} 图表预览创建失败`
            setChartPreviewError(errorMessage)
          }
        }
      }
    })

    // 清理函数
    return () => {
      Object.keys(chartRefs.current).forEach(chartKey => {
        if (chartRefs.current[chartKey]) {
          chartRefs.current[chartKey].destroy()
          delete chartRefs.current[chartKey]
        }
      })
    }
  }, [currentStep, selectedChartTypes, dataSeries, chartConfig.colorScheme, chartConfig.title, chartConfig.showAxisLabels])

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
          
          // 解析Excel数据用于实时预览
          if (result.data.file_info && result.data.file_info.file_path) {
            // 重置相关状态
            setExcelParsedData(null)
            setParsingError(null)
            setChartPreviewError(null)
            setDataSeries({ xAxis: 'month', yAxis: 'sales' })
            
            parseExcelData(result.data.file_info.file_path).catch(error => {
              console.error('Excel数据解析失败:', error)
              // 静默失败，不影响用户上传流程
            })
          }
          
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
    console.log('chartInstances:', chartInstances)
    
    if (!uploadedFileInfo) {
      console.log('No uploaded file info')
      setError('请先上传文件')
      return
    }
    
    if (chartInstances.length === 0) {
      console.log('No chart instances')
      setError('请至少添加一个图表')
      return
    }

    setIsLoading(true)
    setError('')
    console.log('Starting chart generation...')

    try {
      // 提取所有图表实例的类型
      const chartTypes = chartInstances.map(chart => chart.type)
      
      // 使用正确的API端点生成选中的图表
      const response = await fetch('http://localhost:8000/api/v1/charts/previews/selected-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_code: accessCode,
          file_path: uploadedFileInfo.file_path,
          selected_chart_types: chartTypes,
          width: 800,
          height: 600,
          format: globalConfig.outputFormat,
          chart_config: {
            color_scheme: globalConfig.baseStyle === 'business' ? 'business_blue_gray' : 
                         globalConfig.baseStyle === 'simple' ? 'professional_black_gray' : 'vibrant_teal_green',
            title: chartConfig.title,
            show_axis_labels: true,
            output_format: globalConfig.outputFormat,
            resolution: globalConfig.resolution
          }
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

      // 转换为前端显示格式，使用图表实例的名称
      const generatedCharts = charts.map((chart: {chart_type: string; chart_name?: string; chart_data: string; format?: string}, index: number) => {
        const chartInstance = chartInstances[index] || chartInstances[0]
        return {
          id: `${chartInstance.id}_${chart.chart_type}`,
          type: chart.chart_type,
          title: chartInstance.name,
          url: chart.chart_data.startsWith('data:image') ? chart.chart_data : `data:image/png;base64,${chart.chart_data}`,
          format: chart.format || globalConfig.outputFormat
        }
      })

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
      
      // 如果是新增的图表类型，添加到图表实例中
      if (!prev.includes(type) && !chartInstances.some(chart => chart.type === type)) {
        setTimeout(() => {
          addNewChart(type)
        }, 100)
      }
      
      // 如果是取消选择的图表类型，从图表实例中移除
      if (prev.includes(type)) {
        const chartToRemove = chartInstances.find(chart => chart.type === type)
        if (chartToRemove) {
          setTimeout(() => {
            removeChart(chartToRemove.id)
          }, 100)
        }
      }
      
      return newSelection
    })
  }

  const resetState = () => {
    setUploadedFile(null)
    setUploadedFileInfo(null)
    setExcelParsedData(null)
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
              <div className={`${isMobile ? 'space-y-6' : 'grid grid-cols-12 gap-6'}`}>
                {/* 左侧图表类型选择面板 */}
                <div className={isMobile ? '' : 'col-span-12 lg:col-span-4'}>
                  <div className="professional-card p-6 h-full flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6 flex-shrink-0">图表类型选择</h3>
                    
                    {/* 配置内容滚动区域 */}
                    <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-6">
                    
                    {/* 智能推荐区域 */}
                    {recommendedChartTypes.length > 0 && (
                      <div className="animate-slide-up">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm">🤖</span>
                          <label className="text-sm font-medium text-gray-700">智能推荐</label>
                          <span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded animate-pulse-slow">基于数据特征</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {recommendedChartTypes.map((type, index) => (
                            <button
                              key={`rec-${type}`}
                              onClick={() => handleChartTypeToggle(type)}
                              className={`p-3 border rounded-lg text-center transition-all duration-200 transform hover:scale-105 ${
                                selectedChartTypes.includes(type)
                                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
                              }`}
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="font-medium text-sm">{getChartTypeName(type)}</div>
                              <div className="text-xs text-gray-500 mt-1 flex items-center justify-center">
                                <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mr-1"></span>
                                推荐
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* 基础图表区域 */}
                    <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm">📊</span>
                        <label className="text-sm font-medium text-gray-700">基础图表</label>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {type: 'bar', name: '柱状图', icon: '📊'},
                          {type: 'line', name: '折线图', icon: '📈'},
                          {type: 'pie', name: '饼图', icon: '🥧'},
                          {type: 'scatter', name: '散点图', icon: '⚡'},
                          {type: 'area', name: '面积图', icon: '📊'},
                          {type: 'radar', name: '雷达图', icon: '🎯'},
                          {type: 'table', name: '表格', icon: '📋'},
                          {type: 'doughnut', name: '环形图', icon: '🍩'}
                        ].map((chart, index) => (
                          <button
                            key={chart.type}
                            onClick={() => handleChartTypeToggle(chart.type)}
                            className={`p-3 border rounded-lg text-center transition-all duration-200 transform hover:scale-105 ${
                              selectedChartTypes.includes(chart.type)
                                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md ring-1 ring-blue-200'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
                            }`}
                            style={{ animationDelay: `${0.1 + index * 30}ms` }}
                          >
                            <div className="text-lg mb-1">{chart.icon}</div>
                            <div className="font-medium text-sm">{chart.name}</div>
                            <div className="text-xs mt-1">
                              {recommendedChartTypes.includes(chart.type) ? (
                                <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-xs">推荐</span>
                              ) : (
                                <span className="text-gray-400">基础</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* 组合图表区域 */}
                    <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm">📈</span>
                        <label className="text-sm font-medium text-gray-700">组合图表</label>
                        <span className="text-xs text-orange-500 bg-orange-100 px-2 py-1 rounded">高级</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {type: 'bar_line', name: '柱线图', icon: '📊📈', desc: '柱状+折线'},
                          {type: 'bar_area', name: '柱面积图', icon: '📊📈', desc: '柱状+面积'},
                          {type: 'bar_bar', name: '双柱图', icon: '📊📊', desc: '双Y轴'},
                          {type: 'line_area', name: '折线面积图', icon: '📈📈', desc: '折线+面积'},
                          {type: 'line_line', name: '双折线图', icon: '📈📈', desc: '双系列'}
                        ].map((chart, index) => (
                          <button
                            key={chart.type}
                            onClick={() => handleChartTypeToggle(chart.type)}
                            className={`p-3 border rounded-lg text-center transition-all duration-200 transform hover:scale-105 ${
                              selectedChartTypes.includes(chart.type)
                                ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md ring-1 ring-orange-200'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
                            }`}
                            style={{ animationDelay: `${0.2 + index * 40}ms` }}
                          >
                            <div className="text-sm mb-1">{chart.icon}</div>
                            <div className="font-medium text-sm">{chart.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{chart.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Excel数据解析状态 */}
                    {isParsingExcel && (
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm font-medium text-blue-700">正在解析Excel数据...</span>
                        </div>
                        <p className="text-xs text-blue-600">请稍候，我们正在分析您的数据结构</p>
                      </div>
                    )}
                    
                    {/* 数据解析错误反馈 */}
                    {parsingError && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium text-red-700">数据解析失败</span>
                        </div>
                        <p className="text-xs text-red-600">{parsingError}</p>
                        <p className="text-xs text-gray-500 mt-1">您仍可以继续使用默认数据进行配置</p>
                      </div>
                    )}
                    
                    {/* 图表预览错误反馈 */}
                    {chartPreviewError && (
                      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="h-4 w-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium text-yellow-700">预览生成失败</span>
                        </div>
                        <p className="text-xs text-yellow-600">{chartPreviewError}</p>
                        <p className="text-xs text-gray-500 mt-1">请检查数据格式或选择其他图表类型</p>
                      </div>
                    )}
                    
                    {/* 数据解析成功反馈 */}
                    {excelParsedData && !isParsingExcel && (
                      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">✅</span>
                          <span className="text-sm font-medium text-green-700">Excel数据解析成功</span>
                        </div>
                        <p className="text-xs text-green-600">
                          检测到 {excelParsedData.chart_data?.raw_data?.columns?.length || 0} 列数据，
                          已智能推荐数据系列选择
                        </p>
                      </div>
                    )}
                    
                    {/* 基础设置 */}
                    <div className="border-t pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm">⚙️</span>
                        <label className="text-sm font-medium text-gray-700">基础设置</label>
                      </div>
                      
                      {/* 图表标题 */}
                      <div className="mb-4">
                        <label className="block text-sm text-gray-600 mb-1">图表标题</label>
                        <input
                          type="text"
                          value={chartConfig.title}
                          onChange={(e) => setChartConfig(prev => ({...prev, title: e.target.value}))}
                          placeholder="输入图表标题"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      
                      {/* 输出设置 */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">输出格式</label>
                          <select 
                            value={chartConfig.outputFormat}
                            onChange={(e) => setChartConfig(prev => ({...prev, outputFormat: e.target.value}))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="png">PNG</option>
                            <option value="svg">SVG</option>
                            <option value="jpg">JPG</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">分辨率</label>
                          <select 
                            value={chartConfig.resolution}
                            onChange={(e) => setChartConfig(prev => ({...prev, resolution: e.target.value}))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="150dpi">150 DPI</option>
                            <option value="300dpi">300 DPI</option>
                            <option value="600dpi">600 DPI</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    </div>
                  </div>
                </div>
                
                {/* 右侧图表操作区域 */}
                <div className={isMobile ? '' : 'col-span-12 lg:col-span-8'}>
                  <div className="professional-card p-6 h-full flex flex-col">
                    {/* 图表类型标签切换 */}
                    <div className="mb-6 flex-shrink-0">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">图表预览</h3>
                        <span className="text-sm text-gray-500">
                          已选择 {selectedChartTypes.length} 个图表类型
                        </span>
                      </div>
                      
                      {/* 图表类型标签 */}
                      {selectedChartTypes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedChartTypes.map((chartType, index) => (
                            <button
                              key={chartType}
                              onClick={() => setActivePreviewIndex(index)}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 transform hover:scale-105 relative overflow-hidden group ${
                                activePreviewIndex === index
                                  ? 'bg-primary-600 text-white shadow-lg ring-2 ring-primary-300'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                              }`}
                            >
                              <span className="relative z-10 flex items-center">
                                {getChartTypeName(chartType)}
                                {activePreviewIndex === index && (
                                  <span className="ml-2 animate-pulse">●</span>
                                )}
                              </span>
                              {activePreviewIndex === index && (
                                <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-700 animate-pulse-slow"></div>
                              )}
                              {!activePreviewIndex === index && (
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm animate-pulse">
                          <span className="inline-block mr-2">📊</span>
                          请在左侧选择图表类型
                        </div>
                      )}
                    </div>
                    
                    {/* 单图表预览区域 */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex-1">
                      {selectedChartTypes.length > 0 && activePreviewIndex < selectedChartTypes.length ? (
                        <div className="space-y-4">
                          {/* 当前图表信息 */}
                          <div className="text-center">
                            <h4 className="text-lg font-semibold text-gray-800">
                              {getChartTypeName(selectedChartTypes[activePreviewIndex])} 预览
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                              {chartConfig.title} · {dataSeries.xAxis} vs {dataSeries.yAxis}
                            </p>
                          </div>
                          
                          {/* 图表预览区域 */}
                          <div className="relative h-96 w-full bg-gradient-to-br from-gray-50 to-white rounded-lg border-2 border-dashed border-gray-200 overflow-hidden">
                            {selectedChartTypes.map((chartType, index) => (
                              <div
                                key={chartType}
                                className={`absolute inset-0 transition-all duration-300 ease-in-out ${
                                  activePreviewIndex === index 
                                    ? 'opacity-100 scale-100' 
                                    : 'opacity-0 scale-95 pointer-events-none'
                                }`}
                              >
                                <canvas
                                  ref={(el) => {
                                    canvasRefs.current[`chart-canvas-${chartType}`] = el
                                  }}
                                  className="w-full h-full p-2"
                                  id={`chart-canvas-${chartType}`}
                                ></canvas>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className={`bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4 ${
                            isMobile ? 'w-12 h-12' : 'w-16 h-16'
                          }`}>
                            <span className={`text-gray-400 ${isMobile ? 'text-lg' : 'text-xl'}`}>📊</span>
                          </div>
                          <p className={`text-gray-500 ${isMobile ? 'text-sm' : ''}`}>请在左侧选择图表类型</p>
                        </div>
                      )}
                    </div>
                    
                    {/* 单图表操作区域 */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <h4 className="text-sm font-medium text-gray-800 mb-3">
                        {selectedChartTypes[activePreviewIndex] ? getChartTypeName(selectedChartTypes[activePreviewIndex]) + ' 个性配置' : '图表配置'}
                      </h4>
                      
                      {/* 配置标签切换 */}
                      <div className="flex gap-2 mb-4">
                        {[
                          { id: 'styling', name: '样式设置', icon: '🎨' },
                          { id: 'data', name: '数据系列', icon: '📊' },
                          { id: 'layout', name: '布局选项', icon: '⚙️' },
                          { id: 'advanced', name: '高级设置', icon: '🔧' }
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setConfigSection(tab.id as any)}
                            className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                              configSection === tab.id
                                ? 'bg-white border-primary-500 text-primary-700 border shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <span className="mr-1">{tab.icon}</span>
                            {tab.name}
                          </button>
                        ))}
                      </div>
                      
                      {/* 配置内容 */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        {configSection === 'styling' && (
                          <div className="space-y-4">
                            {/* 图表标题 */}
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">图表标题</label>
                              <input
                                type="text"
                                value={currentChartConfig.styling.title}
                                onChange={(e) => updateCurrentChartConfig('styling', 'title', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="输入图表标题"
                              />
                            </div>
                            
                            {/* 配色方案 */}
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">配色方案</label>
                              <select
                                value={currentChartConfig.styling.colorScheme}
                                onChange={(e) => {
                                  updateCurrentChartConfig('styling', 'colorScheme', e.target.value)
                                  setChartConfig(prev => ({...prev, colorScheme: e.target.value}))
                                }}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                              >
                                <option value="business_blue_gray">商务蓝灰</option>
                                <option value="professional_black_gray">专业黑灰</option>
                                <option value="modern_blue">现代蓝色</option>
                                <option value="elegant_purple">优雅紫色</option>
                                <option value="vibrant_teal_green">活力青绿</option>
                              </select>
                            </div>
                            
                            {/* 图例设置 */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">显示图例</label>
                                <select
                                  value={currentChartConfig.styling.showLegend.toString()}
                                  onChange={(e) => updateCurrentChartConfig('styling', 'showLegend', e.target.value === 'true')}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                >
                                  <option value="true">显示</option>
                                  <option value="false">隐藏</option>
                                </select>
                              </div>
                              {currentChartConfig.styling.showLegend && (
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">图例位置</label>
                                  <select
                                    value={currentChartConfig.styling.legendPosition}
                                    onChange={(e) => updateCurrentChartConfig('styling', 'legendPosition', e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                  >
                                    <option value="top">顶部</option>
                                    <option value="right">右侧</option>
                                    <option value="bottom">底部</option>
                                  </select>
                                </div>
                              )}
                            </div>
                            
                            {/* 网格线设置 */}
                            <div>
                              <label className="flex items-center text-xs text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={currentChartConfig.styling.showGridLines}
                                  onChange={(e) => updateCurrentChartConfig('styling', 'showGridLines', e.target.checked)}
                                  className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                显示网格线
                              </label>
                            </div>
                          </div>
                        )}
                        
                        {configSection === 'data' && (
                          <div className="space-y-4">
                            {/* X轴数据 */}
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">X轴数据</label>
                              <select
                                value={currentChartConfig.dataSeries.xAxis}
                                onChange={(e) => {
                                  updateCurrentChartConfig('dataSeries', 'xAxis', e.target.value)
                                  setDataSeries(prev => ({...prev, xAxis: e.target.value}))
                                }}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                              >
                                {dataOptions.xAxis.map(option => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            </div>
                            
                            {/* Y轴数据 */}
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Y轴数据</label>
                              <select
                                value={currentChartConfig.dataSeries.yAxis}
                                onChange={(e) => {
                                  updateCurrentChartConfig('dataSeries', 'yAxis', e.target.value)
                                  setDataSeries(prev => ({...prev, yAxis: e.target.value}))
                                }}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                              >
                                {dataOptions.yAxis.map(option => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            </div>
                            
                            {/* 组合图表第二Y轴 */}
                            {(selectedChartTypes[activePreviewIndex]?.includes('_') || 
                              selectedChartTypes[activePreviewIndex] === 'bar_line' || 
                              selectedChartTypes[activePreviewIndex] === 'bar_area') && (
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">第二Y轴数据（可选）</label>
                                <select
                                  value={currentChartConfig.dataSeries.yAxis2}
                                  onChange={(e) => updateCurrentChartConfig('dataSeries', 'yAxis2', e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                >
                                  <option value="">无</option>
                                  {dataOptions.yAxis
                                    .filter(option => option !== currentChartConfig.dataSeries.yAxis)
                                    .map(option => (
                                      <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {configSection === 'layout' && (
                          <div className="space-y-4">
                            {/* 坐标轴标签 */}
                            <div>
                              <label className="flex items-center text-xs text-gray-600 mb-2">
                                <input
                                  type="checkbox"
                                  checked={currentChartConfig.layout.showAxisLabels}
                                  onChange={(e) => {
                                    updateCurrentChartConfig('layout', 'showAxisLabels', e.target.checked)
                                    setChartConfig(prev => ({...prev, showAxisLabels: e.target.checked}))
                                  }}
                                  className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                显示坐标轴标签
                              </label>
                            </div>
                            
                            {currentChartConfig.layout.showAxisLabels && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">X轴标签</label>
                                  <input
                                    type="text"
                                    value={currentChartConfig.layout.xAxisLabel}
                                    onChange={(e) => updateCurrentChartConfig('layout', 'xAxisLabel', e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="X轴名称"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Y轴标签</label>
                                  <input
                                    type="text"
                                    value={currentChartConfig.layout.yAxisLabel}
                                    onChange={(e) => updateCurrentChartConfig('layout', 'yAxisLabel', e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Y轴名称"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {configSection === 'advanced' && (
                          <div className="space-y-4">
                            {/* 数据标签 */}
                            <div>
                              <label className="flex items-center text-xs text-gray-600 mb-2">
                                <input
                                  type="checkbox"
                                  checked={currentChartConfig.styling.showDataLabels}
                                  onChange={(e) => updateCurrentChartConfig('styling', 'showDataLabels', e.target.checked)}
                                  className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                显示数据标签
                              </label>
                            </div>
                            
                            {currentChartConfig.styling.showDataLabels && (
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">数据格式</label>
                                <select
                                  value={currentChartConfig.styling.dataLabelFormat}
                                  onChange={(e) => updateCurrentChartConfig('styling', 'dataLabelFormat', e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                >
                                  <option value="整数">整数</option>
                                  <option value="1位小数">1位小数</option>
                                  <option value="2位小数">2位小数</option>
                                  <option value="百分比">百分比</option>
                                </select>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 操作按钮 - 固定在卡片底部 */}
                    <div className={`mt-auto flex gap-3 ${isMobile ? 'flex-col' : 'flex-col sm:flex-row'} flex-shrink-0`}>
                      <button
                        onClick={handleGenerateCharts}
                        disabled={isLoading || selectedChartTypes.length === 0}
                        className={`professional-btn professional-btn-primary flex-1 ${isMobile ? 'py-4' : ''}`}
                      >
                        {isLoading ? (
                          <>
                            <div className="loading-spinner mr-2"></div>
                            生成图表
                          </>
                        ) : (
                          `生成 ${selectedChartTypes.length} 个图表`
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