#!/usr/bin/env python3
"""
简单的图表生成测试
"""

import pandas as pd
from app.services.chart_service import chart_generator

def test_chart_generation():
    """测试图表生成功能"""
    print("🧪 测试图表生成功能...")
    
    # 创建测试数据
    test_data = {
        'data': [
            {'label': 'A', 'value': 10},
            {'label': 'B', 'value': 20},
            {'label': 'C', 'value': 15},
            {'label': 'D', 'value': 25}
        ],
        'columns': ['label', 'value']
    }
    
    print(f"测试数据: {test_data}")
    
    # 测试各种图表类型
    chart_types = ['bar', 'line', 'pie', 'scatter', 'area']
    
    for chart_type in chart_types:
        print(f"\n📊 测试 {chart_type} 图表...")
        try:
            result = chart_generator.generate_chart(
                data=test_data,
                chart_type=chart_type,
                title=f"测试{chart_type}图表",
                width=600,
                height=400,
                format='png'
            )
            
            if result.get('success'):
                print(f"✅ {chart_type} 图表生成成功")
                print(f"   格式: {result.get('format')}")
                print(f"   尺寸: {result.get('width')}x{result.get('height')}")
                print(f"   图表数据长度: {len(result.get('image_data', ''))}")
            else:
                print(f"❌ {chart_type} 图表生成失败: {result.get('message')}")
                
        except Exception as e:
            print(f"❌ {chart_type} 图表生成异常: {e}")

if __name__ == "__main__":
    test_chart_generation()