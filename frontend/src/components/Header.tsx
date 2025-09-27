import React from 'react'
import { BarChart3, Menu, X, HelpCircle, Settings } from 'lucide-react'
import type { HeaderProps } from '@/types'

const Header: React.FC<HeaderProps> = ({
  title = '智能图表生成工具',
  onLogoClick,
  showStatus = true,
  className = '',
  extraActions
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleLogoClick = () => {
    onLogoClick?.()
    setIsMobileMenuOpen(false)
  }

  const handleMenuItemClick = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <header className={`bg-white/80 backdrop-blur-sm border-b border-gray-200 safe-area-inset ${className}`}>
      <div className="px-4 sm:px-6 lg:px-8 container-2xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo 和标题 */}
          <div className="flex items-center">
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-3 hover:opacity-80 transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold gradient-text">{title}</h1>
                <p className="text-xs text-gray-500">AI-powered Chart Generation</p>
              </div>
            </button>
          </div>

          {/* Desktop 导航 */}
          <nav className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
              onClick={handleMenuItemClick}
            >
              功能特点
            </a>
            <a
              href="#pricing"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
              onClick={handleMenuItemClick}
            >
              价格方案
            </a>
            <a
              href="#help"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
              onClick={handleMenuItemClick}
            >
              使用帮助
            </a>
            <a
              href="#about"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
              onClick={handleMenuItemClick}
            >
              关于我们
            </a>
          </nav>

          {/* 右侧按钮 */}
          <div className="flex items-center gap-3">
            {/* 额外操作 */}
            {extraActions}
            {/* 帮助按钮 */}
            <button
              onClick={() => {
                handleMenuItemClick()
                // 可以打开帮助模态框
              }}
              className="hidden sm:flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="使用帮助"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="text-sm">帮助</span>
            </button>

            {/* 设置按钮 */}
            <button
              onClick={() => {
                handleMenuItemClick()
                // 可以打开设置模态框
              }}
              className="hidden sm:flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="设置"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">设置</span>
            </button>

            {/* 移动端菜单按钮 */}
            <button
              onClick={handleMobileMenuToggle}
              className="md:flex items-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 移动端菜单 */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200">
            <a
              href="#features"
              onClick={handleMenuItemClick}
              className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-base font-medium transition-colors"
            >
              功能特点
            </a>
            <a
              href="#pricing"
              onClick={handleMenuItemClick}
              className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-base font-medium transition-colors"
            >
              价格方案
            </a>
            <a
              href="#help"
              onClick={handleMenuItemClick}
              className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-base font-medium transition-colors"
            >
              使用帮助
            </a>
            <a
              href="#about"
              onClick={handleMenuItemClick}
              className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-base font-medium transition-colors"
            >
              关于我们
            </a>
            
            {/* 移动端专用菜单项 */}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <button
                onClick={handleMenuItemClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-base font-medium transition-colors text-left"
              >
                <HelpCircle className="w-4 h-4" />
                使用帮助
              </button>
              <button
                onClick={handleMenuItemClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-base font-medium transition-colors text-left"
              >
                <Settings className="w-4 h-4" />
                设置
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header