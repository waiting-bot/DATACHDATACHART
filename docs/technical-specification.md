# 智能图表生成工具 - 技术方案文档

## 1. 项目概述

### 1.1 项目目标
开发一个智能图表生成工具（MVP），允许用户上传Excel文件并自动生成PNG/SVG格式透明背景图表。系统通过访问码控制生成次数，面向小红书虚拟产品销售，支持Web和移动端访问。

### 1.2 核心需求
- **文件上传**: 支持Excel文件上传，文件大小限制10MB
- **图表生成**: 支持柱状图、折线图、饼图等多种类型，透明背景
- **访问控制**: 每个访问码限制使用次数（10/30/50次）
- **数据安全**: Excel文件处理后立即删除，访问码信息安全存储
- **响应式设计**: 支持Web和移动端访问

## 2. 技术架构

### 2.1 整体架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│  (Vercel)       │◄──►│  (DigitalOcean) │◄──►│  (PostgreSQL)   │
│                 │    │                 │    │                 │
│ • React + TS    │    │ • FastAPI       │    │ • 访问码表       │
│ • Vite          │    │ • SQLAlchemy    │    │ • 使用记录表     │
│ • Tailwind      │    │ • Plotly        │    │                 │
│ • Zustand       │    │ • Pandas        │    │                 │
│ • PWA           │    │ • Redis         │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2.2 技术栈选择

#### 前端技术栈
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **状态管理**: Zustand (为未来复杂状态做准备)
- **PWA支持**: Workbox + Service Worker
- **部署**: Vercel

#### 后端技术栈
- **框架**: FastAPI
- **数据库**: PostgreSQL 15
- **ORM**: SQLAlchemy 2.0
- **任务队列**: Celery + Redis
- **图表生成**: Plotly
- **文件处理**: Pandas + openpyxl
- **部署**: DigitalOcean VPS + Docker

## 3. 系统设计

### 3.1 数据库设计

#### 访问码表
```sql
CREATE TABLE access_codes (
    id SERIAL PRIMARY KEY,
    access_code VARCHAR(50) UNIQUE NOT NULL,
    max_usage INTEGER NOT NULL,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    last_used_at TIMESTAMP NULL
);

-- 添加索引优化查询性能
CREATE INDEX idx_access_codes_code ON access_codes(access_code);
CREATE INDEX idx_access_codes_active ON access_codes(is_active) WHERE is_active = true;
```

#### 使用记录表
```sql
CREATE TABLE usage_logs (
    id SERIAL PRIMARY KEY,
    access_code_id INTEGER REFERENCES access_codes(id),
    ip_address INET,
    user_agent TEXT,
    chart_type VARCHAR(20),
    file_size INTEGER,
    processing_time INTEGER,
    status VARCHAR(20),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引优化查询性能
CREATE INDEX idx_usage_logs_code_id ON usage_logs(access_code_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
```

### 3.2 API设计

#### 认证和验证
```python
# API端点设计
POST /api/validate-access-code      # 验证访问码
POST /api/generate-chart          # 生成图表
GET  /api/usage-status            # 获取使用状态
GET  /api/chart-types             # 获取支持的图表类型
```

#### 请求/响应格式
```typescript
// 验证访问码请求
interface ValidateAccessCodeRequest {
  access_code: string;
}

// 验证访问码响应
interface ValidateAccessCodeResponse {
  valid: boolean;
  remaining_uses: number;
  max_usage: number;
  expires_at?: string;
}

// 生成图表请求
interface GenerateChartRequest {
  access_code: string;
  chart_type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
}

// 生成图表响应
interface GenerateChartResponse {
  success: boolean;
  chart?: {
    image: string;  // base64编码
    format: 'png' | 'svg';
    chart_type: string;
  };
  remaining_uses: number;
  error?: string;
}
```

### 3.3 前端组件设计

#### 核心组件结构
```
src/
├── components/
│   ├── AccessCodeForm.tsx         # 访问码输入表单
│   ├── FileUpload.tsx            # 文件上传组件
│   ├── ChartDisplay.tsx          # 图表显示组件
│   ├── UsageTracker.tsx          # 使用次数追踪
│   └── LoadingSpinner.tsx        # 加载状态
├── hooks/
│   ├── useAccessCode.ts          # 访问码管理hook
│   ├── useFileUpload.ts          # 文件上传hook
│   └── useChartGeneration.ts     # 图表生成hook
├── stores/
│   └── appStore.ts               # Zustand状态管理
├── services/
│   └── api.ts                    # API服务层
└── utils/
    ├── validators.ts             # 验证工具
    └── constants.ts              # 常量定义
```

