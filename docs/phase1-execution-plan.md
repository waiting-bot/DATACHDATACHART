# Phase 1 开发执行计划

## 技术栈确认

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **包管理器**: npm
- **状态管理**: Zustand
- **样式**: Tailwind CSS
- **HTTP客户端**: Axios
- **图标**: Lucide React
- **部署**: Vercel

### 后端
- **语言**: Python 3.10
- **框架**: FastAPI
- **数据库**: PostgreSQL (生产) / SQLite (开发)
- **ORM**: SQLAlchemy
- **文件处理**: pandas + openpyxl
- **图表生成**: Plotly
- **部署**: DigitalOcean VPS

### API设计
- **风格**: REST
- **数据格式**: JSON
- **错误处理**: 统一JSON错误格式

## 开发环境设置

### 前端依赖安装
```bash
cd frontend
npm install zustand axios lucide-react @types/node
npm install -D tailwindcss postcss autoprefixer @tailwindcss/typography
npx tailwindcss init -p
```

### 后端环境设置
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy pandas openpyxl plotly python-magic psycopg2-binary pydantic
```

## 项目结构规划

### 前端结构
```
frontend/
├── src/
│   ├── components/
│   │   ├── AccessCodeForm.tsx
│   │   ├── FileUpload.tsx
│   │   ├── ChartDisplay.tsx
│   │   └── UsageTracker.tsx
│   ├── hooks/
│   │   ├── useAccessCode.ts
│   │   ├── useFileUpload.ts
│   │   └── useChartGeneration.ts
│   ├── stores/
│   │   └── appStore.ts
│   ├── services/
│   │   └── api.ts
│   ├── utils/
│   │   ├── validators.ts
│   │   └── constants.ts
│   └── types/
│       └── index.ts
├── public/
├── .env
└── package.json
```

### 后端结构
```
backend/
├── app/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── database.py
│   ├── services/
│   │   ├── access_code_service.py
│   │   ├── file_service.py
│   │   └── chart_service.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── access_codes.py
│   │   └── charts.py
│   └── utils/
│       ├── file_utils.py
│       └── validators.py
├── requirements.txt
├── .env
└── alembic/
```

## 核心功能实现顺序

### 1. 前端基础设置 (优先级: 高)
- [ ] 安装并配置Tailwind CSS
- [ ] 创建Zustand状态管理
- [ ] 配置API服务层
- [ ] 设置环境变量
- [ ] 创建基础组件结构

### 2. 后端基础设置 (优先级: 高)
- [ ] 创建FastAPI应用结构
- [ ] 配置数据库连接
- [ ] 创建数据模型
- [ ] 实现基础CRUD操作
- [ ] 配置CORS和中间件

### 3. 访问码管理 (优先级: 高)
- [ ] 实现访问码生成和验证
- [ ] 创建并发控制机制
- [ ] 前端访问码输入组件
- [ ] API集成和错误处理

### 4. 文件上传和验证 (优先级: 中)
- [ ] 实现安全文件上传
- [ ] 添加文件验证机制
- [ ] 前端文件上传组件
- [ ] Excel解析功能

### 5. 图表生成 (优先级: 中)
- [ ] 实现Plotly图表生成
- [ ] 支持透明背景
- [ ] 多种图表类型
- [ ] 前端图表显示

### 6. 用户界面 (优先级: 中)
- [ ] 主界面布局
- [ ] 响应式设计
- [ ] 移动端适配
- [ ] PWA配置

## 环境变量配置

### 前端 .env
```env
VITE_API_URL=http://localhost:8000
VITE_MAX_FILE_SIZE=10
VITE_SUPPORTED_FORMATS=.xlsx,.xls
```

### 后端 .env
```env
DATABASE_URL=sqlite:///./chart.db  # 开发环境
# DATABASE_URL=postgresql://user:password@localhost/chartdb  # 生产环境
SECRET_KEY=your-secret-key-here
UPLOAD_DIR=/tmp/uploads
MAX_FILE_SIZE=10485760  # 10MB
CORS_ORIGINS=http://localhost:5173
```

## 开发里程碑

### Week 1 目标
- [ ] 完成前端基础设置
- [ ] 完成后端基础设置
- [ ] 实现访问码管理功能

### Week 2 目标
- [ ] 完成文件上传和验证
- [ ] 完成图表生成功能
- [ ] 基础用户界面

### Week 3 目标
- [ ] 完善用户界面
- [ ] 添加错误处理
- [ ] 优化用户体验

## 关键技术要点

### 前端
- 使用Zustand进行状态管理，避免Prop drilling
- 实现拖拽上传文件功能
- 添加加载状态和错误处理
- 使用Tailwind CSS实现响应式设计

### 后端
- 使用SQLAlchemy ORM进行数据库操作
- 实现文件安全验证(magic numbers)
- 使用Plotly生成透明背景图表
- 实现并发控制机制

### 数据库
- 设计访问码和使用记录表
- 添加适当索引优化查询
- 实现事务处理确保数据一致性

## 质量保证

### 代码规范
- 使用ESLint和Prettier格式化前端代码
- 使用Black格式化Python代码
- 添加TypeScript类型检查
- 编写单元测试

### 安全考虑
- 文件上传安全验证
- 访问码并发控制
- 输入验证和清理
- 错误信息不暴露敏感信息

## 下一步行动

1. **立即执行**: 安装前端依赖包
2. **并行执行**: 设置后端Python环境
3. **优先开发**: 访问码管理功能
4. **持续集成**: 定期测试和验证

---

**创建时间**: 2025-09-25
**预计完成**: 2025-10-16 (3周)
**负责人**: 开发团队