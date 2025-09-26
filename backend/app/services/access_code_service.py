"""
数据库操作服务
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging

from ..models import AccessCode, UsageLog, SystemConfig
from ..database import db_manager
from ..schemas import AccessCodeCreate, AccessCodeUpdate

from app.logging_config import get_logger
logger = get_logger(__name__)

class AccessCodeService:
    """访问码服务"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_access_code(self, access_code_data: AccessCodeCreate) -> AccessCode:
        """创建访问码"""
        try:
            access_code = AccessCode(
                access_code=access_code_data.access_code,
                max_usage=access_code_data.max_usage,
                description=access_code_data.description,
                expires_at=access_code_data.expires_at,
                created_by=access_code_data.created_by
            )
            
            self.db.add(access_code)
            self.db.commit()
            self.db.refresh(access_code)
            
            logger.info(f"创建访问码成功: {access_code.access_code}")
            return access_code
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"创建访问码失败: {e}")
            raise
    
    def get_access_code_by_code(self, access_code: str) -> Optional[AccessCode]:
        """根据访问码获取记录"""
        return self.db.query(AccessCode).filter(
            AccessCode.access_code == access_code
        ).first()
    
    def get_access_code_by_id(self, access_code_id: int) -> Optional[AccessCode]:
        """根据ID获取访问码"""
        return self.db.query(AccessCode).filter(
            AccessCode.id == access_code_id
        ).first()
    
    def validate_access_code(self, access_code: str) -> tuple[bool, Optional[AccessCode], str]:
        """验证访问码"""
        try:
            code_record = self.get_access_code_by_code(access_code)
            
            if not code_record:
                return False, None, "访问码不存在"
            
            if not code_record.is_valid():
                if code_record.status == "inactive":
                    return False, code_record, "访问码已被禁用"
                elif code_record.status == "exhausted":
                    return False, code_record, "访问码使用次数已用完"
                elif code_record.status == "expired":
                    return False, code_record, "访问码已过期"
                else:
                    return False, code_record, "访问码无效"
            
            return True, code_record, "访问码有效"
            
        except Exception as e:
            logger.error(f"验证访问码失败: {e}")
            return False, None, "验证失败"
    
    def use_access_code(self, access_code: str, ip_address: str = None, 
                       user_agent: str = None) -> tuple[bool, str, Optional[AccessCode]]:
        """使用访问码（并发安全版本）"""
        try:
            # 使用原子性操作避免并发问题
            from sqlalchemy import text
            
            # 先获取访问码记录
            code_record = self.get_access_code_by_code(access_code)
            if not code_record:
                return False, "访问码不存在", None
            
            # 验证访问码状态
            if not code_record.is_valid():
                if code_record.status == "exhausted":
                    return False, "访问码使用次数已达上限", code_record
                elif code_record.status == "expired":
                    return False, "访问码已过期", code_record
                else:
                    return False, "访问码无效", code_record
            
            # 使用原子性更新操作（SQLite兼容版本）
            update_query = text("""
                UPDATE access_codes 
                SET usage_count = usage_count + 1, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id AND usage_count < max_usage
                RETURNING usage_count
            """)
            
            result = self.db.execute(update_query, {"id": code_record.id})
            updated_row = result.fetchone()
            
            # 检查是否更新成功
            if not updated_row:
                return False, "访问码使用次数已达上限", code_record
            
            new_usage_count = updated_row[0]
            
            # 刷新对象状态
            self.db.refresh(code_record)
            
            # 验证更新结果
            if new_usage_count > code_record.max_usage:
                self.db.rollback()
                return False, "访问码使用次数已达上限", code_record
            
            # 记录使用日志
            usage_log = UsageLog(
                access_code_id=code_record.id,
                ip_address=ip_address,
                user_agent=user_agent,
                success=True,
                created_at=datetime.utcnow()
            )
            
            self.db.add(usage_log)
            self.db.commit()
            
            logger.info(f"访问码使用成功: {access_code}, 使用次数: {code_record.usage_count}")
            return True, "使用成功", code_record
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"使用访问码失败: {e}")
            return False, f"使用失败: {str(e)}", None
    
    def get_all_access_codes(self, skip: int = 0, limit: int = 100) -> List[AccessCode]:
        """获取所有访问码"""
        return self.db.query(AccessCode).offset(skip).limit(limit).all()
    
    def get_active_access_codes(self, skip: int = 0, limit: int = 100) -> List[AccessCode]:
        """获取所有激活的访问码"""
        return self.db.query(AccessCode).filter(
            AccessCode.is_active == True
        ).offset(skip).limit(limit).all()
    
    def update_access_code(self, access_code_id: int, update_data: AccessCodeUpdate) -> Optional[AccessCode]:
        """更新访问码"""
        try:
            access_code = self.get_access_code_by_id(access_code_id)
            if not access_code:
                return None
            
            update_dict = update_data.dict(exclude_unset=True)
            for field, value in update_dict.items():
                setattr(access_code, field, value)
            
            self.db.commit()
            self.db.refresh(access_code)
            
            logger.info(f"更新访问码成功: {access_code.access_code}")
            return access_code
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"更新访问码失败: {e}")
            raise
    
    def delete_access_code(self, access_code_id: int) -> bool:
        """删除访问码"""
        try:
            access_code = self.get_access_code_by_id(access_code_id)
            if not access_code:
                return False
            
            self.db.delete(access_code)
            self.db.commit()
            
            logger.info(f"删除访问码成功: {access_code.access_code}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"删除访问码失败: {e}")
            raise
    
    def get_access_code_statistics(self) -> Dict[str, Any]:
        """获取访问码统计信息"""
        try:
            total_codes = self.db.query(AccessCode).count()
            active_codes = self.db.query(AccessCode).filter(AccessCode.is_active == True).count()
            total_usage = self.db.query(AccessCode).with_entities(AccessCode.usage_count).all()
            total_usage_count = sum(usage[0] for usage in total_usage)
            
            # 计算剩余使用次数
            remaining_usage = 0
            active_codes_list = self.get_active_access_codes()
            for code in active_codes_list:
                remaining_usage += code.remaining_usage
            
            return {
                "total_codes": total_codes,
                "active_codes": active_codes,
                "total_usage": total_usage_count,
                "remaining_usage": remaining_usage,
                "usage_rate": (total_usage_count / (total_usage_count + remaining_usage) * 100) if (total_usage_count + remaining_usage) > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return {}

class UsageLogService:
    """使用记录服务"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_usage_log(self, access_code_id: int, **kwargs) -> UsageLog:
        """创建使用记录"""
        try:
            usage_log = UsageLog(
                access_code_id=access_code_id,
                **kwargs
            )
            
            self.db.add(usage_log)
            self.db.commit()
            self.db.refresh(usage_log)
            
            return usage_log
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"创建使用记录失败: {e}")
            raise
    
    def get_usage_logs(self, access_code_id: int = None, skip: int = 0, limit: int = 100) -> List[UsageLog]:
        """获取使用记录"""
        query = self.db.query(UsageLog)
        
        if access_code_id:
            query = query.filter(UsageLog.access_code_id == access_code_id)
        
        return query.order_by(desc(UsageLog.created_at)).offset(skip).limit(limit).all()
    
    def get_usage_statistics(self, days: int = 30) -> Dict[str, Any]:
        """获取使用统计"""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # 最近30天的使用记录
            recent_logs = self.db.query(UsageLog).filter(
                UsageLog.created_at >= start_date
            ).all()
            
            total_attempts = len(recent_logs)
            successful_attempts = len([log for log in recent_logs if log.success])
            failed_attempts = total_attempts - successful_attempts
            
            # 按图表类型统计
            chart_types = {}
            for log in recent_logs:
                if log.chart_type:
                    chart_types[log.chart_type] = chart_types.get(log.chart_type, 0) + 1
            
            return {
                "total_attempts": total_attempts,
                "successful_attempts": successful_attempts,
                "failed_attempts": failed_attempts,
                "success_rate": (successful_attempts / total_attempts * 100) if total_attempts > 0 else 0,
                "chart_types": chart_types,
                "period_days": days
            }
            
        except Exception as e:
            logger.error(f"获取使用统计失败: {e}")
            return {}

class SystemConfigService:
    """系统配置服务"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_config(self, key: str) -> Optional[SystemConfig]:
        """获取配置"""
        return self.db.query(SystemConfig).filter(
            and_(SystemConfig.key == key, SystemConfig.is_active == True)
        ).first()
    
    def set_config(self, key: str, value: str, description: str = None) -> SystemConfig:
        """设置配置"""
        try:
            config = self.get_config(key)
            
            if config:
                config.value = value
                if description:
                    config.description = description
            else:
                config = SystemConfig(
                    key=key,
                    value=value,
                    description=description
                )
                self.db.add(config)
            
            self.db.commit()
            self.db.refresh(config)
            
            return config
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"设置配置失败: {e}")
            raise
    
    def delete_config(self, key: str) -> bool:
        """删除配置"""
        try:
            config = self.get_config(key)
            if not config:
                return False
            
            config.is_active = False
            self.db.commit()
            
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"删除配置失败: {e}")
            raise