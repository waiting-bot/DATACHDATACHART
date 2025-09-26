import React, { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { usePWAInstall } from '@/utils/pwa'

const PWAInstallPrompt: React.FC = () => {
  const { installPrompt, isInstalled, promptInstall } = usePWAInstall()
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // 如果有安装提示且应用未安装且用户未关闭过提示，则显示提示
    if (installPrompt && !isInstalled && !dismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000) // 3秒后显示

      return () => clearTimeout(timer)
    }
  }, [installPrompt, isInstalled, dismissed])

  const handleInstall = async () => {
    try {
      const result = await promptInstall()
      if (result === 'accepted') {
        setShowPrompt(false)
      }
    } catch (error) {
      console.error('Installation failed:', error)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    
    // 记录用户选择，一天内不再提示
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // 检查是否应该显示提示
  useEffect(() => {
    const dismissedTime = localStorage.getItem('pwa-install-dismissed')
    if (dismissedTime) {
      const oneDay = 24 * 60 * 60 * 1000
      const isExpired = Date.now() - parseInt(dismissedTime) > oneDay
      
      if (isExpired) {
        localStorage.removeItem('pwa-install-dismissed')
        setDismissed(false)
      } else {
        setDismissed(true)
      }
    }
  }, [])

  if (!showPrompt || isInstalled) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 animate-slide-up">
        {/* 头部 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">安装应用</h3>
              <p className="text-xs text-gray-500">获得更好的使用体验</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 功能列表 */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>离线使用，无需网络</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>桌面图标，快速访问</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>推送通知，实时提醒</span>
          </div>
        </div>

        {/* 按钮组 */}
        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            立即安装
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
          >
            稍后再说
          </button>
        </div>

        {/* 平台提示 */}
        <div className="mt-3 text-xs text-gray-500 text-center">
          {/Android/i.test(navigator.userAgent) && (
            <span>点击安装按钮或浏览器菜单中的"添加到主屏幕"</span>
          )}
          {/iPhone|iPad|iPod/i.test(navigator.userAgent) && (
            <span>在 Safari 浏览器中点击分享按钮，然后选择"添加到主屏幕"</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default PWAInstallPrompt