#!/usr/bin/env python3
"""
完整的端到端测试 - 模拟用户从文件上传到图表生成的完整流程
"""

import requests
import json
import pandas as pd
import os
from pathlib import Path

def create_test_excel_file():
    """创建测试用的Excel文件"""
    print("📁 创建测试Excel文件...")
    
    # 创建多种数据类型的工作表
    with pd.ExcelWriter('test_complete.xlsx', engine='openpyxl') as writer:
        # 柱状图数据
        bar_data = pd.DataFrame({
            '产品': ['产品A', '产品B', '产品C', '产品D', '产品E'],
            '销量': [120, 190, 300, 250, 150]
        })
        bar_data.to_excel(writer, sheet_name='柱状图数据', index=False)
        
        # 折线图数据
        line_data = pd.DataFrame({
            '月份': ['1月', '2月', '3月', '4月', '5月', '6月'],
            '销售额': [100, 150, 120, 200, 180, 220],
            '利润': [20, 35, 25, 45, 38, 50]
        })
        line_data.to_excel(writer, sheet_name='折线图数据', index=False)
        
        # 饼图数据
        pie_data = pd.DataFrame({
            '类别': ['类别A', '类别B', '类别C', '类别D'],
            '占比': [30, 25, 25, 20]
        })
        pie_data.to_excel(writer, sheet_name='饼图数据', index=False)
        
        # 散点图数据
        scatter_data = pd.DataFrame({
            'X值': [10, 20, 30, 40, 50, 60],
            'Y值': [15, 25, 35, 45, 55, 65]
        })
        scatter_data.to_excel(writer, sheet_name='散点图数据', index=False)
    
    print("✅ 测试Excel文件创建成功: test_complete.xlsx")
    return 'test_complete.xlsx'

