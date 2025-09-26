# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码仓库中工作时提供指导。

## 项目概述

这是一个智能图表生成工具（MVP），允许用户上传 Excel 文件并自动生成图表（PNG/SVG 格式透明背景）。系统使用访问码控制生成次数，专为小红书虚拟产品销售设计。项目支持网页和移动端访问。

## 架构设计

### 目录结构
```
/project-root
/frontend       # 网页 + 移动端页面
/backend        # 后端 API 和文件解析逻辑
/scripts        # Python 脚本或定时任务
/assets         # 前端静态资源
/docs           # 文档和 PRD
```

### 前后端分离
- **前端**: 部署在 Vercel/Netlify，处理用户界面、文件上传、图表显示
- **后端**: 部署在 DigitalOcean VPS 并包含数据库，处理 API、访问码验证、Excel 解析、图表生成
- **数据库**: PostgreSQL 包含访问码表，不对外开放

### 核心模块

#### 前端模块
- 访问码验证界面
- Excel 文件上传界面
- 图表显示和下载界面
- 使用次数显示（可选）

#### 后端模块
- 访问码管理（验证、使用次数追踪）
- Excel 文件解析（Python 实现）
- 图表生成（PNG/SVG 透明背景）
- 文件清理管理
- REST API 接口

#### 数据库架构
```sql
CREATE TABLE access_codes (
    id SERIAL PRIMARY KEY,
    access_code VARCHAR(50) UNIQUE,
    max_usage INT,
    usage_count INT DEFAULT 0
);
```

## 开发命令

由于是新项目，标准命令为：
- 前端: `npm run dev`, `npm run build`, `npm run lint`
- 后端: `python -m flask run`, `pytest`, `python -m black .`
- 数据库: 基于所选 ORM 的迁移命令

## 关键技术要求

1. **图表生成**: 必须输出 PNG/SVG 透明背景格式
2. **访问控制**: 强制执行每个访问码的使用限制（10/30/50 次）
3. **文件安全**: 图表生成后删除 Excel 文件
4. **移动端响应式**: 支持网页和移动端访问
5. **部署就绪**: 为前后端分离部署而设计

## Git 提交规范
使用格式 `[模块] 描述` 作为提交消息。功能完成后才合并到主分支。

## 文件管理
- 使用后立即删除临时文件
- 避免向 git 提交不必要的文件
- 将前端和后端代码分别存放在不同目录以便部署