# 用中文回答

# SenseWorld AI 多模态对话平台

## 项目背景

公司内部使用的多模态 AI 对话平台，支持用户通过摄像头（Vision）和麦克风（STT）与 AI 实时交互，AI 以文字+语音（TTS）形式回复，后期支持数字人视频（HeyGen/D-ID）。

先在公司内网部署，后期迁移公有云，使用 Docker Compose 容器化。

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| 数据库 | MySQL + Prisma ORM |
| AI 对话 | Anthropic SDK (Claude) + OpenAI SDK，Provider 接口可扩展 |
| 语音 STT/TTS | OpenAI Whisper/TTS + Azure Cognitive Services，可配置 |
| 视频输入 | 浏览器 getUserMedia + Canvas 截帧 → Vision API |
| 数字人 Avatar | HeyGen API / D-ID API，运营可配置（后期开发） |
| 知识库 | @modelcontextprotocol/sdk，对接公司 MCP server（预留） |
| 流式通信 | Server-Sent Events (SSE) |
| 部署 | Docker Compose |

## 核心架构原则

- **Provider 插拔接口模式**：LLMProvider、SpeechProvider、AvatarProvider 均为接口，新增服务只需实现接口，不改业务逻辑
- **运营可配置**：所有第三方服务（AI 模型、语音、数字人）通过后台管理面板配置，运营人员可随时切换，无需重启
- **模型能力自动判断**：Provider 接口含 `supportsNativeAudio`、`supportsVision` 标志，运行时自动选择处理路径
- **多入口预留**：当前 Web，后期扩展小程序/H5，入口 token 机制统一

## 用户入口设计

- 后台生成访问链接 + 二维码
- 链接支持有期限（自定义天数）和永久有效两种模式
- 用户扫码/点击链接直接进入对话，无需注册
- 后期扩展：小程序、H5 等多入口

## 后台运营配置项

- AI 模型选择与 API Key
- 语音 STT/TTS 服务选择与 API Key
- 数字人 Avatar 服务选择与 API Key（后期）
- System Prompt（AI 角色/人设，运营可改）
- MCP Server 地址（预留）
- 访客入口链接管理

## spec-kit 开发工作流

本项目使用 spec-kit 管理功能开发，在 IDE 中按顺序执行：

```
/speckit.specify   # 生成需求规格 spec.md
/speckit.plan      # 生成技术方案 plan.md + data-model.md
/speckit.tasks     # 生成任务列表 tasks.md
/speckit.implement # 执行实现
```

**每次开始新对话时，必须先读取 `PLAN.md`，找到第一个状态为 ⬜ 待开始 的 Feature，提示用户在 IDE 中执行：**

```
/speckit.specify <feature-id>-<feature-name>
```

例如当前待开始的是 `001-project-scaffold`，则提示：
```
/speckit.specify 001-project-scaffold
```

完成一个 Feature 后，将 `PLAN.md` 中对应状态更新为 ✅ 已完成，再提示下一个。

## 目录结构

```
├── app/
│   ├── api/              # API 路由（chat、speech、avatar、admin）
│   ├── admin/            # 后台管理页面
│   └── (chat)/           # 对话页面
├── components/
│   ├── chat/             # 消息列表、输入栏、流式消息
│   ├── video/            # 摄像头截帧组件
│   ├── avatar/           # 数字人播放组件
│   └── admin/            # 后台配置组件
├── lib/
│   ├── ai/               # LLMProvider 接口 + Claude/OpenAI 实现
│   ├── speech/           # SpeechProvider 接口 + 各服务实现
│   ├── avatar/           # AvatarProvider 接口 + HeyGen/D-ID 实现
│   └── mcp/              # MCP 客户端（预留）
├── prisma/               # 数据库 schema
├── specs/                # spec-kit 生成的规格文档
└── docker-compose.yml
```

## Active Technologies
- TypeScript 5.x，Node.js 20 LTS + Next.js 14, Tailwind CSS, shadcn/ui, Prisma ORM, bcryptjs (001-project-scaffold)
- MySQL 8.0（Docker Compose 容器），Prisma 管理 schema 和迁移 (001-project-scaffold)

## Recent Changes
- 001-project-scaffold: Added TypeScript 5.x，Node.js 20 LTS + Next.js 14, Tailwind CSS, shadcn/ui, Prisma ORM, bcryptjs
