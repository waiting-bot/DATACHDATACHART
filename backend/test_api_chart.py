#!/usr/bin/env python3
"""
API测试脚本 - 专门测试数据生成图表功能
"""

import requests
import json

def test_chart_generation_api():
    """测试图表生成API"""
    print("🧪 测试图表生成API...")
    
    base_url = "http://localhost:8000"
    
    # 测试数据
    test_data = {
        "access_code": "TEST123",
        "chart_type": "bar",
        "chart_data": {
            "data": [
                {"label": "A", "value": 10},
                {"label": "B", "value": 20},
                {"label": "C", "value": 15}
            ],
            "columns": ["label", "value"]
        },
        "chart_title": "API测试图表",
        "width": 600,
        "height": 400,
        "format": "png"
    }
    
    print(f"请求数据: {json.dumps(test_data, indent=2, ensure_ascii=False)}")
    
    try:
        response = requests.post(f"{base_url}/api/generate-chart-from-data", json=test_data)
        
        print(f"响应状态码: {response.status_code}")
        print(f"响应头: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ API调用成功")
            print(f"响应数据: {json.dumps(result, indent=2, ensure_ascii=False)}")
            
            if result.get('success'):
                print(f"✅ 图表生成成功")
                if 'image_data' in result:
                    print(f"图片数据长度: {len(result['image_data'])}")
            else:
                print(f"❌ 图表生成失败: {result.get('message')}")
        else:
            print(f"❌ API调用失败: {response.text}")
            
    except Exception as e:
        print(f"❌ API调用异常: {e}")

if __name__ == "__main__":
    test_chart_generation_api()