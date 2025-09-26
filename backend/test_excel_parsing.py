#!/usr/bin/env python3
"""
Excel解析测试
"""

import pandas as pd
from app.services.excel_service import excel_parser

def test_excel_parsing():
    """测试Excel解析功能"""
    print("📋 测试Excel解析功能...")
    
    # 创建测试Excel文件
    test_data = pd.DataFrame({
        '产品': ['产品A', '产品B', '产品C', '产品D', '产品E'],
        '销量': [120, 190, 300, 250, 150]
    })
    
    excel_file = 'test_parsing.xlsx'
    test_data.to_excel(excel_file, index=False)
    print(f"✅ 创建测试Excel文件: {excel_file}")
    
    # 测试解析
    try:
        result = excel_parser.full_parse(excel_file, 'bar')
        
        print(f"解析结果: {result}")
        print(f"成功: {result.get('success')}")
        print(f"消息: {result.get('message')}")
        print(f"图表数据: {result.get('chart_data', {})}")
        
        if result.get('success'):
            chart_data = result.get('chart_data', {})
            print(f"数据: {chart_data.get('data', [])[:3]}...")  # 只显示前3个
            print(f"列: {chart_data.get('columns', [])}")
        
    except Exception as e:
        print(f"❌ Excel解析异常: {e}")
        import traceback
        traceback.print_exc()
    
    # 清理文件
    import os
    if os.path.exists(excel_file):
        os.remove(excel_file)
        print(f"🧹 清理测试文件: {excel_file}")

if __name__ == "__main__":
    test_excel_parsing()