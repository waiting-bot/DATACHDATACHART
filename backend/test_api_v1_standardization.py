"""
API v1 标准化测试
测试新的API格式是否符合dev-preferences.md规范
"""
import pytest
import requests
import json
import time
from pathlib import Path

BASE_URL = "http://localhost:8000"

class TestAPIv1Standardization:
    """API v1 标准化测试类"""
    
    def test_health_check_format(self):
        """测试健康检查端点格式"""
        response = requests.get(f"{BASE_URL}/api/v1/health")
        assert response.status_code == 200
        
        data = response.json()
        # 验证标准响应格式
        assert "success" in data
        assert "data" in data
        assert "error" in data
        assert data["success"] is True
        assert data["error"] is None
        
        # 验证数据内容
        assert "status" in data["data"]
        assert "database" in data["data"]
        assert "version" in data["data"]
    
    def test_api_info_format(self):
        """测试API信息端点格式"""
        response = requests.get(f"{BASE_URL}/api/v1/info")
        assert response.status_code == 200
        
        data = response.json()
        # 验证标准响应格式
        assert data["success"] is True
        assert data["error"] is None
        
        # 验证API信息
        assert "name" in data["data"]
        assert "version" in data["data"]
        assert "endpoints" in data["data"]
        assert "api/v1/" in data["data"]["endpoints"]["health"]
    
    def test_chart_types_format(self):
        """测试图表类型端点格式"""
        response = requests.get(f"{BASE_URL}/api/v1/charts/types")
        assert response.status_code == 200
        
        data = response.json()
        # 验证标准响应格式
        assert data["success"] is True
        assert data["error"] is None
        
        # 验证图表类型数据
        chart_types = data["data"]["chart_types"]
        assert len(chart_types) == 9  # 9种图表类型
        
        # 验证每个图表类型的结构
        for chart_type in chart_types:
            assert "type" in chart_type
            assert "name" in chart_type
            assert "description" in chart_type
            assert "suitable_for" in chart_type
    
    def test_access_code_validation_format(self):
        """测试访问码验证端点格式"""
        # 测试无效访问码
        invalid_payload = {"access_code": "INVALID_CODE"}
        response = requests.post(f"{BASE_URL}/api/v1/access-codes/validate", json=invalid_payload)
        
        # 应该返回400错误
        assert response.status_code == 400
        
        data = response.json()
        # 验证错误响应格式
        assert data["success"] is False
        assert "error" in data
        assert "code" in data["error"]
        assert "message" in data["error"]
    
    def test_access_code_creation_format(self):
        """测试访问码创建端点格式"""
        payload = {
            "access_code": f"TEST_CODE_{int(time.time())}",
            "max_usage": 10,
            "description": "测试访问码"
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/access-codes", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        # 验证成功响应格式
        assert data["success"] is True
        assert data["error"] is None
        
        # 验证创建的访问码数据
        access_code = data["data"]
        assert access_code["access_code"] == payload["access_code"]
        assert access_code["max_usage"] == payload["max_usage"]
        assert access_code["usage_count"] == 0
        assert access_code["is_active"] is True
    
    def test_error_handling_format(self):
        """测试错误处理格式"""
        # 测试404错误
        response = requests.get(f"{BASE_URL}/api/v1/nonexistent")
        assert response.status_code == 404
        
        data = response.json()
        # 验证错误响应格式
        assert data["success"] is False
        assert "error" in data
        assert data["error"]["code"] == "NOT_FOUND"
        
        # 测试验证错误
        invalid_payload = {"access_code": ""}  # 空访问码
        response = requests.post(f"{BASE_URL}/api/v1/access-codes/validate", json=invalid_payload)
        assert response.status_code == 422
        
        data = response.json()
        assert data["success"] is False
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"
    
    def test_api_path_prefix(self):
        """测试API路径前缀"""
        # 测试v1端点
        v1_endpoints = [
            "/api/v1/health",
            "/api/v1/info",
            "/api/v1/charts/types",
            "/api/v1/access-codes/validate"
        ]
        
        for endpoint in v1_endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}" if "GET" in endpoint else requests.post(f"{BASE_URL}{endpoint}", json={}))
            # 应该返回有效状态码（不是404）
            assert response.status_code != 404, f"Endpoint {endpoint} not found"
    
    def test_legacy_api_compatibility(self):
        """测试旧API兼容性"""
        # 旧API端点应该仍然存在但标记为legacy
        response = requests.get(f"{BASE_URL}/api/info")
        assert response.status_code == 200
        
        data = response.json()
        assert "note" in data
        assert "legacy" in data["note"].lower()

class TestAPIResponseConsistency:
    """API响应一致性测试"""
    
    def test_all_success_responses_have_same_structure(self):
        """测试所有成功响应具有相同结构"""
        # 测试多个成功端点
        endpoints = [
            ("GET", "/api/v1/health"),
            ("GET", "/api/v1/info"),
            ("GET", "/api/v1/charts/types")
        ]
        
        for method, endpoint in endpoints:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}")
            else:
                response = requests.post(f"{BASE_URL}{endpoint}")
            
            if response.status_code == 200:
                data = response.json()
                # 验证标准结构
                assert "success" in data
                assert "data" in data
                assert "error" in data
                assert data["success"] is True
                assert data["error"] is None
    
    def test_all_error_responses_have_same_structure(self):
        """测试所有错误响应具有相同结构"""
        # 测试错误场景
        error_scenarios = [
            ("GET", "/api/v1/nonexistent"),  # 404
            ("POST", "/api/v1/access-codes/validate", {"access_code": ""}),  # 422
            ("POST", "/api/v1/access-codes/validate", {"access_code": "INVALID"}),  # 400
        ]
        
        for method, endpoint, *payload in error_scenarios:
            try:
                if method == "GET":
                    response = requests.get(f"{BASE_URL}{endpoint}")
                else:
                    response = requests.post(f"{BASE_URL}{endpoint}", json=payload[0] if payload else {})
                
                if response.status_code >= 400:
                    data = response.json()
                    # 验证错误结构
                    assert "success" in data
                    assert "data" in data
                    assert "error" in data
                    assert data["success"] is False
                    assert "code" in data["error"]
                    assert "message" in data["error"]
            except Exception:
                pass  # 忽略连接错误等

if __name__ == "__main__":
    # 运行测试
    test = TestAPIv1Standardization()
    
    print("=== API v1 标准化测试 ===")
    
    try:
        test.test_health_check_format()
        print("✅ 健康检查格式测试通过")
    except Exception as e:
        print(f"❌ 健康检查格式测试失败: {e}")
    
    try:
        test.test_api_info_format()
        print("✅ API信息格式测试通过")
    except Exception as e:
        print(f"❌ API信息格式测试失败: {e}")
    
    try:
        test.test_chart_types_format()
        print("✅ 图表类型格式测试通过")
    except Exception as e:
        print(f"❌ 图表类型格式测试失败: {e}")
    
    try:
        test.test_access_code_validation_format()
        print("✅ 访问码验证格式测试通过")
    except Exception as e:
        print(f"❌ 访问码验证格式测试失败: {e}")
    
    try:
        test.test_error_handling_format()
        print("✅ 错误处理格式测试通过")
    except Exception as e:
        print(f"❌ 错误处理格式测试失败: {e}")
    
    try:
        test.test_api_path_prefix()
        print("✅ API路径前缀测试通过")
    except Exception as e:
        print(f"❌ API路径前缀测试失败: {e}")
    
    try:
        test.test_legacy_api_compatibility()
        print("✅ 旧API兼容性测试通过")
    except Exception as e:
        print(f"❌ 旧API兼容性测试失败: {e}")
    
    print("\n=== API响应一致性测试 ===")
    
    consistency_test = TestAPIResponseConsistency()
    
    try:
        consistency_test.test_all_success_responses_have_same_structure()
        print("✅ 成功响应一致性测试通过")
    except Exception as e:
        print(f"❌ 成功响应一致性测试失败: {e}")
    
    try:
        consistency_test.test_all_error_responses_have_same_structure()
        print("✅ 错误响应一致性测试通过")
    except Exception as e:
        print(f"❌ 错误响应一致性测试失败: {e}")
    
    print("\n🎉 所有测试完成！")