## 4. 核心功能实现

### 4.1 访问码并发控制

#### 数据库行级锁实现
```python
from sqlalchemy import select, update
from sqlalchemy.orm import with_for_update
from contextlib import contextmanager

@contextmanager
def get_access_code_lock(db: Session, code_id: int):
    """获取访问码行级锁"""
    try:
        db.begin()
        # 获取行级锁
        code = db.execute(
            select(AccessCode)
            .where(AccessCode.id == code_id)
            .with_for_update(nowait=True)  # 立即获取锁，不等待
        ).scalar_one()
        
        yield code
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

def increment_usage_safe(db: Session, access_code: str) -> dict:
    """线程安全的访问码使用次数更新"""
    # 先获取访问码信息
    code = db.execute(
        select(AccessCode)
        .where(AccessCode.access_code == access_code)
        .where(AccessCode.is_active == True)
    ).scalar_one_or_none()
    
    if not code:
        raise HTTPException(status_code=404, detail="访问码不存在")
    
    # 检查是否过期
    if code.expires_at and code.expires_at < datetime.now():
        raise HTTPException(status_code=400, detail="访问码已过期")
    
    # 使用行级锁更新使用次数
    with get_access_code_lock(db, code.id):
        if code.usage_count >= code.max_usage:
            raise HTTPException(status_code=400, detail="使用次数已达上限")
        
        code.usage_count += 1
        code.last_used_at = datetime.now()
        db.commit()
    
    return {
        'remaining_uses': code.max_usage - code.usage_count,
        'max_usage': code.max_usage
    }
```

### 4.2 文件安全验证

#### 多层文件验证机制
```python
import magic
import os
import pandas as pd
from pathlib import Path
from typing import Tuple

def validate_excel_file(file_path: str, max_size_mb: int = 10) -> Tuple[bool, str]:
    """多层Excel文件验证"""
    
    # 1. 文件大小检查
    file_size = os.path.getsize(file_path)
    if file_size > max_size_mb * 1024 * 1024:
        return False, f"文件大小超过{max_size_mb}MB限制"
    
    # 2. 文件扩展名检查
    allowed_extensions = ['.xlsx', '.xls']
    if not any(file_path.lower().endswith(ext) for ext in allowed_extensions):
        return False, "仅支持.xlsx和.xls格式文件"
    
    # 3. Magic number检查
    try:
        mime = magic.Magic(mime=True)
        file_mime = mime.from_file(file_path)
        
        allowed_mimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ]
        
        if file_mime not in allowed_mimes:
            return False, "文件类型不正确"
    except Exception as e:
        return False, f"文件类型验证失败: {str(e)}"
    
    # 4. 文件结构检查
    try:
        with open(file_path, 'rb') as f:
            header = f.read(4)
            if header not in [b'PK\x03\x04', b'\xD0\xCF\x11\xE0']:
                return False, "无效的Excel文件格式"
    except Exception as e:
        return False, f"文件结构检查失败: {str(e)}"
    
    # 5. 内容验证（尝试解析）
    try:
        df = pd.read_excel(file_path, nrows=5)
        if df.empty:
            return False, "Excel文件为空或无法解析"
        
        # 检查是否有足够的数据
        if len(df.columns) < 2:
            return False, "Excel文件至少需要2列数据"
            
    except Exception as e:
        return False, f"Excel文件解析失败: {str(e)}"
    
    return True, "文件验证通过"

def secure_file_handling(upload_file: UploadFile) -> str:
    """安全文件处理"""
    # 生成安全的文件名
    file_extension = Path(upload_file.filename).suffix
    secure_filename = f"{secrets.token_urlsafe(16)}{file_extension}"
    
    # 创建上传目录
    upload_dir = Path("/tmp/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_dir / secure_filename
    
    # 保存文件
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    
    # 验证文件
    is_valid, message = validate_excel_file(str(file_path))
    if not is_valid:
        # 清理无效文件
        file_path.unlink()
        raise ValueError(message)
    
    return str(file_path)
```

### 4.3 图表生成优化

