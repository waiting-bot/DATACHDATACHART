"""
数据模型定义
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional
import logging

from .database import Base

logger = logging.getLogger(__name__)

class AccessCode(Base):
    """
    访问码模型
    用于控制用户访问次数和权限
    """
    __tablename__ = "access_codes"
    
    id = Column(Integer, primary_key=True, index=True)
    access_code = Column(String(50), unique=True, nullable=False, index=True, comment="访问码")
    max_usage = Column(Integer, nullable=False, comment="最大使用次数")
    usage_count = Column(Integer, default=0, nullable=False, comment="已使用次数")
    is_active = Column(Boolean, default=True, nullable=False, comment="是否激活")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="更新时间")
    expires_at = Column(DateTime(timezone=True), nullable=True, comment="过期时间")
    description = Column(Text, nullable=True, comment="描述")
    created_by = Column(String(100), nullable=True, comment="创建者")
    
    # 关联关系
    usage_logs = relationship("UsageLog", back_populates="access_code", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<AccessCode(id={self.id}, code={self.access_code}, usage={self.usage_count}/{self.max_usage})>"
    
    def is_valid(self) -> bool:
        """检查访问码是否有效"""
        if not self.is_active:
            return False
        
        if self.usage_count >= self.max_usage:
            return False
        
        if self.expires_at and self.expires_at < datetime.utcnow():
            return False
        
        return True
    
    def can_use(self) -> bool:
        """检查是否可以使用访问码"""
        return self.is_valid() and self.usage_count < self.max_usage
    
    def increment_usage(self) -> bool:
        """增加使用次数"""
        if self.can_use():
            self.usage_count += 1
            return True
        return False
    
    @property
    def remaining_usage(self) -> int:
        """获取剩余使用次数"""
        return max(0, self.max_usage - self.usage_count)
    
    @property
    def status(self) -> str:
        """获取访问码状态"""
        if not self.is_active:
            return "inactive"
        if self.usage_count >= self.max_usage:
            return "exhausted"
        if self.expires_at and self.expires_at < datetime.utcnow():
            return "expired"
        return "active"

class UsageLog(Base):
    """
    使用记录模型
    记录每次访问码的使用情况
    """
    __tablename__ = "usage_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    access_code_id = Column(Integer, ForeignKey("access_codes.id"), nullable=False, comment="访问码ID")
    ip_address = Column(String(45), nullable=True, comment="IP地址")
    user_agent = Column(Text, nullable=True, comment="用户代理")
    file_name = Column(String(255), nullable=True, comment="上传的文件名")
    file_size = Column(Integer, nullable=True, comment="文件大小（字节）")
    chart_type = Column(String(50), nullable=True, comment="生成的图表类型")
    success = Column(Boolean, default=False, nullable=False, comment="是否成功")
    error_message = Column(Text, nullable=True, comment="错误信息")
    processing_time = Column(Integer, nullable=True, comment="处理时间（毫秒）")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    
    # 关联关系
    access_code = relationship("AccessCode", back_populates="usage_logs")
    
    def __repr__(self):
        return f"<UsageLog(id={self.id}, access_code_id={self.access_code_id}, success={self.success})>"

class SystemConfig(Base):
    """
    系统配置模型
    存储系统级别的配置信息
    """
    __tablename__ = "system_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True, comment="配置键")
    value = Column(Text, nullable=False, comment="配置值")
    description = Column(Text, nullable=True, comment="配置描述")
    is_active = Column(Boolean, default=True, nullable=False, comment="是否激活")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="更新时间")
    
    def __repr__(self):
        return f"<SystemConfig(key={self.key}, value={self.value[:50]}...)>"


# 创建索引以提高查询性能
Index("idx_access_codes_code_active", AccessCode.access_code, AccessCode.is_active)
Index("idx_usage_logs_access_code_created", UsageLog.access_code_id, UsageLog.created_at)
Index("idx_usage_logs_success_created", UsageLog.success, UsageLog.created_at)
Index("idx_system_configs_key_active", SystemConfig.key, SystemConfig.is_active)