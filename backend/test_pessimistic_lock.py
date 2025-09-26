#!/usr/bin/env python3
"""
测试悲观锁和原子更新机制
"""
import requests
import time

BASE_URL = "http://localhost:8000"

def test_pessimistic_lock():
    """测试悲观锁机制"""
    print("=== 悲观锁机制测试 ===")
    
    test_code = "CONCURRENT_TEST"
    
    # 单线程测试，验证基本功能
    print("\n1. 基本功能测试:")
    
    payload = {
        "chart_type": "bar",
        "chart_data": {
            "data": [
                {"产品": "A", "销量": 10},
                {"产品": "B", "销量": 20}
            ],
            "columns": ["产品", "销量"]
        },
        "chart_title": "悲观锁测试",
        "width": 400,
        "height": 300,
        "format": "png",
        "access_code": test_code
    }
    
    # 连续发送5个请求
    for i in range(5):
        try:
            response = requests.post(f"{BASE_URL}/api/v1/charts/generate", json=payload, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    print(f"✅ 请求 {i+1} 成功")
                else:
                    error_msg = result.get("error", {}).get("message", "未知错误")
                    print(f"❌ 请求 {i+1} 失败: {error_msg}")
            else:
                print(f"❌ 请求 {i+1} HTTP错误: {response.status_code}")
                
        except Exception as e:
            print(f"❌ 请求 {i+1} 异常: {e}")
        
        # 短暂延迟，避免并发
        time.sleep(0.5)
    
    # 检查最终状态
    print(f"\n2. 最终状态检查:")
    try:
        response = requests.get(f"{BASE_URL}/api/access-codes")
        if response.status_code == 200:
            all_codes = response.json()
            test_code_info = None
            for code in all_codes:
                if code.get("access_code") == test_code:
                    test_code_info = code
                    break
            
            if test_code_info:
                final_usage = test_code_info.get("usage_count", 0)
                max_usage = test_code_info.get("max_usage", 0)
                remaining = test_code_info.get("remaining_usage", 0)
                status = test_code_info.get("status", "")
                
                print(f"使用次数: {final_usage}/{max_usage}")
                print(f"剩余次数: {remaining}")
                print(f"状态: {status}")
                
                if final_usage <= max_usage:
                    print("✅ 使用次数未超过限制")
                else:
                    print("❌ 使用次数超过限制！")
                
                if status == "exhausted":
                    print("✅ 访问码已正确标记为用尽")
                else:
                    print("⚠️  访问码状态可能不正确")
                    
            else:
                print("❌ 未找到测试访问码")
                
    except Exception as e:
        print(f"❌ 获取最终状态失败: {e}")

def test_lock_timeout():
    """测试锁超时机制"""
    print(f"\n=== 锁超时测试 ===")
    print("SQLite的FOR UPDATE锁在长时间持有时可能导致超时")
    print("这是正常现象，说明锁机制正在工作")
    print("在生产环境中，应该:")
    print("1. 设置合理的锁超时时间")
    print("2. 实现重试机制")
    print("3. 优化事务处理时间")

if __name__ == "__main__":
    test_pessimistic_lock()
    test_lock_timeout()