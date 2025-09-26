#!/usr/bin/env python3
"""
全面的图表生成测试 - 测试所有支持的图表类型
"""

import pandas as pd
from app.services.chart_service import chart_generator
import base64
import io
from PIL import Image

def test_all_chart_types():
    """测试所有支持的图表类型"""
    print("🧪 测试所有支持的图表类型...")
    
    # 创建测试数据
    test_data = {
        'data': [
            {'label': '产品A', 'value': 120},
            {'label': '产品B', 'value': 190},
            {'label': '产品C', 'value': 300},
            {'label': '产品D', 'value': 250},
            {'label': '产品E', 'value': 150}
        ],
        'columns': ['label', 'value']
    }
    
    # 创建适合不同图表类型的数据
    test_datasets = {
        'bar': test_data,
        'line': {
            'data': [
                {'x': '1月', 'y': 100},
                {'x': '2月', 'y': 150},
                {'x': '3月', 'y': 120},
                {'x': '4月', 'y': 200},
                {'x': '5月', 'y': 180}
            ],
            'columns': ['x', 'y']
        },
        'pie': test_data,
        'scatter': {
            'data': [
                {'x': 10, 'y': 20},
                {'x': 15, 'y': 25},
                {'x': 20, 'y': 30},
                {'x': 25, 'y': 35},
                {'x': 30, 'y': 40}
            ],
            'columns': ['x', 'y']
        },
        'area': {
            'data': [
                {'x': '1月', 'y': 100},
                {'x': '2月', 'y': 150},
                {'x': '3月', 'y': 120},
                {'x': '4月', 'y': 200},
                {'x': '5月', 'y': 180}
            ],
            'columns': ['x', 'y']
        },
        'heatmap': {
            'data': [
                {'x': 'A', 'y': 'A', 'value': 10},
                {'x': 'A', 'y': 'B', 'value': 20},
                {'x': 'A', 'y': 'C', 'value': 30},
                {'x': 'B', 'y': 'A', 'value': 40},
                {'x': 'B', 'y': 'B', 'value': 50},
                {'x': 'B', 'y': 'C', 'value': 60}
            ],
            'columns': ['x', 'y', 'value']
        },
        'box': {
            'data': [
                {'category': 'A', 'value': 10},
                {'category': 'A', 'value': 15},
                {'category': 'A', 'value': 20},
                {'category': 'B', 'value': 25},
                {'category': 'B', 'value': 30},
                {'category': 'B', 'value': 35}
            ],
            'columns': ['category', 'value']
        },
        'violin': {
            'data': [
                {'category': 'A', 'value': 10},
                {'category': 'A', 'value': 15},
                {'category': 'A', 'value': 20},
                {'category': 'B', 'value': 25},
                {'category': 'B', 'value': 30},
                {'category': 'B', 'value': 35}
            ],
            'columns': ['category', 'value']
        },
        'histogram': {
            'data': [
                {'value': 10},
                {'value': 15},
                {'value': 20},
                {'value': 25},
                {'value': 30},
                {'value': 35},
                {'value': 40},
                {'value': 45},
                {'value': 50}
            ],
            'columns': ['value']
        }
    }
    
    # 测试所有图表类型
    chart_types = ['bar', 'line', 'pie', 'scatter', 'area', 'heatmap', 'box', 'violin', 'histogram']
    formats = ['png', 'svg']
    
    results = {}
    
    for chart_type in chart_types:
        print(f"\n📊 测试 {chart_type} 图表...")
        
        if chart_type not in test_datasets:
            print(f"   ❌ 缺少 {chart_type} 的测试数据")
            continue
            
        chart_data = test_datasets[chart_type]
        
        for format_type in formats:
            try:
                result = chart_generator.generate_chart(
                    data=chart_data,
                    chart_type=chart_type,
                    title=f"测试{chart_type}图表 ({format_type})",
                    width=600,
                    height=400,
                    format=format_type
                )
                
                if result.get('success'):
                    print(f"   ✅ {chart_type} ({format_type}) 图表生成成功")
                    
                    # 验证图像数据
                    if 'image_data' in result:
                        image_data = result['image_data']
                        if format_type == 'png':
                            # 验证PNG数据
                            if image_data.startswith('data:image/png;base64,'):
                                # 解码并验证图像
                                base64_data = image_data.split(',')[1]
                                try:
                                    image_bytes = base64.b64decode(base64_data)
                                    img = Image.open(io.BytesIO(image_bytes))
                                    print(f"      图像尺寸: {img.size}, 模式: {img.mode}")
                                except Exception as e:
                                    print(f"      ❌ PNG图像验证失败: {e}")
                            else:
                                print(f"      ❌ PNG数据格式错误")
                        elif format_type == 'svg':
                            # 验证SVG数据
                            if image_data.startswith('data:image/svg+xml;base64,'):
                                base64_data = image_data.split(',')[1]
                                try:
                                    svg_content = base64.b64decode(base64_data).decode('utf-8')
                                    if '<svg' in svg_content and '</svg>' in svg_content:
                                        print(f"      SVG数据验证成功")
                                    else:
                                        print(f"      ❌ SVG内容不完整")
                                except Exception as e:
                                    print(f"      ❌ SVG图像验证失败: {e}")
                            else:
                                print(f"      ❌ SVG数据格式错误")
                    
                    # 记录结果
                    if chart_type not in results:
                        results[chart_type] = {}
                    results[chart_type][format_type] = {
                        'success': True,
                        'size': len(result.get('image_data', '')),
                        'width': result.get('width'),
                        'height': result.get('height')
                    }
                else:
                    print(f"   ❌ {chart_type} ({format_type}) 图表生成失败: {result.get('message')}")
                    
            except Exception as e:
                print(f"   ❌ {chart_type} ({format_type}) 图表生成异常: {e}")
    
    # 汇总结果
    print(f"\n📋 测试结果汇总:")
    print(f"   总共测试了 {len(chart_types)} 种图表类型，{len(formats)} 种输出格式")
    
    success_count = 0
    total_count = len(chart_types) * len(formats)
    
    for chart_type in chart_types:
        if chart_type in results:
            for format_type in formats:
                if format_type in results[chart_type]:
                    if results[chart_type][format_type]['success']:
                        success_count += 1
                        print(f"   ✅ {chart_type} ({format_type}): 成功")
                    else:
                        print(f"   ❌ {chart_type} ({format_type}): 失败")
                else:
                    print(f"   ❌ {chart_type} ({format_type}): 未测试")
        else:
            print(f"   ❌ {chart_type}: 未测试")
    
    print(f"\n📊 成功率: {success_count}/{total_count} ({success_count/total_count*100:.1f}%)")
    
    if success_count == total_count:
        print(f"🎉 所有图表类型测试通过！")
    else:
        print(f"⚠️  部分图表类型测试失败，需要进一步调试")
    
    return results

if __name__ == "__main__":
    test_all_chart_types()