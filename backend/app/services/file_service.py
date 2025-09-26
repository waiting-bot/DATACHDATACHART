"""
文件处理服务
负责文件上传、存储、清理等操作
"""
import os
import shutil
import aiofiles
from pathlib import Path
from typing import Optional, Dict, Any
import logging
from datetime import datetime, timedelta
import asyncio
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from ..utils.file_validator import file_validator
from ..database import get_db
from ..models import UsageLog
from ..schemas import ChartType

logger = logging.getLogger(__name__)

class FileService:
    """文件服务"""
    
    def __init__(self):
        """初始化文件服务"""
        # 基础目录
        self.base_dir = Path(__file__).parent.parent.parent
        self.uploads_dir = self.base_dir / "uploads"
        self.temp_dir = self.uploads_dir / "temp"
        self.processed_dir = self.uploads_dir / "processed"
        
        # 确保目录存在
        self._ensure_directories()
        
        # 文件清理任务
        self.cleanup_task = None
        self.is_cleanup_running = False
    
    def _ensure_directories(self):
        """确保所需目录存在"""
        try:
            self.uploads_dir.mkdir(exist_ok=True)
            self.temp_dir.mkdir(exist_ok=True)
            self.processed_dir.mkdir(exist_ok=True)
            logger.info("文件目录初始化完成")
        except Exception as e:
            logger.error(f"创建文件目录失败: {e}")
            raise
    
    async def save_uploaded_file(
        self, 
        file: UploadFile, 
        access_code: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        保存上传的文件
        
        Args:
            file: 上传的文件
            access_code: 访问码
            db: 数据库会话
            
        Returns:
            文件信息字典
        """
        try:
            # 验证访问码
            from ..services.access_code_service import AccessCodeService
            access_service = AccessCodeService(db)
            
            is_valid, code_record, message = access_service.validate_access_code(access_code)
            if not is_valid:
                raise HTTPException(status_code=400, detail=message)
            
            # 检查使用次数
            if not code_record.can_use():
                raise HTTPException(status_code=400, detail="访问码使用次数已用完")
            
            # 生成安全文件名
            safe_filename = file_validator.generate_safe_filename(file.filename)
            
            # 构建文件路径
            file_path = self.temp_dir / safe_filename
            
            # 保存文件
            async with aiofiles.open(file_path, 'wb') as buffer:
                # 分块读取和写入，避免内存问题
                chunk_size = 1024 * 1024  # 1MB
                file_size = 0
                
                while True:
                    chunk = await file.read(chunk_size)
                    if not chunk:
                        break
                    await buffer.write(chunk)
                    file_size += len(chunk)
            
            # 验证文件
            is_valid, validation_message, validation_details = file_validator.full_validation(
                str(file_path), file.filename, file_size
            )
            
            if not is_valid:
                # 删除无效文件
                await self.delete_file(file_path)
                raise HTTPException(status_code=400, detail=validation_message)
            
            # 记录上传日志
            usage_log = UsageLog(
                access_code_id=code_record.id,
                file_name=safe_filename,
                file_size=file_size,
                success=True,
                ip_address="127.0.0.1",  # 可以从请求中获取
                user_agent="FileUpload"    # 可以从请求中获取
            )
            
            db.add(usage_log)
            db.commit()
            
            logger.info(f"文件上传成功: {safe_filename}, 大小: {file_size} bytes")
            
            return {
                "filename": safe_filename,
                "original_filename": file.filename,
                "file_path": str(file_path),
                "file_size": file_size,
                "validation_details": validation_details,
                "remaining_usage": code_record.remaining_usage
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"文件上传失败: {e}")
            raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")
    
    async def delete_file(self, file_path: Path) -> bool:
        """
        删除文件
        
        Args:
            file_path: 文件路径
            
        Returns:
            是否删除成功
        """
        try:
            if file_path.exists():
                file_path.unlink()
                logger.info(f"文件删除成功: {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"删除文件失败: {e}")
            return False
    
    async def move_to_processed(self, file_path: Path, new_filename: Optional[str] = None) -> Path:
        """
        将文件移动到已处理目录
        
        Args:
            file_path: 原文件路径
            new_filename: 新文件名（可选）
            
        Returns:
            新文件路径
        """
        try:
            if not file_path.exists():
                raise FileNotFoundError(f"文件不存在: {file_path}")
            
            if new_filename is None:
                new_filename = file_path.name
            
            new_path = self.processed_dir / new_filename
            
            # 确保目标目录存在
            new_path.parent.mkdir(exist_ok=True)
            
            # 移动文件
            shutil.move(str(file_path), str(new_path))
            
            logger.info(f"文件移动成功: {file_path} -> {new_path}")
            return new_path
            
        except Exception as e:
            logger.error(f"移动文件失败: {e}")
            raise
    
    def get_file_info(self, file_path: Path) -> Dict[str, Any]:
        """
        获取文件信息
        
        Args:
            file_path: 文件路径
            
        Returns:
            文件信息字典
        """
        try:
            if not file_path.exists():
                return {"exists": False}
            
            stat = file_path.stat()
            
            return {
                "exists": True,
                "size": stat.st_size,
                "created_time": datetime.fromtimestamp(stat.st_ctime),
                "modified_time": datetime.fromtimestamp(stat.st_mtime),
                "is_file": file_path.is_file(),
                "extension": file_path.suffix.lower()
            }
            
        except Exception as e:
            logger.error(f"获取文件信息失败: {e}")
            return {"exists": False, "error": str(e)}
    
    async def cleanup_old_files(self, hours: int = 6):
        """
        清理旧文件
        
        Args:
            hours: 清理多少小时前的文件（默认6小时）
        """
        try:
            cutoff_time = datetime.now() - timedelta(hours=hours)
            cleaned_count = 0
            total_size = 0
            
            # 清理临时文件（更积极的清理）
            for file_path in self.temp_dir.rglob("*"):
                if file_path.is_file():
                    file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                    file_size = file_path.stat().st_size
                    
                    # 临时文件超过1小时就清理
                    if file_time < cutoff_time:
                        total_size += file_size
                        await self.delete_file(file_path)
                        cleaned_count += 1
            
            # 清理已处理文件
            for file_path in self.processed_dir.rglob("*"):
                if file_path.is_file():
                    file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                    file_size = file_path.stat().st_size
                    
                    # 已处理文件超过6小时清理
                    if file_time < cutoff_time:
                        total_size += file_size
                        await self.delete_file(file_path)
                        cleaned_count += 1
            
            # 检查磁盘空间
            await self._check_disk_space()
            
            if cleaned_count > 0:
                logger.info(f"清理完成，删除了 {cleaned_count} 个旧文件，释放 {total_size/1024/1024:.2f} MB 空间")
            else:
                logger.debug("没有需要清理的文件")
            
        except Exception as e:
            logger.error(f"清理文件失败: {e}")
    
    async def _check_disk_space(self):
        """检查磁盘空间并在需要时强制清理"""
        try:
            import shutil
            
            # 获取上传目录的磁盘使用情况
            total, used, free = shutil.disk_usage(self.uploads_dir)
            free_gb = free / (1024**3)
            usage_percent = (used / total) * 100
            
            # 磁盘空间告警阈值
            warning_threshold = 80  # 80%
            critical_threshold = 90  # 90%
            
            if usage_percent >= critical_threshold:
                logger.warning(f"磁盘空间严重不足: 使用率 {usage_percent:.1f}%, 剩余 {free_gb:.1f} GB")
                # 强制清理所有超过1小时的文件
                await self._emergency_cleanup()
            elif usage_percent >= warning_threshold:
                logger.warning(f"磁盘空间不足: 使用率 {usage_percent:.1f}%, 剩余 {free_gb:.1f} GB")
                # 积极清理超过30分钟的文件
                await self._aggressive_cleanup()
            
        except Exception as e:
            logger.error(f"检查磁盘空间失败: {e}")
    
    async def _emergency_cleanup(self):
        """紧急清理：删除所有超过1小时的文件"""
        try:
            cleaned_count = 0
            cutoff_time = datetime.now() - timedelta(hours=1)
            
            for directory in [self.temp_dir, self.processed_dir]:
                for file_path in directory.rglob("*"):
                    if file_path.is_file():
                        file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                        if file_time < cutoff_time:
                            await self.delete_file(file_path)
                            cleaned_count += 1
            
            logger.warning(f"紧急清理完成，删除了 {cleaned_count} 个文件")
            
        except Exception as e:
            logger.error(f"紧急清理失败: {e}")
    
    async def _aggressive_cleanup(self):
        """积极清理：删除所有超过30分钟的文件"""
        try:
            cleaned_count = 0
            cutoff_time = datetime.now() - timedelta(minutes=30)
            
            for directory in [self.temp_dir, self.processed_dir]:
                for file_path in directory.rglob("*"):
                    if file_path.is_file():
                        file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                        if file_time < cutoff_time:
                            await self.delete_file(file_path)
                            cleaned_count += 1
            
            logger.info(f"积极清理完成，删除了 {cleaned_count} 个文件")
            
        except Exception as e:
            logger.error(f"积极清理失败: {e}")
    
    async def start_cleanup_task(self):
        """启动文件清理任务"""
        if self.is_cleanup_running:
            return
        
        self.is_cleanup_running = True
        logger.info("启动文件清理任务")
        
        async def cleanup_worker():
            while self.is_cleanup_running:
                try:
                    await self.cleanup_old_files()
                    await asyncio.sleep(1800)  # 每30分钟清理一次
                except Exception as e:
                    logger.error(f"文件清理任务异常: {e}")
                    # 出错时等待5分钟后重试
                    await asyncio.sleep(300)  # 出错后等待5分钟再重试
        
        self.cleanup_task = asyncio.create_task(cleanup_worker())
    
    async def stop_cleanup_task(self):
        """停止文件清理任务"""
        self.is_cleanup_running = False
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
        logger.info("文件清理任务已停止")
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """
        获取存储统计信息
        
        Returns:
            存储统计信息
        """
        try:
            def get_directory_size(directory: Path) -> int:
                """获取目录大小"""
                return sum(f.stat().st_size for f in directory.rglob('*') if f.is_file())
            
            def count_files(directory: Path) -> int:
                """计算文件数量"""
                return len(list(directory.rglob('*'))) - len(list(directory.rglob('*'))) // 2  # 简化计算
            
            return {
                "temp_files": count_files(self.temp_dir),
                "processed_files": count_files(self.processed_dir),
                "temp_size_bytes": get_directory_size(self.temp_dir),
                "processed_size_bytes": get_directory_size(self.processed_dir),
                "total_size_bytes": get_directory_size(self.uploads_dir),
                "temp_size_mb": get_directory_size(self.temp_dir) / (1024 * 1024),
                "processed_size_mb": get_directory_size(self.processed_dir) / (1024 * 1024),
                "total_size_mb": get_directory_size(self.uploads_dir) / (1024 * 1024)
            }
            
        except Exception as e:
            logger.error(f"获取存储统计失败: {e}")
            return {"error": str(e)}
    
    async def validate_and_process_file(
        self, 
        file_path: Path,
        original_filename: str
    ) -> Dict[str, Any]:
        """
        验证并处理文件
        
        Args:
            file_path: 文件路径
            original_filename: 原始文件名
            
        Returns:
            处理结果
        """
        try:
            # 获取文件信息
            file_info = self.get_file_info(file_path)
            
            if not file_info.get("exists", False):
                return {"success": False, "message": "文件不存在"}
            
            file_size = file_info.get("size", 0)
            
            # 验证文件
            is_valid, validation_message, validation_details = file_validator.full_validation(
                str(file_path), original_filename, file_size
            )
            
            if not is_valid:
                return {
                    "success": False,
                    "message": validation_message,
                    "validation_details": validation_details
                }
            
            # 移动到已处理目录
            processed_path = await self.move_to_processed(file_path)
            
            return {
                "success": True,
                "message": "文件处理成功",
                "processed_path": str(processed_path),
                "validation_details": validation_details,
                "file_info": file_info
            }
            
        except Exception as e:
            logger.error(f"文件处理失败: {e}")
            return {"success": False, "message": f"文件处理失败: {str(e)}"}


# 创建全局文件服务实例
file_service = FileService()