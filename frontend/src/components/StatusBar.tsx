import React from 'react'
import { Wifi, WifiOff, AlertTriangle, Battery, BarChart3, User } from 'lucide-react'
import type { StatusBarProps } from '@/types'

const StatusBar: React.FC<StatusBarProps> = ({
  remainingUsage,
  maxUsage,
  isAccessCodeValid,
  currentStep,
  systemStatus = 'online',
  className = ''
}) => {
  // 计算使用百分比
  const usagePercentage = maxUsage && remainingUsage !== null 
    ? Math.round(((maxUsage - remainingUsage) / maxUsage) * 100)
    : 0

  // 获取使用状态颜色
  const getUsageColor = () => {
    if (!isAccessCodeValid) return 'text-gray-500'
    if (remainingUsage === 0) return 'text-red-600'
    if (remainingUsage !== null && remainingUsage <= 3) return 'text-orange-600'
    return 'text-green-600'
  }

  // 获取使用状态文本
  const getUsageStatus = () => {
    if (!isAccessCodeValid) return '未验证'
    if (remainingUsage === 0) return '已用完'
    if (remainingUsage !== null && remainingUsage <= 3) return '即将用完'
    return '正常'
  }

  // 获取系统状态图标
  const getSystemStatusIcon = () => {
    switch (systemStatus) {
      case 'online':
        return <Wifi className="w-4 h-4 text-green-500" />
      case 'offline':
        return <WifiOff className="w-4 h-4 text-red-500" />
      case 'maintenance':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />
      default:
        return <Wifi className="w-4 h-4 text-green-500" />
    }
  }

  // 获取当前步骤显示名称
  const getCurrentStepName = () => {
    const stepNames: Record<string, string> = {
      'access_code': '访问码验证',
      'file_upload': '文件上传',
      'chart_generation': '图表生成',
      'chart_display': '图表展示'
    }
    return stepNames[currentStep || 'access_code'] || '未知步骤'
  }

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      {/* Desktop 版本 */}
      <div className="hidden md:block">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            {/* 左侧 - 使用次数状态 */}
            <div className="flex items-center gap-6">
              {/* 访问码状态 */}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">访问码:</span>
                <span className={`text-sm font-medium ${isAccessCodeValid ? 'text-green-600' : 'text-gray-500'}`}>
                  {isAccessCodeValid ? '已验证' : '未验证'}
                </span>
              </div>

              {/* 使用次数 */}
              {isAccessCodeValid && remainingUsage !== null && maxUsage && (
                <div className="flex items-center gap-2">
                  <Battery className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">使用次数:</span>
                  <span className={`text-sm font-medium ${getUsageColor()}`}>
                    {remainingUsage} / {maxUsage}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    getUsageColor().replace('text-', 'bg-').replace('600', '100')
                  } ${getUsageColor()}`}>
                    {getUsageStatus()}
                  </span>
                </div>
              )}

              {/* 使用进度条 */}
              {isAccessCodeValid && maxUsage && (
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        usagePercentage >= 90 ? 'bg-red-500' :
                        usagePercentage >= 70 ? 'bg-orange-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${usagePercentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 min-w-[3rem]">
                    {usagePercentage}%
                  </span>
                </div>
              )}
            </div>

            {/* 右侧 - 系统状态 */}
            <div className="flex items-center gap-4">
              {/* 当前步骤 */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">当前:</span>
                <span className="text-sm font-medium text-gray-900">
                  {getCurrentStepName()}
                </span>
              </div>

              {/* 系统状态 */}
              <div className="flex items-center gap-2">
                {getSystemStatusIcon()}
                <span className="text-sm text-gray-600">
                  {systemStatus === 'online' ? '在线' :
                   systemStatus === 'offline' ? '离线' : '维护中'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile 版本 - 紧凑布局 */}
      <div className="md:hidden">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            {/* 左侧 - 核心状态 */}
            <div className="flex items-center gap-3">
              {/* 系统状态 */}
              <div className="flex items-center gap-1">
                {getSystemStatusIcon()}
              </div>

              {/* 访问码状态 */}
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-gray-400" />
                <span className={`text-xs font-medium ${isAccessCodeValid ? 'text-green-600' : 'text-gray-500'}`}>
                  {isAccessCodeValid ? '✓' : '?'}
                </span>
              </div>

              {/* 使用次数 */}
              {isAccessCodeValid && remainingUsage !== null && (
                <div className="flex items-center gap-1">
                  <Battery className="w-3 h-3 text-gray-400" />
                  <span className={`text-xs font-medium ${getUsageColor()}`}>
                    {remainingUsage}
                  </span>
                </div>
              )}
            </div>

            {/* 右侧 - 当前步骤 */}
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-600">
                {getCurrentStepName()}
              </span>
            </div>
          </div>

          {/* 使用进度条 (Mobile) */}
          {isAccessCodeValid && maxUsage && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>使用进度</span>
                <span>{usagePercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    usagePercentage >= 90 ? 'bg-red-500' :
                    usagePercentage >= 70 ? 'bg-orange-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${usagePercentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 警告状态栏 */}
      {remainingUsage === 0 && isAccessCodeValid && (
        <div className="bg-red-50 border-t border-red-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-800 font-medium">
                访问码使用次数已用完
              </span>
            </div>
            <button className="text-xs text-red-600 hover:text-red-800 underline">
              购买新的访问码
            </button>
          </div>
        </div>
      )}

      {remainingUsage !== null && remainingUsage <= 3 && remainingUsage > 0 && isAccessCodeValid && (
        <div className="bg-orange-50 border-t border-orange-200 px-4 py-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span className="text-sm text-orange-800">
              访问码即将用完，剩余 {remainingUsage} 次使用机会
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatusBar