# Research: 006-chat-ui

## 现有代码盘点

### 已实现的后端路由

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/chat` | POST | SSE 流式对话，接受 `{ sessionId?, message, images? }` |
| `/api/speech/stt` | POST | 音频转文字，接受 multipart/form-data |
| `/api/speech/tts` | POST | 文字转语音，返回 audio buffer |
| `/api/health` | GET | 健康检查 |
| `/api/admin/*` | 各方法 | 运营后台，本 feature 不涉及 |

**缺失**：`GET /api/capabilities` — 需本 feature 新建，返回 provider 能力标志。

### 已实现的前端组件

| 组件 | 路径 | 说明 |
|------|------|------|
| `CameraCapture` | `components/camera-capture.tsx` | 摄像头开关 + captureFrame() |
| Admin 组件 | `components/admin/*` | 与本 feature 无关 |

**缺失**：`VoiceRecorder`、`MessageList`、`ChatInput`、`ChatPage` — 均需本 feature 新建。

### 路由结构

- `app/(chat)/layout.tsx` 已存在（空布局）
- `app/(chat)/` 目录下无 `page.tsx` — 需新建 `app/(chat)/page.tsx` 作为 `/chat` 路由入口
- token 验证逻辑参考 `app/api/chat/route.ts` 中的 `lib/auth/token.ts`

### Provider 能力标志

- `LLMProvider.supportsVision: boolean` — 在 `lib/ai/types.ts` 已定义
- `LLMProvider.supportsNativeAudio: boolean` — 在 `lib/ai/types.ts` 已定义
- `SpeechProvider` 接口无 `supportsSTT`/`supportsTTS` 标志；但只要 `SPEECH_PROVIDER` 配置存在，即认为 STT/TTS 可用
- **结论**：`/api/capabilities` 端点逻辑：读取 `AI_PROVIDER` + `SPEECH_PROVIDER` 配置，返回能力对象

## 技术决策

### TD-001: 录音方式

**选择**：`MediaRecorder API`（浏览器原生）
- 004-voice-stt-tts 已验证此方案可行（前端录音组件已有参考设计）
- 录音格式：`audio/webm`（Chrome/Firefox）或 `audio/mp4`（Safari）
- 发送：`FormData` multipart，与 `/api/speech/stt` 接口一致

### TD-002: SSE 流式渲染

**选择**：原生 `fetch` + `ReadableStream` 逐行解析
- 避免引入额外依赖
- 与现有 `/api/chat` 的 SSE 格式（`data: {"text":"..."}\n\n`）对接

### TD-003: TTS 播放

**选择**：`new Audio()` + `URL.createObjectURL(blob)`
- `/api/speech/tts` 返回 audio buffer + mimeType
- 新消息发送时调用 `audio.pause()` + `URL.revokeObjectURL()` 停止当前播放

### TD-004: 历史消息加载

**选择**：在 `/api/chat` 路由中，若传入 `sessionId` 则返回历史（现有逻辑已支持）
- 页面加载时发一次 `GET /api/chat/history?sessionId=<id>&token=<token>` 或复用 POST 初始化
- **实际**：现有 `/api/chat` 路由不提供 GET 历史接口；需新建 `GET /api/chat` 或 `GET /api/sessions/:id/messages`
- **决策**：新建 `GET /api/chat?sessionId=<id>&token=<token>` 返回历史消息数组

### TD-005: 自动滚动

**选择**：`useRef` 指向列表底部元素，消息变化时 `scrollIntoView({ behavior: 'smooth' })`
- 仅在用户未手动上滚时自动滚动（检测 scrollTop 接近 scrollHeight）

### TD-006: 状态管理

**选择**：React `useState` + `useRef`，无需 Redux/Zustand
- 对话页面是单页面，状态局限于该页面，无需全局状态

## Constitution 合规检查

| 原则 | 状态 | 说明 |
|------|------|------|
| I. Provider-Plugin | 合规 | `/api/capabilities` 通过 LLMFactory/SpeechFactory 读取，不直接实例化 SDK |
| II. Operator-Configurable | 合规 | 能力标志从运营配置读取，前端不硬编码 |
| III. No Emoji | 合规 | 所有文档和代码无 emoji |
| V. Security | 合规 | token 验证复用现有 `lib/auth/token.ts` |
| VI. No New DB Tables | 合规 | 不新增表，复用 ChatSession/Message |
| VII. pnpm | 合规 | 包管理器不变 |
| VIII. Prisma ORM | 合规 | 新路由中使用 prisma，不写原始 SQL |
