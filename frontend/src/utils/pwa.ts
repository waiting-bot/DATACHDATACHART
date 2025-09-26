import { useState, useEffect } from 'react'

// PWA 注册工具
export interface PWAConfig {
  scope?: string
  updateInterval?: number
  enableUpdateNotifications?: boolean
}

export class PWAManager {
  private registration: ServiceWorkerRegistration | null = null
  private config: Required<PWAConfig>
  private updateTimeoutId: number | null = null

  constructor(config: PWAConfig = {}) {
    this.config = {
      scope: '/',
      updateInterval: 60 * 60 * 1000, // 1小时
      enableUpdateNotifications: true,
      ...config
    }

    this.init()
  }

  private async init() {
    if ('serviceWorker' in navigator) {
      try {
        // 注册 Service Worker
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: this.config.scope
        })

        console.log('ServiceWorker registration successful with scope:', this.registration.scope)

        // 监听控制器变化
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('Controller changed')
          if (this.config.enableUpdateNotifications) {
            this.showUpdateNotification()
          }
        })

        // 监听 Service Worker 消息
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event)
        })

        // 启动定期更新检查
        this.startUpdateCheck()

        // 检查更新
        this.checkForUpdates()

      } catch (error) {
        console.error('ServiceWorker registration failed:', error)
      }
    } else {
      console.warn('ServiceWorker is not supported in this browser')
    }
  }

  // 处理 Service Worker 消息
  private handleServiceWorkerMessage(event: MessageEvent) {
    const { type, data } = event.data

    switch (type) {
      case 'CACHE_UPDATED':
        console.log('Cache updated:', data)
        break
      case 'OFFLINE_READY':
        console.log('App is ready for offline use')
        break
      default:
        console.log('Received message from Service Worker:', event.data)
    }
  }

  // 检查更新
  public async checkForUpdates() {
    if (this.registration) {
      try {
        await this.registration.update()
        console.log('Checked for Service Worker updates')
      } catch (error) {
        console.error('Failed to check for updates:', error)
      }
    }
  }

  // 启动定期更新检查
  private startUpdateCheck() {
    const check = () => {
      this.checkForUpdates()
      this.updateTimeoutId = window.setTimeout(check, this.config.updateInterval)
    }
    check()
  }

  // 显示更新通知
  private showUpdateNotification() {
    const notification = document.createElement('div')
    notification.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center gap-3'
    notification.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        <div>
          <p class="font-medium">发现新版本</p>
          <p class="text-sm opacity-90">点击刷新以获取最新功能</p>
        </div>
        <button class="ml-4 px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 transition-colors">
          刷新
        </button>
        <button class="ml-2 text-white hover:text-gray-200 transition-colors">
          ✕
        </button>
      </div>
    `

    document.body.appendChild(notification)

    // 刷新按钮
    const refreshBtn = notification.querySelector('button')
    refreshBtn?.addEventListener('click', () => {
      window.location.reload()
    })

    // 关闭按钮
    const closeBtn = notification.querySelectorAll('button')[1]
    closeBtn?.addEventListener('click', () => {
      document.body.removeChild(notification)
    })

    // 自动消失
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 10000) // 10秒后自动消失
  }

  // 手动触发更新
  public async forceUpdate() {
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    } else {
      await this.checkForUpdates()
    }
  }

  // 获取 PWA 状态
  public getPWAStatus() {
    return {
      isInstalled: window.matchMedia('(display-mode: standalone)').matches,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isStandalone: window.navigator.standalone,
      hasServiceWorker: !!this.registration,
      serviceWorkerState: this.registration?.active?.state || 'none'
    }
  }

  // 安装提示
  public async promptInstall() {
    if ('BeforeInstallPromptEvent' in window) {
      const event = window as any
      const promptEvent = event.deferredPrompt

      if (promptEvent) {
        try {
          const result = await promptEvent.prompt()
          console.log('Install prompt result:', result)
          return result
        } catch (error) {
          console.error('Install prompt failed:', error)
          return null
        }
      }
    }
    return null
  }

  // 清理资源
  public destroy() {
    if (this.updateTimeoutId) {
      clearTimeout(this.updateTimeoutId)
    }
  }
}

// PWA 安装提示 Hook
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // 检查是否已安装
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (installPrompt) {
      try {
        const result = await installPrompt.prompt()
        setInstallPrompt(null)
        return result
      } catch (error) {
        console.error('Install prompt failed:', error)
        return null
      }
    }
    return null
  }

  return { installPrompt, isInstalled, promptInstall }
}

// 网络状态 Hook
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [networkInfo, setNetworkInfo] = useState<NetworkInformation | null>(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    const handleConnectionChange = () => {
      const connection = (navigator as any).connection
      setNetworkInfo(connection)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      connection.addEventListener('change', handleConnectionChange)
      setNetworkInfo(connection)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        connection.removeEventListener('change', handleConnectionChange)
      }
    }
  }, [])

  return { isOnline, networkInfo }
}

// 导出 PWA 管理器实例 (开发阶段禁用)
export const pwaManager = import.meta.env.DEV ? null : new PWAManager()