def test_complete_workflow():
    """测试完整的用户工作流程"""
    print("🚀 开始完整的端到端测试...")
    
    base_url = "http://localhost:8000"
    test_file = create_test_excel_file()
    
    try:
        # 1. 检查API健康状态
        print("\n1️⃣ 检查API健康状态...")
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            health = response.json()
            print(f"   ✅ API健康状态: {health['status']}")
            print(f"   📊 数据库连接: {health['database']}")
        else:
            print(f"   ❌ API健康检查失败: {response.status_code}")
            return False
        
        # 2. 获取支持的图表类型
        print("\n2️⃣ 获取支持的图表类型...")
        response = requests.get(f"{base_url}/api/chart-types")
        if response.status_code == 200:
            chart_types = response.json()
            print(f"   ✅ 支持 {len(chart_types['chart_types'])} 种图表类型:")
            for chart in chart_types['chart_types']:
                print(f"      - {chart['type']}: {chart['name']}")
        else:
            print(f"   ❌ 获取图表类型失败: {response.status_code}")
            return False
        
        # 3. 创建访问码
        print("\n3️⃣ 创建测试访问码...")
        access_code_data = {
            "access_code": "COMPLETE123",
            "max_usage": 50,
            "description": "完整流程测试访问码"
        }
        response = requests.post(f"{base_url}/api/access-codes", json=access_code_data)
        if response.status_code == 200:
            print(f"   ✅ 访问码创建成功: {access_code_data['access_code']}")
        else:
            print(f"   ⚠️ 访问码可能已存在，继续使用现有访问码")
        
        # 4. 验证访问码
        print("\n4️⃣ 验证访问码...")
        validate_data = {
            "access_code": "COMPLETE123"
        }
        response = requests.post(f"{base_url}/api/validate-access-code", json=validate_data)
        if response.status_code == 200:
            validation = response.json()
            if validation['is_valid']:
                print(f"   ✅ 访问码验证成功")
                print(f"   📊 剩余使用次数: {validation['remaining_usage']}")
            else:
                print(f"   ❌ 访问码验证失败: {validation['message']}")
                return False
        else:
            print(f"   ❌ 访问码验证失败: {response.status_code}")
            return False
        
        # 5. 上传Excel文件
        print("\n5️⃣ 上传Excel文件...")
        with open(test_file, 'rb') as f:
            files = {'file': f}
            data = {
                'access_code': 'COMPLETE123',
                'chart_type': 'bar'
            }
            response = requests.post(f"{base_url}/api/upload-file", files=files, data=data)
        
        if response.status_code == 200:
            upload_result = response.json()
            print(f"   ✅ 文件上传成功")
            print(f"   📁 文件名: {upload_result['file_info']['original_filename']}")
            print(f"   📊 文件大小: {upload_result['file_info']['file_size']} bytes")
            print(f"   📈 剩余使用次数: {upload_result['remaining_usage']}")
        else:
            print(f"   ❌ 文件上传失败: {response.status_code}")
            print(f"   错误信息: {response.text}")
            return False
        
        # 6. 解析Excel文件
        print("\n6️⃣ 解析Excel文件...")
        parse_data = {
            "file_path": upload_result['file_info']['file_path'],
            "chart_type": "bar"
        }
        response = requests.post(f"{base_url}/api/parse-excel", json=parse_data)
        
        if response.status_code == 200:
            parse_result = response.json()
            print(f"   ✅ Excel文件解析成功")
            print(f"   📊 数据形状: {parse_result['chart_data']['shape']}")
            print(f"   📋 列名: {parse_result['chart_data']['columns']}")
            print(f"   💡 推荐图表类型: {parse_result['suggested_charts']}")
        else:
            print(f"   ❌ Excel文件解析失败: {response.status_code}")
            return False
        
        # 7. 生成图表
        print("\n7️⃣ 生成图表...")
        chart_types_to_test = ['bar', 'line', 'pie', 'scatter', 'area']
        
        for chart_type in chart_types_to_test:
            print(f"   📊 生成 {chart_type} 图表...")
            
            chart_data = {
                "access_code": "COMPLETE123",
                "chart_type": chart_type,
                "chart_data": parse_result['chart_data'],
                "chart_title": f"测试{chart_type}图表",
                "width": 800,
                "height": 600,
                "format": "png"
            }
            
            response = requests.post(f"{base_url}/api/generate-chart-from-data", json=chart_data)
            
            if response.status_code == 200:
                chart_result = response.json()
                if chart_result['success']:
                    print(f"      ✅ {chart_type} 图表生成成功")
                    print(f"      📏 尺寸: {chart_result['chart_data']['width']}x{chart_result['chart_data']['height']}")
                    print(f"      📊 剩余使用次数: {chart_result['remaining_usage']}")
                else:
                    print(f"      ❌ {chart_type} 图表生成失败: {chart_result['message']}")
            else:
                print(f"      ❌ {chart_type} 图表生成失败: {response.status_code}")
        
        # 8. 获取图表类型建议
        print("\n8️⃣ 获取图表类型建议...")
        suggestion_url = f"{base_url}/api/chart-suggestions?file_path={upload_result['file_info']['file_path']}"
        response = requests.get(suggestion_url)
        
        if response.status_code == 200:
            suggestions = response.json()
            print(f"   ✅ 图表类型建议获取成功")
            print(f"   💡 建议的图表类型: {suggestions['suggestions']}")
        else:
            print(f"   ❌ 获取图表类型建议失败: {response.status_code}")
        
        # 9. 获取访问码统计信息
        print("\n9️⃣ 获取访问码统计信息...")
        response = requests.get(f"{base_url}/api/access-codes/statistics")
        
        if response.status_code == 200:
            stats = response.json()
            print(f"   ✅ 访问码统计信息获取成功")
            print(f"   📊 总访问码数: {stats['total_codes']}")
            print(f"   🔄 总使用次数: {stats['total_usage']}")
            print(f"   📈 平均使用次数: {stats['average_usage']:.1f}")
        else:
            print(f"   ❌ 获取统计信息失败: {response.status_code}")
        
        print("\n🎉 完整的端到端测试完成！")
        return True
        
    except Exception as e:
        print(f"❌ 测试过程中发生异常: {e}")
        return False
    
    finally:
        # 清理测试文件
        if os.path.exists(test_file):
            os.remove(test_file)
            print(f"🧹 清理测试文件: {test_file}")

if __name__ == "__main__":
    test_complete_workflow()