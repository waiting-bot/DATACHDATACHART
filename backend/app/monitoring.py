"""
健康检查和监控端点
提供系统状态、性能指标和监控信息
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any, Optional
import psutil
import time
from datetime import datetime, timedelta

from app.database import get_db, check_database_connection
from app.logging_config import get_logger
from app.config import get_settings
from app.exceptions import create_success_response

logger = get_logger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/v1/monitoring", tags=["monitoring"])

def get_system_metrics() -> Dict[str, Any]:
    """获取系统性能指标"""
    try:
        # CPU使用率
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # 内存使用情况
        memory = psutil.virtual_memory()
        memory_total = memory.total
        memory_used = memory.used
        memory_percent = memory.percent
        
        # 磁盘使用情况
        disk = psutil.disk_usage('/')
        disk_total = disk.total
        disk_used = disk.used
        disk_percent = disk.percent
        
        # 网络IO
        net_io = psutil.net_io_counters()
        
        # 进程信息
        process = psutil.Process()
        process_memory = process.memory_info()
        process_cpu = process.cpu_percent()
        
        return {
            "cpu": {
                "percent": cpu_percent,
                "count": cpu_count,
                "load_average": list(psutil.getloadavg()) if hasattr(psutil, 'getloadavg') else None
            },
            "memory": {
                "total": memory_total,
                "used": memory_used,
                "percent": memory_percent,
                "available": memory.available
            },
            "disk": {
                "total": disk_total,
                "used": disk_used,
                "percent": disk_percent,
                "free": disk.free
            },
            "network": {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv
            },
            "process": {
                "memory_rss": process_memory.rss,
                "memory_vms": process_memory.vms,
                "cpu_percent": process_cpu,
                "threads": process.num_threads()
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get system metrics: {e}")
        return {}

def get_application_metrics(db: Session) -> Dict[str, Any]:
    """获取应用程序指标"""
    try:
        # 数据库连接状态
        db_status = check_database_connection()
        
        # 获取访问码统计
        try:
            result = db.execute(text("""
                SELECT 
                    COUNT(*) as total_codes,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_codes,
                    SUM(usage_count) as total_usage,
                    SUM(max_usage) as max_usage_total
                FROM access_codes
            """))
            db_stats = result.fetchone()._asdict() if result else {}
        except Exception as e:
            logger.error(f"Failed to get database stats: {e}")
            db_stats = {}
        
        # 获取最近24小时的请求统计
        try:
            result = db.execute(text("""
                SELECT 
                    COUNT(*) as total_logs,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_logs,
                    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_logs
                FROM usage_logs 
                WHERE created_at >= datetime('now', '-1 day')
            """))
            recent_logs = result.fetchone()._asdict() if result else {}
        except Exception as e:
            logger.error(f"Failed to get recent logs stats: {e}")
            recent_logs = {}
        
        # 获取文件系统统计
        import os
        from pathlib import Path
        
        upload_dir = Path(settings.upload_dir)
        if upload_dir.exists():
            upload_files = list(upload_dir.rglob("*"))
            upload_size = sum(f.stat().st_size for f in upload_files if f.is_file())
        else:
            upload_files = []
            upload_size = 0
        
        return {
            "database": {
                "status": "connected" if db_status else "disconnected",
                "stats": db_stats
            },
            "usage_logs": {
                "recent_24h": recent_logs
            },
            "files": {
                "upload_dir": str(upload_dir),
                "file_count": len(upload_files),
                "total_size_bytes": upload_size
            },
            "application": {
                "version": settings.app_version,
                "debug": settings.debug,
                "uptime_seconds": time.time() - psutil.boot_time()
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get application metrics: {e}")
        return {}

@router.get("/health")
async def health_check():
    """基础健康检查"""
    system_metrics = get_system_metrics()
    
    # 检查关键指标
    cpu_ok = system_metrics.get("cpu", {}).get("percent", 100) < 90
    memory_ok = system_metrics.get("memory", {}).get("percent", 100) < 90
    disk_ok = system_metrics.get("disk", {}).get("percent", 100) < 90
    
    overall_health = cpu_ok and memory_ok and disk_ok
    
    return create_success_response({
        "status": "healthy" if overall_health else "degraded",
        "checks": {
            "cpu": "ok" if cpu_ok else "warning",
            "memory": "ok" if memory_ok else "warning", 
            "disk": "ok" if disk_ok else "warning"
        },
        "timestamp": datetime.utcnow().isoformat()
    })

@router.get("/metrics")
async def get_metrics(db: Session = Depends(get_db)):
    """获取详细性能指标"""
    system_metrics = get_system_metrics()
    app_metrics = get_application_metrics(db)
    
    return create_success_response({
        "system": system_metrics,
        "application": app_metrics,
        "timestamp": datetime.utcnow().isoformat()
    })

@router.get("/metrics/summary")
async def get_metrics_summary(db: Session = Depends(get_db)):
    """获取指标摘要"""
    system_metrics = get_system_metrics()
    app_metrics = get_application_metrics(db)
    
    # 计算关键指标摘要
    summary = {
        "system_health": {
            "cpu_usage_percent": system_metrics.get("cpu", {}).get("percent", 0),
            "memory_usage_percent": system_metrics.get("memory", {}).get("percent", 0),
            "disk_usage_percent": system_metrics.get("disk", {}).get("percent", 0)
        },
        "application_status": {
            "database_connected": app_metrics.get("database", {}).get("status") == "connected",
            "total_access_codes": app_metrics.get("database", {}).get("stats", {}).get("total_codes", 0),
            "active_access_codes": app_metrics.get("database", {}).get("stats", {}).get("active_codes", 0),
            "total_usage_count": app_metrics.get("database", {}).get("stats", {}).get("total_usage", 0)
        },
        "recent_activity": {
            "successful_requests_24h": app_metrics.get("usage_logs", {}).get("recent_24h", {}).get("successful_logs", 0),
            "failed_requests_24h": app_metrics.get("usage_logs", {}).get("recent_24h", {}).get("failed_logs", 0),
            "success_rate_24h": (
                app_metrics.get("usage_logs", {}).get("recent_24h", {}).get("successful_logs", 0) / 
                max(app_metrics.get("usage_logs", {}).get("recent_24h", {}).get("total_logs", 1), 1) * 100
            )
        },
        "file_system": {
            "upload_file_count": app_metrics.get("files", {}).get("file_count", 0),
            "upload_file_size_mb": round(app_metrics.get("files", {}).get("total_size_bytes", 0) / (1024 * 1024), 2)
        },
        "timestamp": datetime.utcnow().isoformat()
    }
    
    return create_success_response(summary)

@router.get("/logs/recent")
async def get_recent_logs(
    limit: int = 100,
    level: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取最近的日志记录"""
    # 这里应该从日志文件或专门的日志表中获取
    # 暂时返回一个示例响应
    return create_success_response({
        "logs": [],
        "limit": limit,
        "level_filter": level,
        "message": "日志查询功能需要专门的日志存储实现",
        "timestamp": datetime.utcnow().isoformat()
    })

@router.get("/status")
async def get_system_status(db: Session = Depends(get_db)):
    """获取完整系统状态"""
    health_data = await health_check()
    metrics_data = await get_metrics(db)
    
    # 确定系统状态
    health_status = health_data["data"]["status"]
    
    # 检查数据库状态
    db_status = metrics_data["data"]["application"]["database"]["status"]
    
    # 确定整体状态
    if health_status == "healthy" and db_status == "connected":
        overall_status = "operational"
    elif health_status == "degraded" or db_status == "disconnected":
        overall_status = "degraded"
    else:
        overall_status = "critical"
    
    return create_success_response({
        "overall_status": overall_status,
        "components": {
            "health": health_status,
            "database": db_status,
            "application": "running"
        },
        "last_updated": datetime.utcnow().isoformat(),
        "uptime_seconds": time.time() - psutil.boot_time()
    })