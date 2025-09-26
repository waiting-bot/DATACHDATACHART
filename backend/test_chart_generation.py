#!/usr/bin/env python3
"""
图表生成功能测试脚本
测试所有图表类型和API接口
"""

import requests
import json
import pandas as pd
import time
from pathlib import Path

# API配置
BASE_URL = "http://localhost:8000"
API_URLS = {
    "health": f"{BASE_URL}/health",
    "validate_access_code": f"{BASE_URL}/api/validate-access-code",
    "create_access_code": f"{BASE_URL}/api/access-codes",
    "generate_chart": f"{BASE_URL}/api/generate-chart",
    "generate_chart_from_data": f"{BASE_URL}/api/generate-chart-from-data",
    "chart_suggestions": f"{BASE_URL}/api/chart-suggestions",
    "chart_types": f"{BASE_URL}/api/chart-types"
}

def create_test_excel_file():
    """创建测试用的Excel文件"""
    print("📊 创建测试Excel文件...")
    
    # 柱状图测试数据
    bar_data = pd.DataFrame({
        '产品': ['产品A', '产品B', '产品C', '产品D', '产品E'],
        '销量': [120, 190, 300, 250, 150]
    })
    
    # 折线图测试数据
    line_data = pd.DataFrame({
        '月份': ['1月', '2月', '3月', '4月', '5月', '6月'],
        '销售额': [100, 120, 150, 140, 180, 200],
        '利润': [20, 25, 35, 30, 40, 45]
    })
    
    # 饼图测试数据
    pie_data = pd.DataFrame({
        '分类': ['A类', 'B类', 'C类', 'D类'],
        '占比': [30, 25, 25, 20]
    })
    
    # 散点图测试数据
    scatter_data = pd.DataFrame({
        'X值': [1, 2, 3, 4, 5, 6, 7, 8],
        'Y值': [2, 4, 5, 7, 8, 10, 12, 13]
    })
    
    # 热力图测试数据（相关系数矩阵）
    heatmap_data = pd.DataFrame({
        'A': [1.0, 0.8, 0.3, 0.5],
        'B': [0.8, 1.0, 0.2, 0.6],
        'C': [0.3, 0.2, 1.0, 0.1],
        'D': [0.5, 0.6, 0.1, 1.0]
    }, index=['A', 'B', 'C', 'D'])
    
    # 箱线图测试数据
    box_data = pd.DataFrame({
        '组别': ['A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'C', 'C', 'C', 'C', 'C'],
        '数值': [10, 12, 15, 11, 13, 20, 22, 25, 21, 23, 30, 32, 35, 31, 33]
    })
    
    # 创建多个工作表
    with pd.ExcelWriter('test_data.xlsx') as writer:
        bar_data.to_excel(writer, sheet_name='柱状图数据', index=False)
        line_data.to_excel(writer, sheet_name='折线图数据', index=False)
        pie_data.to_excel(writer, sheet_name='饼图数据', index=False)
        scatter_data.to_excel(writer, sheet_name='散点图数据', index=False)
        heatmap_data.to_excel(writer, sheet_name='热力图数据')
        box_data.to_excel(writer, sheet_name='箱线图数据', index=False)
    
    print("✅ 测试Excel文件创建完成: test_data.xlsx")
    return 'test_data.xlsx'

def test_health_check():
    """测试健康检查接口"""
    print("\n🔍 测试健康检查接口...")
    try:
        response = requests.get(API_URLS["health"])
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 健康检查通过: {data}")
            return True
        else:
            print(f"❌ 健康检查失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 健康检查异常: {e}")
        return False

def test_create_access_code():
    """创建测试访问码"""
    print("\n🔑 创建测试访问码...")
    try:
        access_code_data = {
            "access_code": "TEST123",
            "max_usage": 50,
            "description": "图表生成测试用访问码"
        }
        
        response = requests.post(API_URLS["create_access_code"], json=access_code_data)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 访问码创建成功: {data}")
            return access_code_data["access_code"]
        else:
            print(f"❌ 访问码创建失败: {response.status_code}, {response.text}")
            # 如果已存在，直接使用
            return access_code_data["access_code"]
    except Exception as e:
        print(f"❌ 访问码创建异常: {e}")
        return "TEST123"  # 默认值

def test_chart_types():
    """测试图表类型接口"""
    print("\n📋 测试图表类型接口...")
    try:
        response = requests.get(API_URLS["chart_types"])
        if response.status_code == 200:
            data = response.json()
            chart_types = [ct["type"] for ct in data["chart_types"]]
            print(f"✅ 支持的图表类型: {chart_types}")
            return chart_types
        else:
            print(f"❌ 图表类型查询失败: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ 图表类型查询异常: {e}")
        return []

def test_chart_generation_with_file(access_code, excel_file):
    """测试文件上传和图表生成"""
    print(f"\n📈 测试文件上传和图表生成...")
    chart_types = ["bar", "line", "pie", "scatter", "area", "heatmap", "box", "violin", "histogram"]
    
    results = {}
    
    for chart_type in chart_types:
        print(f"  测试图表类型: {chart_type}")
        try:
            with open(excel_file, 'rb') as f:
                files = {'file': f}
                data = {
                    'access_code': access_code,
                    'chart_type': chart_type,
                    'chart_title': f'{chart_type.upper()}图表测试',
                    'width': 800,
                    'height': 600,
                    'format': 'png'
                }
                
                start_time = time.time()
                response = requests.post(API_URLS["generate_chart"], files=files, data=data)
                end_time = time.time()
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        results[chart_type] = {
                            'success': True,
                            'processing_time': round(end_time - start_time, 2),
                            'remaining_usage': result.get('remaining_usage'),
                            'format': result.get('chart_data', {}).get('format')
                        }
                        print(f"    ✅ {chart_type} 生成成功 ({results[chart_type]['processing_time']}s)")
                    else:
                        results[chart_type] = {
                            'success': False,
                            'error': result.get('message', '未知错误')
                        }
                        print(f"    ❌ {chart_type} 生成失败: {results[chart_type]['error']}")
                else:
                    results[chart_type] = {
                        'success': False,
                        'error': f"HTTP {response.status_code}: {response.text}"
                    }
                    print(f"    ❌ {chart_type} HTTP错误: {results[chart_type]['error']}")
                    
        except Exception as e:
            results[chart_type] = {
                'success': False,
                'error': str(e)
            }
            print(f"    ❌ {chart_type} 异常: {results[chart_type]['error']}")
    
    return results

def test_chart_generation_from_data(access_code):
    """测试从数据生成图表"""
    print(f"\n📊 测试从数据生成图表...")
    
    test_data_sets = {
        "bar": {
            "data": [
                {"label": "A", "value": 10},
                {"label": "B", "value": 20},
                {"label": "C", "value": 15}
            ],
            "columns": ["label", "value"]
        },
        "line": {
            "data": [
                {"x": 1, "y": 10},
                {"x": 2, "y": 15},
                {"x": 3, "y": 12},
                {"x": 4, "y": 18}
            ],
            "columns": ["x", "y"]
        },
        "pie": {
            "data": [
                {"category": "类型A", "amount": 30},
                {"category": "类型B", "amount": 45},
                {"category": "类型C", "amount": 25}
            ],
            "columns": ["category", "amount"]
        }
    }
    
    results = {}
    
    for chart_type, chart_data in test_data_sets.items():
        print(f"  测试数据生成 {chart_type} 图表...")
        try:
            request_data = {
                "access_code": access_code,
                "chart_type": chart_type,
                "chart_data": chart_data,
                "chart_title": f'数据生成{chart_type.upper()}图表',
                "width": 600,
                "height": 400,
                "format": "png"
            }
            
            start_time = time.time()
            response = requests.post(API_URLS["generate_chart_from_data"], json=request_data)
            end_time = time.time()
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    results[chart_type] = {
                        'success': True,
                        'processing_time': round(end_time - start_time, 2)
                    }
                    print(f"    ✅ {chart_type} 数据生成成功 ({results[chart_type]['processing_time']}s)")
                else:
                    results[chart_type] = {
                        'success': False,
                        'error': result.get('message', '未知错误')
                    }
                    print(f"    ❌ {chart_type} 数据生成失败: {results[chart_type]['error']}")
            else:
                results[chart_type] = {
                    'success': False,
                    'error': f"HTTP {response.status_code}: {response.text}"
                }
                print(f"    ❌ {chart_type} HTTP错误: {results[chart_type]['error']}")
                
        except Exception as e:
            results[chart_type] = {
                'success': False,
                'error': str(e)
            }
            print(f"    ❌ {chart_type} 异常: {results[chart_type]['error']}")
    
    return results

def test_chart_suggestions(excel_file):
    """测试图表类型建议"""
    print(f"\n💡 测试图表类型建议...")
    try:
        params = {'file_path': excel_file}
        response = requests.get(API_URLS["chart_suggestions"], params=params)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                suggestions = result.get('suggestions', [])
                print(f"✅ 图表建议获取成功: {suggestions}")
                return suggestions
            else:
                print(f"❌ 图表建议获取失败: {result.get('message')}")
                return []
        else:
            print(f"❌ 图表建议HTTP错误: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ 图表建议异常: {e}")
        return []

def print_test_summary(results):
    """打印测试摘要"""
    print("\n" + "="*60)
    print("📊 图表生成功能测试摘要")
    print("="*60)
    
    # 文件上传图表生成结果
    print("\n📈 文件上传图表生成:")
    successful_charts = [k for k, v in results.get('file_charts', {}).items() if v['success']]
    failed_charts = [k for k, v in results.get('file_charts', {}).items() if not v['success']]
    
    print(f"  ✅ 成功: {len(successful_charts)} 种图表类型")
    print(f"  ❌ 失败: {len(failed_charts)} 种图表类型")
    
    if successful_charts:
        print(f"     成功类型: {', '.join(successful_charts)}")
    
    if failed_charts:
        print(f"     失败类型: {', '.join(failed_charts)}")
        for chart_type in failed_charts:
            error = results['file_charts'][chart_type].get('error', '未知错误')
            print(f"       {chart_type}: {error}")
    
    # 数据生成图表结果
    print("\n📊 数据生成图表:")
    data_results = results.get('data_charts', {})
    successful_data_charts = [k for k, v in data_results.items() if v['success']]
    failed_data_charts = [k for k, v in data_results.items() if not v['success']]
    
    print(f"  ✅ 成功: {len(successful_data_charts)} 种图表类型")
    print(f"  ❌ 失败: {len(failed_data_charts)} 种图表类型")
    
    # 性能统计
    print("\n⚡ 性能统计:")
    all_times = []
    for chart_type, result in results.get('file_charts', {}).items():
        if result['success'] and 'processing_time' in result:
            all_times.append(result['processing_time'])
    
    if all_times:
        avg_time = sum(all_times) / len(all_times)
        max_time = max(all_times)
        min_time = min(all_times)
        print(f"  平均处理时间: {avg_time:.2f}s")
        print(f"  最长处理时间: {max_time:.2f}s")
        print(f"  最短处理时间: {min_time:.2f}s")

def main():
    """主测试函数"""
    print("🚀 开始图表生成功能测试...")
    
    # 测试结果汇总
    test_results = {}
    
    # 1. 健康检查
    if not test_health_check():
        print("❌ 健康检查失败，终止测试")
        return
    
    # 2. 创建测试文件
    excel_file = create_test_excel_file()
    if not Path(excel_file).exists():
        print("❌ 测试文件创建失败，终止测试")
        return
    
    # 3. 创建访问码
    access_code = test_create_access_code()
    
    # 4. 测试图表类型
    chart_types = test_chart_types()
    
    # 5. 测试文件上传和图表生成
    file_chart_results = test_chart_generation_with_file(access_code, excel_file)
    test_results['file_charts'] = file_chart_results
    
    # 6. 测试从数据生成图表
    data_chart_results = test_chart_generation_from_data(access_code)
    test_results['data_charts'] = data_chart_results
    
    # 7. 测试图表建议
    suggestions = test_chart_suggestions(excel_file)
    test_results['suggestions'] = suggestions
    
    # 8. 打印测试摘要
    print_test_summary(test_results)
    
    # 清理测试文件
    try:
        Path(excel_file).unlink()
        print(f"\n🧹 清理测试文件: {excel_file}")
    except:
        pass
    
    print("\n🎉 图表生成功能测试完成!")

if __name__ == "__main__":
    main()