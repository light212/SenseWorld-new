# Implementation Plan: 项目脚手架搭建

**Branch**: `001-project-scaffold` | **Date**: 2025-01-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-project-scaffold/spec.md`

## Summary

初始化 SenseWorld AI 多模态对话平台的完整项目基础结构。技术方案：使用 Next.js 14 App Router + TypeScript 搭建 Web 应用框架，Tailwind CSS + shadcn/ui 构建 UI 组件体系，MySQL + Prisma ORM 管理数据持久层（含五张核心表的初始 schema），Docker Compose 提供容器化部署，同时定义 LLMProvider / SpeechProvider / AvatarProvider 三个插件接口骨架，为后续功能模块开发提供统一扩展点。

## Technical Context

**Language/Version**: TypeScript 5.x，Node.js 20 LTS
**Primary Dependencies**: Next.js 14, Tailwind CSS, shadcn/ui, Prisma ORM, bcryptjs
**Storage**: MySQL 8.0（Docker Compose 容器），Prisma 管理 schema 和迁移
**Testing**: 本 Feature 以手动验证为主（健康检查接口可用性、数据库连通性、页面渲染），后续 Feature 引入单元测试框架
**Target Platform**: Linux 服务器（Docker Compose）；本地开发支持 macOS / Linux
**Project Type**: Web 应用（全栈，Next.js monorepo）
**Performance Goals**: 健康检查接口响应 < 500ms；开发服务启动 < 3 分钟
**Constraints**: 不含任何真实 AI / 语音功能实现；仅接口骨架和占位页面
**Scale/Scope**: 单体应用，初期内网部署，后期迁移公有云

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 检查项 | 状态 |
|------|--------|------|
| I. Provider-Plugin 架构 | 定义 LLMProvider / SpeechProvider / AvatarProvider 接口，不直接实例化 SDK | PASS |
| II. 运营可配置运行时 | 本 Feature 只建表结构，运营配置功能在 002-admin-backend 实现，此处预留 Config 表 | PASS |
| III. 禁止 Emoji | 所有代码、注释、文档不含 emoji | PASS |
| IV. Spec 驱动开发 | spec.md 已完整，plan 在实现前完成 | PASS |
| V. 安全优先密钥管理 | .env.example 只含占位值；密码哈希存储；不提交真实密钥 | PASS |

**Constitution Check Result**: 全部通过，无违规项。

## Project Structure

### Documentation (this feature)

```text
specs/001-project-scaffold/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出
├── quickstart.md        # Phase 1 输出
└── tasks.md             # /speckit.tasks 输出
```

### Implementation Structure

```text
/                              # 项目根目录
├── app/                       # Next.js App Router
│   ├── (chat)/                # 对话页面路由组
│   │   └── page.tsx           # 对话首页占位
│   ├── admin/                 # 后台管理路由
│   │   └── page.tsx           # 管理后台占位
│   ├── api/
│   │   ├── health/
│   │   │   └── route.ts       # 健康检查端点
│   │   ├── chat/              # 预留（后续 Feature）
│   │   ├── speech/            # 预留（后续 Feature）
│   │   └── admin/             # 预留（后续 Feature）
│   ├── layout.tsx             # 根布局
│   └── globals.css            # 全局样式
├── components/
│   ├── chat/                  # 预留目录
│   ├── video/                 # 预留目录
│   ├── avatar/                # 预留目录
│   └── admin/                 # 预留目录
├── lib/
│   ├── ai/
│   │   ├── types.ts           # LLMProvider 接口 + ChatMessage 类型
│   │   └── index.ts           # 导出
│   ├── speech/
│   │   ├── types.ts           # SpeechProvider 接口
│   │   └── index.ts           # 导出
│   ├── avatar/
│   │   ├── types.ts           # AvatarProvider 接口
│   │   └── index.ts           # 导出
│   └── mcp/                   # 预留目录
│       └── .gitkeep
├── prisma/
│   ├── schema.prisma          # 数据库 schema（五张核心表）
│   ├── migrations/            # Prisma 迁移文件
│   └── seed.ts                # 管理员初始化 seed 脚本
├── .env.example               # 环境变量模板（11 个配置项）
├── .env                       # 本地环境变量（不入库）
├── docker-compose.yml         # app + mysql 服务
├── Dockerfile                 # 多阶段构建
├── next.config.ts             # Next.js 配置
├── tailwind.config.ts         # Tailwind 配置
├── tsconfig.json              # TypeScript 配置（含路径别名）
├── components.json            # shadcn/ui 配置
├── package.json               # 依赖清单
└── README.md                  # 项目文档
```

**Structure Decision**: Next.js 14 App Router 单体结构，`lib/` 存放所有业务逻辑和接口定义，`components/` 存放 UI 组件，`prisma/` 管理数据库。与 CLAUDE.md 中的目录结构设计完全一致。

## Complexity Tracking

无 Constitution 违规项，无需说明。