#### 异步图表生成
```python
from celery import Celery
from celery.result import AsyncResult
import plotly.express as px
import plotly.io as pio
from io import BytesIO
import base64
import time

# Celery配置
celery_app = Celery(
    'chart_generator',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/1'
)

@celery_app.task(bind=True, max_retries=3)
def generate_chart_async(
    self, 
    file_path: str, 
    chart_type: str, 
    access_code: str
) -> dict:
    """异步生成图表"""
    start_time = time.time()
    
    try:
        # 解析Excel文件
        df = pd.read_excel(file_path)
        
        # 数据预处理
        df = preprocess_data(df)
        
        # 生成图表
        fig = create_chart(df, chart_type)
        
        # 设置透明背景
        fig.update_layout(
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            font=dict(color='black')
        )
        
        # 生成图片
        img_bytes = pio.to_image(fig, format='png', width=800, height=600)
        img_base64 = base64.b64encode(img_bytes).decode()
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return {
            'success': True,
            'image': img_base64,
            'format': 'png',
            'chart_type': chart_type,
            'processing_time': processing_time
        }
        
    except Exception as e:
        # 重试机制
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=2 ** self.request.retries)
        
        return {
            'success': False,
            'error': str(e),
            'processing_time': int((time.time() - start_time) * 1000)
        }

def preprocess_data(df: pd.DataFrame) -> pd.DataFrame:
    """数据预处理"""
    # 删除空行
    df = df.dropna(how='all')
    
    # 处理列名
    df.columns = df.columns.str.strip()
    
    # 确保数据类型正确
    for col in df.columns:
        if df[col].dtype == 'object':
            try:
                df[col] = pd.to_numeric(df[col], errors='ignore')
            except:
                pass
    
    return df

def create_chart(df: pd.DataFrame, chart_type: str) -> go.Figure:
    """根据数据类型和用户选择创建图表"""
    
    # 自动检测最佳图表类型
    if chart_type == 'auto':
        chart_type = detect_best_chart_type(df)
    
    # 创建图表
    if chart_type == 'bar':
        fig = px.bar(df, x=df.columns[0], y=df.columns[1])
    elif chart_type == 'line':
        fig = px.line(df, x=df.columns[0], y=df.columns[1])
    elif chart_type == 'pie':
        fig = px.pie(df, names=df.columns[0], values=df.columns[1])
    elif chart_type == 'scatter':
        fig = px.scatter(df, x=df.columns[0], y=df.columns[1])
    elif chart_type == 'area':
        fig = px.area(df, x=df.columns[0], y=df.columns[1])
    else:
        fig = px.bar(df, x=df.columns[0], y=df.columns[1])
    
    return fig

def detect_best_chart_type(df: pd.DataFrame) -> str:
    """自动检测最适合的图表类型"""
    numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
    
    if len(numeric_cols) >= 2:
        return 'scatter'
    elif len(categorical_cols) >= 1 and len(numeric_cols) >= 1:
        return 'bar'
    else:
        return 'bar'
```

## 5. 性能优化

### 5.1 缓存策略

#### Redis缓存配置
```python
import redis
from typing import Optional, Dict, Any
import json

class CacheManager:
    def __init__(self, redis_url: str = "redis://localhost:6379/2"):
        self.redis_client = redis.from_url(redis_url)
    
    def get_access_code_info(self, access_code: str) -> Optional[Dict[str, Any]]:
        """获取访问码缓存信息"""
        cache_key = f"access_code:{access_code}"
        cached_data = self.redis_client.get(cache_key)
        
        if cached_data:
            return json.loads(cached_data)
        return None
    
    def set_access_code_info(self, access_code: str, info: Dict[str, Any], expire_seconds: int = 300):
        """设置访问码缓存信息"""
        cache_key = f"access_code:{access_code}"
        self.redis_client.setex(
            cache_key, 
            expire_seconds, 
            json.dumps(info)
        )
    
    def invalidate_access_code_cache(self, access_code: str):
        """使访问码缓存失效"""
        cache_key = f"access_code:{access_code}"
        self.redis_client.delete(cache_key)

# 使用示例
cache_manager = CacheManager()

def get_access_code_with_cache(db: Session, access_code: str) -> Dict[str, Any]:
    """带缓存的访问码获取"""
    # 先检查缓存
    cached_info = cache_manager.get_access_code_info(access_code)
    if cached_info:
        return cached_info
    
    # 缓存未命中，查询数据库
    code = db.execute(
        select(AccessCode)
        .where(AccessCode.access_code == access_code)
        .where(AccessCode.is_active == True)
    ).scalar_one_or_none()
    
    if not code:
        raise HTTPException(status_code=404, detail="访问码不存在")
    
    info = {
        'id': code.id,
        'max_usage': code.max_usage,
        'usage_count': code.usage_count,
        'remaining_uses': code.max_usage - code.usage_count,
        'expires_at': code.expires_at.isoformat() if code.expires_at else None
    }
    
    # 设置缓存
    cache_manager.set_access_code_info(access_code, info)
    
    return info
```

