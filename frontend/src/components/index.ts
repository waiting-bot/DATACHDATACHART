// Chart Display Components
export { default as ChartDisplay } from './ChartDisplay'
export { default as ChartTypeSelector } from './ChartTypeSelector'
export { default as ChartPreview } from './ChartPreview'

// Types (re-export from types to avoid duplication)
export type { 
  GeneratedChart as ChartData,
  PreviewChart 
} from '@/types'

// Props types
export interface ChartDisplayProps {
  charts: import('@/types').GeneratedChart[]
  accessCode: string
  onChartSelect?: (chart: import('@/types').GeneratedChart) => void
  onDownload?: (chart: import('@/types').GeneratedChart) => void
  remainingUsage?: number
}

export interface ChartTypeSelectorProps {
  availableTypes?: string[]
  selectedTypes?: string[]
  onSelectionChange?: (types: string[]) => void
  onTypeSelect?: (type: string) => void
  multiSelect?: boolean
  disabled?: boolean
  showPreviews?: boolean
}

export interface ChartPreviewProps {
  filePath?: string
  accessCode?: string
  chartTypes?: string[]
  onPreviewGenerated?: (previews: import('@/types').PreviewChart[]) => void
  onPreviewError?: (error: string) => void
  autoGenerate?: boolean
  className?: string
}