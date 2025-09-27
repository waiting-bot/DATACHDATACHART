import React, { useState, useCallback, useEffect } from 'react'
import { Key, CheckCircle, AlertCircle, Shield } from 'lucide-react'
import type { AccessCodeInputProps } from '@/types'

const AccessCodeInput: React.FC<AccessCodeInputProps> = ({
  value,
  onChange,
  onValidate,
  onValidated,
  loading = false,
  error,
  disabled = false,
  autoFocus = true,
  className = ''
}) => {
  const [isValid, setIsValid] = useState<boolean>(false)
  const [validationMessage, setValidationMessage] = useState<string>('')
  const [accessCodeInfo, setAccessCodeInfo] = useState<any>(null)

  // 验证访问码格式
  const validateFormat = useCallback((code: string): boolean => {
    if (!code || code.trim().length === 0) {
      setValidationMessage('请输入访问码')
      return false
    }
    if (code.length < 6) {
      setValidationMessage('访问码长度至少6位')
      return false
    }
    if (code.length > 50) {
      setValidationMessage('访问码长度不能超过50位')
      return false
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(code)) {
      setValidationMessage('访问码只能包含字母、数字、连字符和下划线')
      return false
    }
    setValidationMessage('')
    return true
  }, [])

  // 处理输入变化
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    
    // 实时格式验证
    const formatValid = validateFormat(newValue)
    setIsValid(formatValid)
    
    if (!formatValid) {
      setIsValid(false)
      setAccessCodeInfo(null)
    }
  }, [onChange, validateFormat])

  // 处理验证提交
  const handleValidate = useCallback(async () => {
    if (!value.trim() || !validateFormat(value)) {
      return
    }

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiBaseUrl}/api/v1/access-codes/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_code: value }),
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMsg = result.error?.message || '访问码验证失败'
        setValidationMessage(errorMsg)
        setIsValid(false)
        setAccessCodeInfo(null)
        onValidate?.(false)
        return
      }

      if (result.success && result.data) {
        setIsValid(true)
        setAccessCodeInfo(result.data)
        setValidationMessage(`验证成功！剩余使用次数: ${result.data.remaining_usage}`)
        onValidate?.(true)
        onValidated?.(result.data)
      }
    } catch (err: any) {
      const errorMsg = err.message || '网络请求失败'
      setValidationMessage(errorMsg)
      setIsValid(false)
      setAccessCodeInfo(null)
      onValidate?.(false)
    }
  }, [value, validateFormat, onValidate, onValidated])

  // 处理键盘事件
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim() && !loading) {
      handleValidate()
    }
  }, [value, loading, handleValidate])

  // 自动验证 (可选)
  useEffect(() => {
    if (value.length >= 6 && validateFormat(value)) {
      const timer = setTimeout(() => {
        handleValidate()
      }, 1000) // 1秒延迟验证

      return () => clearTimeout(timer)
    }
  }, [value, validateFormat, handleValidate])

  const isCodeValid = value.length >= 6 && validateFormat(value) && !error
  const showValidationMessage = validationMessage || error

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {/* 标题 */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">访问码验证</h2>
        </div>
        <p className="text-gray-600">
          请输入您购买的访问码以开始使用图表生成服务
        </p>
      </div>

      {/* 输入框 */}
      <div className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Key className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={value}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            placeholder="请输入访问码"
            disabled={disabled || loading}
            autoFocus={autoFocus}
            className={`
              w-full pl-10 pr-12 py-3 text-lg border-2 rounded-lg transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-2
              ${error || validationMessage
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : isValid
                ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
              }
              ${disabled || loading ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white'}
            `}
          />
          
          {/* 验证状态图标 */}
          {value && !loading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {isValid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          )}
          
          {/* 加载状态 */}
          {loading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        {/* 验证消息 */}
        {showValidationMessage && (
          <div className={`mt-2 text-sm ${error || !isValid ? 'text-red-600' : 'text-green-600'}`}>
            {showValidationMessage}
          </div>
        )}
      </div>

      {/* 验证按钮 */}
      <div className="mt-4">
        <button
          onClick={handleValidate}
          disabled={!isCodeValid || loading || disabled}
          className={`
            w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
            flex items-center justify-center gap-2
            ${!isCodeValid || loading || disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }
          `}
        >
          {loading ? (
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
      </div>

      {/* 访问码信息 */}
      {accessCodeInfo && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">访问码验证成功</span>
          </div>
          <div className="text-sm text-green-700 space-y-1">
            <p>剩余使用次数: <span className="font-medium">{accessCodeInfo.remaining_usage}</span></p>
            <p>最大使用次数: <span className="font-medium">{accessCodeInfo.max_usage}</span></p>
            {accessCodeInfo.expires_at && (
              <p>有效期至: <span className="font-medium">{new Date(accessCodeInfo.expires_at).toLocaleDateString()}</span></p>
            )}
          </div>
        </div>
      )}

      {/* 使用提示 */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>访问码在小红书店铺购买获得</span>
        </div>
      </div>

      {/* 帮助链接 */}
      <div className="mt-4 text-center">
        <a
          href="#"
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          onClick={(e) => {
            e.preventDefault()
            // 可以打开帮助模态框或跳转到帮助页面
          }}
        >
          如何获取访问码？
        </a>
      </div>
    </div>
  )
}

export default AccessCodeInput