### 5.2 限流和监控

#### API限流配置
```python
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

# 限流器配置
limiter = Limiter(key_func=get_remote_address)

# 自定义限流异常处理
@app.exception_handler(RateLimitExceeded)
async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "请求过于频繁，请稍后再试"}
    )

# 不同端点的限流策略
@app.post("/api/validate-access-code")
@limiter.limit("10/minute")  # 每分钟10次
async def validate_access_code_endpoint(request: Request):
    pass

@app.post("/api/generate-chart")
@limiter.limit("5/minute")   # 每分钟5次
async def generate_chart_endpoint(request: Request):
    pass

@app.get("/api/usage-status")
@limiter.limit("30/minute")  # 每分钟30次
async def usage_status_endpoint(request: Request):
    pass
```

#### 性能监控
```python
import time
import psutil
import logging
from prometheus_client import Counter, Histogram, Gauge
from prometheus_fastapi_instrumentator import Instrumentator

# Prometheus指标
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')
ACTIVE_USERS = Gauge('active_users', 'Number of active users')
CPU_USAGE = Gauge('cpu_usage_percent', 'CPU usage percentage')
MEMORY_USAGE = Gauge('memory_usage_percent', 'Memory usage percentage')

# 性能监控中间件
@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    start_time = time.time()
    
    # 记录请求计数
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path
    ).inc()
    
    response = await call_next(request)
    
    # 记录请求耗时
    REQUEST_DURATION.observe(time.time() - start_time)
    
    # 系统资源监控
    CPU_USAGE.set(psutil.cpu_percent())
    MEMORY_USAGE.set(psutil.virtual_memory().percent)
    
    # 资源告警
    if psutil.cpu_percent() > 80:
        logging.warning(f"高CPU使用率: {psutil.cpu_percent()}%")
    
    if psutil.virtual_memory().percent > 80:
        logging.warning(f"高内存使用率: {psutil.virtual_memory().percent}%")
    
    return response

# 集成Prometheus
Instrumentator().instrument(app).expose(app)
```

## 6. 部署配置

### 6.1 Docker容器化

#### Dockerfile
```dockerfile
# 使用官方Python运行时作为父镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libmagic1 \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建非root用户
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# 设置环境变量
ENV PYTHONPATH=/app
ENV UPLOAD_DIR=/tmp/uploads
ENV MAX_WORKERS=4

# 创建上传目录
RUN mkdir -p $UPLOAD_DIR

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/chartdb
      - REDIS_URL=redis://redis:6379/0
      - UPLOAD_DIR=/tmp/uploads
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/tmp/uploads
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=chartdb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

  celery:
    build: .
    command: celery -A app.celery_app worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/chartdb
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

### 6.2 Nginx配置

#### nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:8000;
    }

    # 基本配置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # 文件上传配置
    client_max_body_size 10M;
    client_body_timeout 60s;
    client_header_timeout 60s;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 限流配置
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=5r/m;

    server {
        listen 80;
        server_name api.yourdomain.com;

        # 重定向到HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.yourdomain.com;

        # SSL配置
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # 限流规则
        location /api/validate-access-code {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 60s;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
        }

        location /api/generate-chart {
            limit_req zone=upload burst=10 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 120s;
            proxy_connect_timeout 120s;
            proxy_send_timeout 120s;
        }

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 60s;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
        }

        # 健康检查
        location /health {
            proxy_pass http://app/health;
            access_log off;
        }
    }
}
```

### 6.3 前端部署配置

#### Vercel配置
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "env": {
    "REACT_APP_API_URL": "https://api.yourdomain.com",
    "REACT_APP_MAX_FILE_SIZE": "10",
    "REACT_APP_SUPPORTED_FORMATS": ".xlsx,.xls"
  },
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

## 7. 安全配置

### 7.1 环境变量配置

#### .env.example
```bash
# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/chartdb

# Redis配置
REDIS_URL=redis://localhost:6379/0

# 应用配置
SECRET_KEY=your-secret-key-here
UPLOAD_DIR=/tmp/uploads
MAX_FILE_SIZE=10485760  # 10MB

# CORS配置
CORS_ORIGINS=https://your-frontend-domain.com

# 监控配置
ENABLE_METRICS=true
LOG_LEVEL=INFO

# 安全配置
ACCESS_CODE_LENGTH=12
RATE_LIMIT_ENABLED=true
```

### 7.2 安全中间件

