# SenseWorld 开发计划

> 每个 Feature 在 IDE 中执行 `/speckit.specify` 开始开发，按顺序逐个推进。

## 开发顺序

| # | Feature | 说明 | 状态 |
|---|---------|------|------|
| 001 | project-scaffold | Next.js 14 + TypeScript + MySQL + Prisma + Tailwind + Docker 基础结构 | ✅ 已完成 |
| 002 | admin-backend | 后台管理：运营配置（AI/语音/Avatar/System Prompt）+ 访客入口链接/二维码生成 | ✅ 已完成 |
| 003 | ai-chat-core | 多模型适配层（LLMProvider 接口）+ 流式对话 SSE + 对话历史管理 | ✅ 已完成 |
| 004 | voice-stt-tts | STT/TTS 可配置语音能力（SpeechProvider 接口 + OpenAI/Azure 实现） | ✅ 已完成 |
| 005 | vision-input | 摄像头截帧组件 + Vision 输入附加到 AI 请求 | ✅ 已完成 |
| 006 | chat-ui | 前端对话界面（消息列表、流式显示、录音按钮、摄像头预览） | ✅ 已完成 |
| 007 | mcp-integration | MCP Server 连接层（@modelcontextprotocol/sdk，预留接口） | ✅ 已完成 |
| 008 | avatar | 数字人视频回复（AvatarProvider 接口 + HeyGen/D-ID 实现，运营可配置） | ✅ 已完成 |
| 009 | admin-config-ux-xai | 后台配置 UI 重设计（Provider 卡片选择 + 动态字段）+ xAI 接入（AI 对话/TTS/实时语音） | ✅ 已完成 |

## 状态说明

- ⬜ 待开始
- 🔄 进行中
- ✅ 已完成

---

## Feature 详情

### 001 · project-scaffold

**目标**：建立可运行的项目基础，后续所有 feature 在此基础上开发。

包含：
- Next.js 14 App Router + TypeScript 初始化
- Tailwind CSS + shadcn/ui 配置
- MySQL + Prisma ORM（初始 schema：Config、AccessToken、ChatSession、Message）
- 环境变量模板（`.env.example`）
- Docker Compose（app + mysql 服务）
- 基础健康检查路由 `/api/health`

---

### 002 · admin-backend

**目标**：运营人员可通过后台配置所有第三方服务，并生成用户访问入口。

包含：
- 管理员登录（简单账号密码，session 认证）
- 配置面板：AI 模型 + API Key、语音服务 + API Key、Avatar 服务 + API Key、System Prompt
- 访客入口管理：生成链接（有期限/永久）+ 二维码展示
- 配置存储：MySQL（优先级高于环境变量）

---

### 003 · ai-chat-core

**目标**：多模型可切换的流式 AI 对话能力。

包含：
- `LLMProvider` 接口（`chat()`、`supportsVision`、`supportsNativeAudio` 标志）
- Claude Provider（Anthropic SDK）
- OpenAI Provider（OpenAI SDK）
- LLMFactory（按运营配置选择 Provider）
- `/api/chat` SSE 路由
- 对话历史管理（MySQL 持久化）

---

### 004 · voice

**目标**：语音输入（STT）和语音输出（TTS）能力，服务可配置。

包含：
- `SpeechProvider` 接口（`transcribe()`、`synthesize()`）
- OpenAI Whisper + TTS 实现
- Azure Cognitive Services 实现
- SpeechFactory（按运营配置选择）
- `/api/speech/stt` 和 `/api/speech/tts` 路由
- 前端录音组件（MediaRecorder API）
- 前端音频播放

---

### 005 · vision-input

**目标**：用户摄像头画面通过 Vision 让 AI「看见」。

包含：
- `CameraCapture` 组件（getUserMedia + Canvas 截帧）
- 截帧频率可配置（默认 5 秒）
- 图片压缩（≤512px，控制 token 消耗）
- 截帧 base64 附加到 AI 消息
- 用户可开关摄像头

---

### 006 · chat-ui

**目标**：完整的前端对话体验。

包含：
- 消息列表（用户/AI 气泡，支持图片预览）
- 流式消息显示（SSE 实时渲染）
- 输入栏（文字输入 + 发送）
- 录音按钮（按住录音）
- 摄像头预览区域（可开关）
- 加载状态、错误提示

---

### 007 · mcp-integration

**目标**：对接公司 MCP Server 知识库，增强 AI 回复质量。

包含：
- `MCPClient` 封装（@modelcontextprotocol/sdk）
- MCP Server 地址从运营配置读取
- Tool call 结果注入 AI 上下文
- 连接状态检测（后台配置页「测试连接」按钮）

---

### 008 · avatar

**目标**：AI 回复以数字人视频形式呈现，服务可配置。

包含：
- `AvatarProvider` 接口（`generateVideo(text, audioUrl): videoUrl`）
- HeyGen Streaming Avatar API 实现
- D-ID Talk API 实现
- AvatarFactory（按运营配置选择）
- `/api/avatar` 路由
- `AvatarPlayer` 前端组件（视频播放）
- 运营可配置：服务商、Avatar ID、API Key
