import React from 'react'
import { Check, ChevronRight, Circle } from 'lucide-react'
import type { WorkflowStep } from '@/types'

interface WorkflowStepperProps {
  currentStep: WorkflowStep
  steps: {
    id: WorkflowStep
    title: string
    description?: string
    icon?: React.ReactNode
  }[]
  onStepClick?: (step: WorkflowStep) => void
  className?: string
}

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  steps,
  onStepClick,
  className = ''
}) => {
  const getStepStatus = (stepId: WorkflowStep): 'completed' | 'current' | 'upcoming' => {
    const currentIndex = steps.findIndex(step => step.id === currentStep)
    const stepIndex = steps.findIndex(step => step.id === stepId)
    
    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'current'
    return 'upcoming'
  }

  const isStepAccessible = (stepId: WorkflowStep): boolean => {
    const currentIndex = steps.findIndex(step => step.id === currentStep)
    const stepIndex = steps.findIndex(step => step.id === stepId)
    return stepIndex <= currentIndex + 1 // 只能访问当前步骤和下一步
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Desktop 版本 - 水平布局 */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id)
            const isAccessible = onStepClick && isStepAccessible(step.id)
            const isLast = index === steps.length - 1

            return (
              <React.Fragment key={step.id}>
                {/* 步骤圆圈 */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => isAccessible && onStepClick?.(step.id)}
                    disabled={!isAccessible}
                    className={`
                      relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-offset-2
                      ${status === 'completed'
                        ? 'bg-green-500 border-green-500 text-white hover:bg-green-600 focus:ring-green-200'
                        : status === 'current'
                        ? 'bg-blue-500 border-blue-500 text-white focus:ring-blue-200'
                        : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400'
                      }
                      ${isAccessible ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed opacity-50'}
                    `}
                  >
                    {status === 'completed' ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <span className="text-lg font-medium">{index + 1}</span>
                    )}
                    
                    {/* 当前步骤的脉冲动画 */}
                    {status === 'current' && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-blue-500"></div>
                      </>
                    )}
                  </button>
                  
                  {/* 步骤标题 */}
                  <div className="mt-3 text-center">
                    <h3 className={`text-sm font-medium ${
                      status === 'completed' || status === 'current'
                        ? 'text-gray-900'
                        : 'text-gray-500'
                    }`}>
                      {step.title}
                    </h3>
                    {step.description && (
                      <p className={`text-xs mt-1 ${
                        status === 'completed' || status === 'current'
                          ? 'text-gray-600'
                          : 'text-gray-400'
                      }`}>
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* 连接线 */}
                {!isLast && (
                  <div className="flex-1 mx-4">
                    <div className={`h-0.5 ${
                      status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <ChevronRight className={`w-4 h-4 -mt-2 ml-auto mr-auto ${
                        status === 'completed' ? 'text-green-500' : 'text-gray-300'
                      }`} />
                    </div>
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Mobile 版本 - 垂直布局 */}
      <div className="md:hidden">
        <div className="space-y-4">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id)
            const isAccessible = onStepClick && isStepAccessible(step.id)
            const isLast = index === steps.length - 1

            return (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  {/* 步骤圆圈 */}
                  <button
                    onClick={() => isAccessible && onStepClick?.(step.id)}
                    disabled={!isAccessible}
                    className={`
                      relative flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-offset-2
                      ${status === 'completed'
                        ? 'bg-green-500 border-green-500 text-white hover:bg-green-600 focus:ring-green-200'
                        : status === 'current'
                        ? 'bg-blue-500 border-blue-500 text-white focus:ring-blue-200'
                        : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400'
                      }
                      ${isAccessible ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed opacity-50'}
                    `}
                  >
                    {status === 'completed' ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                    
                    {/* 当前步骤的脉冲动画 */}
                    {status === 'current' && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-blue-500"></div>
                      </>
                    )}
                  </button>
                  
                  {/* 步骤信息 */}
                  <div className="ml-4 flex-1">
                    <h3 className={`text-sm font-medium ${
                      status === 'completed' || status === 'current'
                        ? 'text-gray-900'
                        : 'text-gray-500'
                    }`}>
                      {step.title}
                    </h3>
                    {step.description && (
                      <p className={`text-xs mt-0.5 ${
                        status === 'completed' || status === 'current'
                          ? 'text-gray-600'
                          : 'text-gray-400'
                      }`}>
                        {step.description}
                      </p>
                    )}
                  </div>

                  {/* 状态图标 */}
                  <div className="flex-shrink-0">
                    {status === 'completed' && (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                    {status === 'current' && (
                      <Circle className="w-5 h-5 text-blue-500 fill-blue-500" />
                    )}
                    {status === 'upcoming' && (
                      <Circle className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                </div>

                {/* 连接线 */}
                {!isLast && (
                  <div className="ml-5 pl-5">
                    <div className={`w-0.5 h-4 ${
                      status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* 进度指示器 (Mobile) */}
      <div className="md:hidden mt-6">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>步骤 {steps.findIndex(step => step.id === currentStep) + 1} / {steps.length}</span>
          <span>
            {Math.round((steps.findIndex(step => step.id === currentStep) + 1) / steps.length * 100)}% 完成
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((steps.findIndex(step => step.id === currentStep) + 1) / steps.length) * 100}%`
            }}
          ></div>
        </div>
      </div>
    </div>
  )
}

export default WorkflowStepper