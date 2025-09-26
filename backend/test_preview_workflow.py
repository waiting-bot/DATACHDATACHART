#!/usr/bin/env python3
"""
测试新的预览图生成和选中图表生成功能
"""

import requests
import json
import pandas as pd
import os
from pathlib import Path

def create_test_excel_file():
    """创建测试用的Excel文件"""
    print("📁 创建测试Excel文件...")
    
    # 创建测试数据
    test_data = pd.DataFrame({
        '产品': ['产品A', '产品B', '产品C', '产品D', '产品E'],
        '销量': [120, 190, 300, 250, 150],
        '利润': [20, 35, 45, 38, 25]
    })
    
    test_data.to_excel('test_preview.xlsx', index=False)
    print("✅ 测试Excel文件创建成功: test_preview.xlsx")
    return 'test_preview.xlsx'

def test_preview_workflow():
    """测试完整的预览工作流程"""
    print("🚀 开始测试预览图生成功能...")
    
    base_url = "http://localhost:8000"
    test_file = create_test_excel_file()
    file_path = None
    
    try:
        # 1. 检查API健康状态
        print("\n1️⃣ 检查API健康状态...")
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            health = response.json()
            print(f"   ✅ API健康状态: {health['status']}")
        else:
            print(f"   ❌ API健康检查失败: {response.status_code}")
            return False
        
        # 2. 创建访问码
        print("\n2️⃣ 创建测试访问码...")
        access_code_data = {
            "access_code": "PREVIEW123",
            "max_usage": 10,
            "description": "预览功能测试访问码"
        }
        response = requests.post(f"{base_url}/api/access-codes", json=access_code_data)
        if response.status_code == 200:
            print(f"   ✅ 访问码创建成功: {access_code_data['access_code']}")
        else:
            print(f"   ⚠️ 访问码可能已存在，继续使用现有访问码")
        
        # 3. 上传Excel文件
        print("\n3️⃣ 上传Excel文件...")
        with open(test_file, 'rb') as f:
            files = {'file': f}
            data = {
                'access_code': 'PREVIEW123',
                'chart_type': 'bar'
            }
            response = requests.post(f"{base_url}/api/upload-file", files=files, data=data)
        
        if response.status_code == 200:
            upload_result = response.json()
            file_path = upload_result['file_info']['file_path']
            print(f"   ✅ 文件上传成功")
            print(f"   📁 文件路径: {file_path}")
            print(f"   📊 剩余使用次数: {upload_result['remaining_usage']}")
        else:
            print(f"   ❌ 文件上传失败: {response.status_code}")
            return False
        
        # 4. 获取图表类型建议
        print("\n4️⃣ 获取图表类型建议...")
        response = requests.get(f"{base_url}/api/chart-suggestions?file_path={file_path}")
        
        if response.status_code == 200:
            suggestions = response.json()
            suggested_charts = suggestions['suggestions']
            print(f"   ✅ 图表类型建议获取成功")
            print(f"   💡 建议的图表类型: {suggested_charts}")
        else:
            print(f"   ❌ 获取图表类型建议失败: {response.status_code}")
            return False
        
        # 5. 生成预览图
        print("\n5️⃣ 生成预览图...")
        preview_request = {
            "file_path": file_path,
            "chart_types": suggested_charts[:3],  # 取前3个建议
            "width": 400,
            "height": 300
        }
        
        response = requests.post(f"{base_url}/api/generate-previews", json=preview_request)
        
        if response.status_code == 200:
            preview_result = response.json()
            print(f"   ✅ 预览图生成成功")
            print(f"   📊 生成了 {len(preview_result['previews'])} 个预览图")
            
            for i, preview in enumerate(preview_result['previews']):
                print(f"      {i+1}. {preview['chart_name']} ({preview['chart_type']})")
                print(f"         尺寸: {preview['width']}x{preview['height']}")
                print(f"         描述: {preview['description']}")
        else:
            print(f"   ❌ 预览图生成失败: {response.status_code}")
            print(f"   错误信息: {response.text}")
            return False
        
        # 6. 用户选择图表并生成最终图表
        print("\n6️⃣ 生成选中的最终图表...")
        selected_charts = ['bar', 'line', 'pie']  # 用户选择这3种图表
        
        final_request = {
            "file_path": file_path,
            "selected_chart_types": selected_charts,
            "access_code": "PREVIEW123",
            "width": 800,
            "height": 600,
            "format": "png"
        }
        
        response = requests.post(f"{base_url}/api/generate-selected-charts", json=final_request)
        
        if response.status_code == 200:
            final_result = response.json()
            print(f"   ✅ 最终图表生成成功")
            print(f"   📊 生成了 {len(final_result['charts'])} 个最终图表")
            print(f"   💳 剩余使用次数: {final_result['remaining_usage']}")
            
            for i, chart in enumerate(final_result['charts']):
                print(f"      {i+1}. {chart['chart_name']} ({chart['chart_type']})")
                print(f"         尺寸: {chart['width']}x{chart['height']}")
                print(f"         格式: {chart['format']}")
                print(f"         文件大小: {chart['file_size']} bytes")
        else:
            print(f"   ❌ 最终图表生成失败: {response.status_code}")
            print(f"   错误信息: {response.text}")
            return False
        
        print("\n🎉 预览图生成功能测试完成！")
        return True
        
    except Exception as e:
        print(f"❌ 测试过程中发生异常: {e}")
        return False
    
    finally:
        # 清理测试文件
        if os.path.exists(test_file):
            os.remove(test_file)
            print(f"🧹 清理测试文件: {test_file}")

def test_error_scenarios():
    """测试错误场景"""
    print("\n🧪 测试错误场景...")
    
    base_url = "http://localhost:8000"
    
    # 测试1: 不存在的文件
    print("\n❌ 测试不存在的文件...")
    preview_request = {
        "file_path": "/nonexistent/file.xlsx",
        "chart_types": ["bar", "line"]
    }
    
    response = requests.post(f"{base_url}/api/generate-previews", json=preview_request)
    if response.status_code == 404:
        print("   ✅ 正确返回404错误")
    else:
        print(f"   ❌ 期望404，实际得到: {response.status_code}")
    
    # 测试2: 无效的访问码
    print("\n❌ 测试无效的访问码...")
    final_request = {
        "file_path": "/some/path.xlsx",  # 文件路径不重要，因为访问码验证会先失败
        "selected_chart_types": ["bar"],
        "access_code": "INVALID_CODE"
    }
    
    response = requests.post(f"{base_url}/api/generate-selected-charts", json=final_request)
    if response.status_code == 400:
        print("   ✅ 正确返回400错误")
    else:
        print(f"   ❌ 期望400，实际得到: {response.status_code}")

if __name__ == "__main__":
    print("=" * 60)
    print("测试新的预览图生成和选中图表生成功能")
    print("=" * 60)
    
    # 测试主要功能
    success = test_preview_workflow()
    
    # 测试错误场景
    test_error_scenarios()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ 所有测试通过！")
    else:
        print("❌ 部分测试失败")
    print("=" * 60)