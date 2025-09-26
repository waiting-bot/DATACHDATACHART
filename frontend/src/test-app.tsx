import React from 'react'
import ReactDOM from 'react-dom/client'

// 简单的测试应用
function TestApp() {
  return (
    <div className="min-h-screen gradient-bg flex flex-col viewport-fix no-double-tap-zoom text-mobile">
      <div style={{padding: '40px', textAlign: 'center'}}>
        <h1 style={{fontSize: '48px', color: '#1f2937', marginBottom: '20px'}}>
          React测试页面
        </h1>
        <div className="glass" style={{padding: '40px', borderRadius: '16px', margin: '20px auto', maxWidth: '600px'}}>
          <h2 style={{fontSize: '24px', color: '#1f2937', marginBottom: '16px'}}>
            玻璃态卡片
          </h2>
          <p style={{color: '#6b7280', lineHeight: '1.6'}}>
            如果这个页面能正常显示，说明React和CSS都工作正常。你应该能看到：
          </p>
          <ul style={{textAlign: 'left', color: '#6b7280', lineHeight: '1.8'}}>
            <li>渐变背景</li>
            <li>玻璃态半透明效果</li>
            <li>圆角和阴影</li>
          </ul>
        </div>
        
        <div className="card" style={{padding: '30px', borderRadius: '12px', margin: '20px auto', maxWidth: '400px'}}>
          <h3 style={{fontSize: '20px', color: '#1f2937', marginBottom: '12px'}}>
            卡片样式
          </h3>
          <button className="btn-primary" style={{margin: '16px 0'}}>
            测试按钮
          </button>
          <input 
            type="text" 
            className="input" 
            placeholder="测试输入框"
            style={{width: '100%'}}
          />
        </div>
        
        <h1 className="gradient-text" style={{fontSize: '36px', margin: '30px 0'}}>
          渐变文字效果
        </h1>
        
        <div className="animate-fade-in" style={{padding: '20px', background: '#f0f9ff', borderRadius: '12px', margin: '20px auto', maxWidth: '400px'}}>
          <p>淡入动画效果</p>
        </div>
      </div>
    </div>
  )
}

// 渲染应用
const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<TestApp />)