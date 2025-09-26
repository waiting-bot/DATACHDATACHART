import { File as FileType, FileValidationRule, ValidationResult, ValidationError } from '../types'

/**
 * 验证文件是否符合要求
 */
export function validateFile(file: File, rules: FileValidationRule): ValidationResult {
  const errors: ValidationError[] = []

  // 检查文件大小
  if (rules.maxSize && file.size > rules.maxSize) {
    errors.push({
      field: 'size',
      message: `文件大小不能超过 ${formatFileSize(rules.maxSize)}`,
    })
  }

  // 检查文件类型
  if (rules.allowedTypes && !rules.allowedTypes.includes(file.type)) {
    errors.push({
      field: 'type',
      message: `不支持的文件类型: ${file.type}`,
    })
  }

  // 检查文件扩展名
  if (rules.allowedExtensions) {
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    if (!rules.allowedExtensions.includes(extension)) {
      errors.push({
        field: 'extension',
        message: `不支持的文件扩展名: ${extension}`,
      })
    }
  }

  // 自定义验证
  if (rules.custom) {
    const customResult = rules.custom(file)
    if (customResult !== true) {
      errors.push({
        field: 'custom',
        message: typeof customResult === 'string' ? customResult : '文件验证失败',
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

/**
 * 检查文件是否为Excel文件
 */
export function isExcelFile(file: File): boolean {
  const excelTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
  ]
  
  const excelExtensions = ['.xlsx', '.xls']
  
  return (
    excelTypes.includes(file.type) ||
    excelExtensions.includes(getFileExtension(file.name).toLowerCase())
  )
}

/**
 * 生成安全的文件名
 */
export function generateSecureFilename(originalName: string): string {
  const extension = getFileExtension(originalName)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  
  return `${timestamp}_${random}.${extension}`
}

/**
 * 创建文件下载链接
 */
export function createDownloadUrl(content: string, filename: string): string {
  const blob = base64ToBlob(content, 'image/png')
  return URL.createObjectURL(blob)
}

/**
 * Base64转Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  
  const byteArray = new Uint8Array(byteNumbers)
  
  return new Blob([byteArray], { type: mimeType })
}

/**
 * 下载文件
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'image/png'): void {
  const url = createDownloadUrl(content, filename)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy text: ', err)
    return false
  }
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 深度克隆
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }
  
  return obj
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = new Date(date)
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 获取相对时间
 */
export function getRelativeTime(date: Date | string): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMinutes < 1) {
    return '刚刚'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays < 30) {
    return `${diffDays}天前`
  } else {
    return formatDate(past, 'YYYY-MM-DD')
  }
}

/**
 * 生成随机字符串
 */
export function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 验证访问码格式
 */
export function isValidAccessCode(code: string): boolean {
  // 访问码格式：字母数字组合，长度6-20位
  const codeRegex = /^[a-zA-Z0-9]{6,20}$/
  return codeRegex.test(code)
}

/**
 * 获取环境变量
 */
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key]
  return value || defaultValue || ''
}

/**
 * 检查是否为开发环境
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV || getEnvVar('VITE_DEV_MODE') === 'true'
}

/**
 * 检查是否为生产环境
 */
export function isProduction(): boolean {
  return import.meta.env.PROD || getEnvVar('VITE_DEV_MODE') === 'false'
}

/**
 * 日志工具
 */
export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment()) {
      console.debug(`[DEBUG] ${message}`, ...args)
    }
  },
  
  info: (message: string, ...args: any[]) => {
    console.info(`[INFO] ${message}`, ...args)
  },
  
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args)
  },
  
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args)
  },
}

// 默认导出
export default {
  validateFile,
  formatFileSize,
  getFileExtension,
  isExcelFile,
  generateSecureFilename,
  createDownloadUrl,
  base64ToBlob,
  downloadFile,
  copyToClipboard,
  debounce,
  throttle,
  deepClone,
  formatDate,
  getRelativeTime,
  generateRandomString,
  isValidEmail,
  isValidAccessCode,
  getEnvVar,
  isDevelopment,
  isProduction,
  logger,
}