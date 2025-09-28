import React from 'react'
import { HelpCircle, FileText, Upload, BarChart3, Download } from 'lucide-react'

interface UserGuideProps {
  isOpen: boolean
  onClose: () => void
}

const UserGuide: React.FC<UserGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  const guideSteps = [
    {
      icon: <HelpCircle className="w-6 h-6" />,
      title: "获取访问码",
      description: "在小红书店铺购买访问码，获得生成图表的权限",
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "准备数据文件",
      description: "将您的数据整理为 Excel 文件，确保格式正确",
      color: "bg-green-100 text-green-600"
    },
    {
      icon: <Upload className="w-6 h-6" />,
      title: "上传文件",
      description: "上传您的 Excel 文件，系统会自动解析数据",
      color: "bg-purple-100 text-purple-600"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "选择图表类型",
      description: "预览不同图表效果，选择最适合的图表类型",
      color: "bg-orange-100 text-orange-600"
    },
    {
      icon: <Download className="w-6 h-6" />,
      title: "下载图表",
      description: "生成高质量的透明背景图表，下载使用",
      color: "bg-pink-100 text-pink-600"
    }
  ]

  const tips = [
    {
      title: "文件格式要求",
      content: "支持 .xlsx 和 .xls 格式，文件大小不超过 10MB"
    },
    {
      title: "访问码使用",
      content: "每个访问码有使用次数限制，请合理使用"
    },
    {
      title: "图表质量",
      content: "生成的图表为 PNG/SVG 格式，透明背景，适合设计使用"
    },
    {
      title: "数据安全",
      content: "文件处理完成后会自动删除，保护您的数据隐私"
    }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">使用指南</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {/* 使用步骤 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">使用步骤</h3>
            <div className="space-y-4">
              {guideSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${step.color}`}>
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {index + 1}. {step.title}
                    </h4>
                    <p className="text-gray-600 text-sm">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 使用技巧 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">使用技巧</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tips.map((tip, index) => (
                <div key={index} className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">{tip.title}</h4>
                  <p className="text-blue-800 text-sm">{tip.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 常见问题 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">常见问题</h3>
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Q: 访问码无效怎么办？</h4>
                <p className="text-gray-600 text-sm">A: 请检查访问码是否正确输入，或联系购买店铺的客服。</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Q: 文件上传失败？</h4>
                <p className="text-gray-600 text-sm">A: 确保文件格式正确，大小不超过 10MB，且文件未损坏。</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Q: 图表生成效果不理想？</h4>
                <p className="text-gray-600 text-sm">A: 尝试不同的图表类型，或调整数据格式使其更适合可视化。</p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              如需更多帮助，请联系客服
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              我知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserGuide