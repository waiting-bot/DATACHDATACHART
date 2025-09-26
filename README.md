# 智能图表生成工具

基于用户上传的Excel文件自动生成图表（PNG/SVG透明背景）的智能工具，通过访问码控制生成次数，面向小红书虚拟产品销售。

## 项目特点

- 🚀 **快速响应**: 基于现代化技术栈，提供流畅的用户体验
- 🔒 **安全可靠**: 多层文件验证，访问码控制，数据安全保障
- 📱 **跨平台**: 支持Web和移动端访问，响应式设计
- 🎨 **多样图表**: 支持柱状图、折线图、饼图等多种图表类型
- 🌐 **透明背景**: 生成的图表具有透明背景，便于各种场景使用

## 技术架构

### 前端
- **React 18** + **TypeScript** - 现代化前端框架
- **Vite** - 快速构建工具
- **Tailwind CSS** - 实用优先的CSS框架
- **Zustand** - 轻量级状态管理
- **PWA** - 渐进式Web应用支持

### 后端
- **FastAPI** - 现代化Python Web框架
- **PostgreSQL** - 企业级数据库
- **SQLAlchemy** - Python ORM
- **Plotly** - 专业图表生成库
- **Pandas** - 数据处理库
- **Celery** - 异步任务队列

### 部署
- **前端**: Vercel
- **后端**: DigitalOcean VPS
- **数据库**: PostgreSQL
- **容器化**: Docker + Docker Compose

## 快速开始

### 环境要求

- Node.js >= 16
- Python >= 3.9
- PostgreSQL >= 12

### 安装和运行

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd datachart
   ```

2. **设置后端**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **设置前端**
   ```bash
   cd frontend
   npm install
   ```

4. **配置环境变量**
   ```bash
   # 复制环境变量模板
   cp .env.example .env
   # 编辑环境变量
   nano .env
   ```

5. **运行开发服务器**
   ```bash
   # 后端
   cd backend
   uvicorn app.main:app --reload

   # 前端
   cd frontend
   npm run dev
   ```

## 用户使用流程

1. **购买服务**: 在小红书店铺购买图表生成服务
2. **获取访问码**: 从商家处获得访问码
3. **上传数据**: 在网页或移动端输入访问码，上传Excel文件
4. **生成图表**: 系统自动解析数据并生成图表
5. **下载使用**: 下载生成的图表用于各种场景

## 项目结构

```
datachart/
├── frontend/          # 前端React应用
├── backend/           # 后端FastAPI应用
├── scripts/           # 脚本文件
├── assets/            # 静态资源
├── docs/              # 文档
├── .gitignore         # Git忽略文件
├── README.md          # 项目说明
└── CLAUDE.md          # Claude Code指导文档
```

## 开发文档

- [产品需求文档](docs/prd.md)
- [技术方案文档](docs/technical-specification.md)
- [实现路径任务清单](docs/implementation-checklist.md)

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 版本历史

- **1.0.0** (2025-09-25)
  - 初始版本发布
  - 基础图表生成功能
  - 访问码控制系统
  - Web和移动端支持

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 联系方式

如有问题或建议，请通过以下方式联系：

- 项目Issues: [GitHub Issues](链接)
- 邮箱: your-email@example.com

## 致谢

感谢所有为此项目做出贡献的开发者！