```python
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.gzip import GZipMiddleware

# 安全中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["api.yourdomain.com", "localhost"]
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

## 8. 监控和日志

### 8.1 日志配置

```python
import logging
from logging.handlers import RotatingFileHandler

# 日志配置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(
            'logs/app.log',
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        ),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# 结构化日志
import structlog
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)
```

### 8.2 健康检查

```python
@app.get("/health")
async def health_check():
    """健康检查端点"""
    try:
        # 检查数据库连接
        db.execute("SELECT 1")
        
        # 检查Redis连接
        redis_client.ping()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
```

## 9. 测试策略

### 9.1 单元测试

#### pytest配置
```python
# conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import get_db
from app.main import app

# 测试数据库
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def test_access_code(db):
    """创建测试访问码"""
    code = AccessCode(
        access_code="TEST123",
        max_usage=10,
        usage_count=0
    )
    db.add(code)
    db.commit()
    db.refresh(code)
    return code
```

### 9.2 集成测试

```python
# test_api_integration.py
def test_chart_generation_flow(client, test_access_code):
    """测试完整的图表生成流程"""
    
    # 1. 验证访问码
    response = client.post(
        "/api/validate-access-code",
        json={"access_code": "TEST123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["remaining_uses"] == 10
    
    # 2. 生成图表
    with open("test_data.xlsx", "rb") as f:
        files = {"file": ("test.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        data = {
            "access_code": "TEST123",
            "chart_type": "bar"
        }
        response = client.post("/api/generate-chart", files=files, data=data)
    
    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True
    assert "chart" in result
    assert result["remaining_uses"] == 9
```

## 10. 实施计划

### 10.1 开发阶段

#### Phase 1: 核心功能开发 (2-3周)
- [ ] 项目基础架构搭建
- [ ] 数据库设计和实现
- [ ] 访问码管理功能
- [ ] 文件上传和验证
- [ ] 基础图表生成功能
- [ ] 前端界面开发

#### Phase 2: 安全和性能优化 (1-2周)
- [ ] 并发控制机制
- [ ] 文件安全验证
- [ ] 缓存策略实现
- [ ] 限流和监控
- [ ] 异步任务处理

#### Phase 3: 生产环境部署 (1周)
- [ ] Docker容器化
- [ ] Nginx配置
- [ ] Vercel前端部署
- [ ] DigitalOcean后端部署
- [ ] 监控和日志配置

### 10.2 测试阶段

#### 单元测试 (3-5天)
- [ ] 访问码管理测试
- [ ] 文件验证测试
- [ ] 图表生成测试
- [ ] API接口测试

#### 集成测试 (2-3天)
- [ ] 完整流程测试
- [ ] 性能测试
- [ ] 安全测试
- [ ] 兼容性测试

#### 用户验收测试 (1-2天)
- [ ] 功能验证
- [ ] 用户体验测试
- [ ] 移动端适配测试

### 10.3 上线准备

#### 生产环境配置 (1-2天)
- [ ] 域名和SSL证书配置
- [ ] 数据库备份策略
- [ ] 监控告警配置
- [ ] 文档完善

#### 部署和验证 (1天)
- [ ] 生产环境部署
- [ ] 功能验证
- [ ] 性能监控
- [ ] 问题修复

## 11. 风险评估和应对

### 11.1 技术风险

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| 文件上传安全漏洞 | 高 | 中 | 多层验证 + 文件类型限制 + 病毒扫描 |
| 数据库并发问题 | 高 | 中 | 行级锁 + 事务处理 + 重试机制 |
| 性能瓶颈 | 中 | 高 | 异步处理 + 缓存 + 限流 + 监控 |
| 部署失败 | 中 | 低 | 容器化 + 自动化部署 + 回滚机制 |

### 11.2 业务风险

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| 用户体验不佳 | 高 | 中 | 响应式设计 + 加载优化 + 错误处理 |
| 访问码泄露 | 高 | 低 | 一次性使用 + IP限制 + 使用监控 |
| 服务器成本超支 | 中 | 中 | 资源监控 + 成本优化 + 自动扩容 |

## 12. 总结

本技术方案提供了一个完整的智能图表生成工具实现方案，涵盖了从需求分析到部署上线的全过程。方案重点关注：

1. **安全性**: 多层文件验证、访问码控制、并发安全
2. **性能**: 异步处理、缓存策略、限流机制
3. **可靠性**: 错误处理、重试机制、监控告警
4. **可扩展性**: 模块化设计、容器化部署、自动化运维

该方案能够满足MVP阶段的快速上线需求，同时为后续功能扩展提供了良好的架构基础。