import React, { useState, useRef, useCallback } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle, X, RefreshCw } from 'lucide-react'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  onUploadSuccess?: (response: any) => void
  onUploadError?: (error: string) => void
  accessCode?: string
  maxFileSize?: number // in bytes
  acceptedTypes?: string[]
  disabled?: boolean
}

interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onUploadSuccess,
  onUploadError,
  accessCode = '',
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = ['.xlsx', '.xls'],
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'validating' | 'uploading' | 'success' | 'error'>('idle')
  const [fileName, setFileName] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [retryCount, setRetryCount] = useState(0)
  const [fileInfo, setFileInfo] = useState<{ size: string; type: string } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 验证文件类型
  const validateFileType = useCallback((file: File): boolean => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    return acceptedTypes.includes(fileExtension)
  }, [acceptedTypes])

  // 验证文件大小
  const validateFileSize = useCallback((file: File): boolean => {
    return file.size <= maxFileSize
  }, [maxFileSize])

  // 格式化文件大小
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  // 获取文件类型显示
  const getFileTypeDisplay = useCallback((file: File): string => {
    const extension = file.name.split('.').pop()?.toUpperCase() || 'FILE'
    return extension
  }, [])

  // 处理文件选择
  const handleFileSelect = useCallback((file: File) => {
    setErrorMessage('')
    setUploadStatus('validating')

    // 验证文件类型
    if (!validateFileType(file)) {
      const error = `不支持的文件类型: ${file.name}. 请上传 ${acceptedTypes.join(', ')} 文件`
      setErrorMessage(error)
      setUploadStatus('error')
      onUploadError?.(error)
      return
    }

    // 验证文件大小
    if (!validateFileSize(file)) {
      const error = `文件过大: ${file.name}. 最大支持 ${formatFileSize(maxFileSize)}`
      setErrorMessage(error)
      setUploadStatus('error')
      onUploadError?.(error)
      return
    }

    // 文件验证通过
    setFileName(file.name)
    setFileInfo({
      size: formatFileSize(file.size),
      type: getFileTypeDisplay(file)
    })
    setUploadStatus('idle')
    onFileSelect(file)
  }, [validateFileType, validateFileSize, formatFileSize, getFileTypeDisplay, acceptedTypes, maxFileSize, onUploadError, onFileSelect])

  // 处理文件上传
  const handleUpload = useCallback(async (file: File) => {
    if (!accessCode.trim()) {
      const error = '请先输入访问码'
      setErrorMessage(error)
      setUploadStatus('error')
      onUploadError?.(error)
      return
    }

    setIsUploading(true)
    setUploadStatus('uploading')
    setErrorMessage('')
    setRetryCount(0)

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController()

    const formData = new FormData()
    formData.append('file', file)
    formData.append('access_code', accessCode)

    try {
      const response = await fetch('http://localhost:8000/api/v1/files/upload', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
        // 添加上传进度监听
      })

      // 模拟上传进度（实际项目中应该使用 XMLHttpRequest 或 fetch + ReadableStream）
      const simulateProgress = () => {
        let progress = 0
        const interval = setInterval(() => {
          progress += Math.random() * 15
          if (progress >= 100) {
            progress = 100
            clearInterval(interval)
          }
          setUploadProgress({
            loaded: Math.round((progress / 100) * file.size),
            total: file.size,
            percentage: Math.round(progress)
          })
        }, 200)
        return interval
      }

      const progressInterval = simulateProgress()

      if (!response.ok) {
        const errorData = await response.json()
        clearInterval(progressInterval)
        throw new Error(errorData.error?.message || '文件上传失败')
      }

      clearInterval(progressInterval)
      setUploadProgress({ loaded: file.size, total: file.size, percentage: 100 })

      const result = await response.json()
      setUploadStatus('success')
      onUploadSuccess?.(result)

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // 用户取消上传
        setErrorMessage('上传已取消')
      } else {
        const errorMessage = error.message || '上传失败，请重试'
        setErrorMessage(errorMessage)
        setUploadStatus('error')
        onUploadError?.(errorMessage)
      }
    } finally {
      setIsUploading(false)
      abortControllerRef.current = null
    }
  }, [accessCode, onUploadSuccess, onUploadError])

  // 重试上传
  const handleRetry = useCallback(() => {
    if (fileInputRef.current?.files?.[0]) {
      setRetryCount(prev => prev + 1)
      handleUpload(fileInputRef.current.files[0])
    }
  }, [handleUpload])

  // 取消上传
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsUploading(false)
    setUploadStatus('idle')
    setUploadProgress(null)
  }, [])

  // 重置状态
  const handleReset = useCallback(() => {
    setFileName('')
    setFileInfo(null)
    setErrorMessage('')
    setUploadStatus('idle')
    setUploadProgress(null)
    setRetryCount(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // 拖拽事件处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  // 点击上传处理
  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // 文件输入变化处理
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const isUploadDisabled = disabled || isUploading || !accessCode.trim()

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${isUploadDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}
          ${uploadStatus === 'success' ? 'border-green-500 bg-green-50' : ''}
          ${uploadStatus === 'error' ? 'border-red-500 bg-red-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={isUploadDisabled ? undefined : handleClickUpload}
      >
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploadDisabled}
        />

        {/* 上传状态图标 */}
        <div className="mb-4">
          {uploadStatus === 'success' && (
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          )}
          {uploadStatus === 'error' && (
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          )}
          {uploadStatus === 'uploading' && (
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          )}
          {uploadStatus === 'idle' && fileName && (
            <FileText className="w-12 h-12 text-blue-500 mx-auto" />
          )}
          {uploadStatus === 'idle' && !fileName && (
            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
          )}
        </div>

        {/* 状态消息 */}
        {uploadStatus === 'idle' && !fileName && (
          <div>
            <p className="text-lg font-medium text-gray-700 mb-2">
              拖拽文件到此处或点击上传
            </p>
            <p className="text-sm text-gray-500">
              支持 {acceptedTypes.join(', ')} 文件，最大 {formatFileSize(maxFileSize)}
            </p>
          </div>
        )}

        {/* 文件信息 */}
        {fileName && uploadStatus === 'idle' && (
          <div className="text-left">
            <p className="font-medium text-gray-900 mb-1">{fileName}</p>
            {fileInfo && (
              <div className="flex gap-4 text-sm text-gray-600">
                <span>大小: {fileInfo.size}</span>
                <span>类型: {fileInfo.type}</span>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleUpload(fileInputRef.current?.files?.[0])
              }}
              disabled={isUploadDisabled}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              开始上传
            </button>
          </div>
        )}

        {/* 上传进度 */}
        {uploadStatus === 'uploading' && uploadProgress && (
          <div className="text-left">
            <p className="font-medium text-gray-900 mb-2">正在上传 {fileName}</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total)}</span>
              <span>{uploadProgress.percentage}%</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCancel()
              }}
              className="mt-3 px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
            >
              取消上传
            </button>
          </div>
        )}

        {/* 成功状态 */}
        {uploadStatus === 'success' && (
          <div>
            <p className="font-medium text-green-800 mb-2">文件上传成功！</p>
            <p className="text-sm text-green-600">{fileName}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleReset()
              }}
              className="mt-3 px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
            >
              上传新文件
            </button>
          </div>
        )}

        {/* 错误状态 */}
        {uploadStatus === 'error' && (
          <div>
            <p className="font-medium text-red-800 mb-2">上传失败</p>
            <p className="text-sm text-red-600 mb-3">{errorMessage}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRetry()
                }}
                disabled={isUploading}
                className="px-3 py-1 text-blue-600 border border-blue-600 rounded hover:bg-blue-50 disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                重试 ({retryCount})
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleReset()
                }}
                className="px-3 py-1 text-gray-600 border border-gray-600 rounded hover:bg-gray-50"
              >
                重新选择
              </button>
            </div>
          </div>
        )}

        {/* 禁用状态提示 */}
        {isUploadDisabled && !fileName && (
          <div className="absolute inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center rounded-lg">
            <p className="text-gray-500">
              {!accessCode.trim() ? '请先输入访问码' : '上传已禁用'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileUpload