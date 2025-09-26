"""
文件验证工具
用于验证上传的文件是否为安全的Excel文件
"""
import os
from typing import Tuple, Optional
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class FileValidator:
    """文件验证器"""
    
    # 允许的文件类型
    ALLOWED_MIME_TYPES = {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
        'application/vnd.ms-excel',  # .xls
        'application/vnd.ms-excel.sheet.macroEnabled.12',  # .xlsm
        'application/octet-stream'  # 某些Excel文件的通用类型
    }
    
    # 允许的文件扩展名
    ALLOWED_EXTENSIONS = {'.xlsx', '.xls', '.xlsm'}
    
    # Excel文件的Magic number
    EXCEL_MAGIC_NUMBERS = {
        b'\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1',  # DOC/XLS通用头
        b'\x50\x4B\x03\x04',  # ZIP格式 (xlsx是zip格式)
    }
    
    # 文件大小限制 (10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    def __init__(self):
        """初始化文件验证器"""
        # 不使用python-magic，改用文件扩展名和Magic number验证
        pass
    
    def validate_file_extension(self, filename: str) -> Tuple[bool, str]:
        """
        验证文件扩展名
        
        Args:
            filename: 文件名
            
        Returns:
            (is_valid, message)
        """
        try:
            if not filename:
                return False, "文件名不能为空"
            
            file_ext = Path(filename).suffix.lower()
            
            if file_ext not in self.ALLOWED_EXTENSIONS:
                return False, f"不支持的文件类型: {file_ext}，支持的类型: {', '.join(self.ALLOWED_EXTENSIONS)}"
            
            return True, "文件扩展名验证通过"
            
        except Exception as e:
            logger.error(f"文件扩展名验证失败: {e}")
            return False, f"文件扩展名验证失败: {str(e)}"
    
    def validate_file_size(self, file_size: int) -> Tuple[bool, str]:
        """
        验证文件大小
        
        Args:
            file_size: 文件大小（字节）
            
        Returns:
            (is_valid, message)
        """
        try:
            if file_size <= 0:
                return False, "文件大小不能为0或负数"
            
            if file_size > self.MAX_FILE_SIZE:
                return False, f"文件大小超过限制，最大支持 {self.MAX_FILE_SIZE // (1024 * 1024)}MB"
            
            return True, f"文件大小验证通过: {file_size // 1024}KB"
            
        except Exception as e:
            logger.error(f"文件大小验证失败: {e}")
            return False, f"文件大小验证失败: {str(e)}"
    
    def validate_file_mime_type(self, file_path: str) -> Tuple[bool, str]:
        """
        验证文件MIME类型（简化版本，基于文件扩展名）
        
        Args:
            file_path: 文件路径
            
        Returns:
            (is_valid, message)
        """
        try:
            if not os.path.exists(file_path):
                return False, "文件不存在"
            
            # 基于文件扩展名推断MIME类型
            file_ext = Path(file_path).suffix.lower()
            
            mime_type_map = {
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                '.xls': 'application/vnd.ms-excel',
                '.xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12'
            }
            
            mime_type = mime_type_map.get(file_ext, 'application/octet-stream')
            
            if mime_type not in self.ALLOWED_MIME_TYPES:
                return False, f"不支持的文件类型: {mime_type}"
            
            return True, f"文件类型验证通过: {mime_type}"
            
        except Exception as e:
            logger.error(f"文件MIME类型验证失败: {e}")
            return False, f"文件类型验证失败: {str(e)}"
    
    def validate_magic_number(self, file_path: str) -> Tuple[bool, str]:
        """
        验证文件的Magic number
        
        Args:
            file_path: 文件路径
            
        Returns:
            (is_valid, message)
        """
        try:
            if not os.path.exists(file_path):
                return False, "文件不存在"
            
            with open(file_path, 'rb') as f:
                # 读取文件头的前8个字节
                header = f.read(8)
                
            # 检查是否匹配Excel文件的Magic number
            for magic_number in self.EXCEL_MAGIC_NUMBERS:
                if header.startswith(magic_number):
                    return True, "文件Magic number验证通过"
            
            return False, "文件不是有效的Excel文件"
            
        except Exception as e:
            logger.error(f"Magic number验证失败: {e}")
            return False, f"文件格式验证失败: {str(e)}"
    
    def validate_file_content(self, file_path: str) -> Tuple[bool, str]:
        """
        验证文件内容是否为有效的Excel文件
        
        Args:
            file_path: 文件路径
            
        Returns:
            (is_valid, message)
        """
        try:
            # 尝试用pandas读取文件
            import pandas as pd
            
            # 读取文件的前几行来验证
            df = pd.read_excel(file_path, nrows=1)
            
            if df.empty:
                return False, "Excel文件为空或格式不正确"
            
            return True, "文件内容验证通过"
            
        except Exception as e:
            logger.error(f"文件内容验证失败: {e}")
            return False, f"Excel文件格式不正确: {str(e)}"
    
    def validate_filename(self, filename: str) -> Tuple[bool, str]:
        """
        验证文件名安全性
        
        Args:
            filename: 文件名
            
        Returns:
            (is_valid, message)
        """
        try:
            if not filename:
                return False, "文件名不能为空"
            
            # 检查文件名长度
            if len(filename) > 255:
                return False, "文件名过长"
            
            # 检查是否包含危险字符
            dangerous_chars = ['..', '/', '\\', ':', '*', '?', '"', '<', '>', '|']
            for char in dangerous_chars:
                if char in filename:
                    return False, f"文件名包含非法字符: {char}"
            
            # 检查是否为系统文件名
            system_filenames = ['con', 'prn', 'aux', 'nul'] + [f'com{i}' for i in range(1, 10)] + [f'lpt{i}' for i in range(1, 10)]
            if Path(filename).stem.lower() in system_filenames:
                return False, "文件名不能为系统保留名称"
            
            return True, "文件名验证通过"
            
        except Exception as e:
            logger.error(f"文件名验证失败: {e}")
            return False, f"文件名验证失败: {str(e)}"
    
    def full_validation(self, file_path: str, filename: str, file_size: int) -> Tuple[bool, str, dict]:
        """
        完整的文件验证
        
        Args:
            file_path: 文件路径
            filename: 原始文件名
            file_size: 文件大小
            
        Returns:
            (is_valid, message, validation_details)
        """
        validation_details = {}
        
        # 1. 验证文件名
        is_valid, message = self.validate_filename(filename)
        validation_details['filename'] = {'valid': is_valid, 'message': message}
        if not is_valid:
            return False, message, validation_details
        
        # 2. 验证文件扩展名
        is_valid, message = self.validate_file_extension(filename)
        validation_details['extension'] = {'valid': is_valid, 'message': message}
        if not is_valid:
            return False, message, validation_details
        
        # 3. 验证文件大小
        is_valid, message = self.validate_file_size(file_size)
        validation_details['size'] = {'valid': is_valid, 'message': message}
        if not is_valid:
            return False, message, validation_details
        
        # 4. 验证文件是否存在
        if not os.path.exists(file_path):
            return False, "文件不存在", validation_details
        
        # 5. 验证Magic number
        is_valid, message = self.validate_magic_number(file_path)
        validation_details['magic_number'] = {'valid': is_valid, 'message': message}
        if not is_valid:
            return False, message, validation_details
        
        # 6. 验证MIME类型
        is_valid, message = self.validate_file_mime_type(file_path)
        validation_details['mime_type'] = {'valid': is_valid, 'message': message}
        if not is_valid:
            return False, message, validation_details
        
        # 7. 验证文件内容
        is_valid, message = self.validate_file_content(file_path)
        validation_details['content'] = {'valid': is_valid, 'message': message}
        if not is_valid:
            return False, message, validation_details
        
        # 所有验证通过
        return True, "文件验证通过", validation_details
    
    def generate_safe_filename(self, original_filename: str) -> str:
        """
        生成安全的文件名
        
        Args:
            original_filename: 原始文件名
            
        Returns:
            安全的文件名
        """
        try:
            import uuid
            from datetime import datetime
            
            # 获取文件扩展名
            file_ext = Path(original_filename).suffix.lower()
            
            # 生成UUID作为文件名主体
            uuid_str = str(uuid.uuid4())
            
            # 添加时间戳
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # 组合安全文件名
            safe_filename = f"{timestamp}_{uuid_str}{file_ext}"
            
            return safe_filename
            
        except Exception as e:
            logger.error(f"生成安全文件名失败: {e}")
            # 如果生成失败，使用简单的时间戳+随机数
            import random
            return f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{random.randint(1000, 9999)}{Path(original_filename).suffix.lower()}"


# 创建全局验证器实例
file_validator = FileValidator()