# Feature Specification: AI Chat Core

**Feature Branch**: `003-ai-chat-core`
**Created**: 2025-07-14
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 访客发起流式 AI 对话 (Priority: P1)

持有有效访客链接的用户向 AI 发送文本消息，系统通过 SSE 流式返回 AI 回复，消息内容实时出现，对话历史自动保存。

**Why this priority**: 这是整个系统最核心的价值交付——访客与 AI 实时对话。没有此能力，系统无任何实际用途。

**Independent Test**: 持有有效访客 token，POST `/api/chat`，验证返回 `text/event-stream` 并收到流式 token；对话结束后查询数据库 `Message` 表确认记录已保存。

**Acceptance Scenarios**:

1. **Given** 有效 accessToken 和空会话，**When** POST `/api/chat` 发送用户消息，**Then** 响应 Content-Type 为 `text/event-stream`，流式输出 `data: {"text":"..."}` 事件，最终发送 `data: [DONE]`
2. **Given** 正在进行的流式响应，**When** 第一个 token 到达，**Then** 客户端在 1 秒内可读取到第一个有效字符
3. **Given** 对话完成后，**When** 查询 `ChatSession` 和 `Message` 表，**Then** 用户消息（role: user）和 AI 回复（role: assistant）均已完整持久化
4. **Given** 无效或缺失的 accessToken，**When** 请求 `/api/chat`，**Then** 返回 401，不触发 AI 调用

---

### User Story 2 - 多轮对话上下文保持 (Priority: P2)

访客在同一会话中连续发送多条消息，AI 的回复能够理解并引用之前的对话内容，表现出连贯的对话能力。

**Why this priority**: 单轮问答价值有限；多轮上下文是智能助手体验的基础。但可在 P1 单轮能力就绪后独立验证。

**Independent Test**: 先发一条消息「我叫张三」，再发「我叫什么名字」，验证 AI 回复包含「张三」。

**Acceptance Scenarios**:

1. **Given** 已有两条历史消息的会话，**When** 发送新消息，**Then** 请求载荷中包含完整历史消息列表（按时间顺序），AI 回复体现对上文的理解
2. **Given** 同一 sessionId 的多次请求，**When** 每次请求，**Then** 数据库历史消息被正确追加，不出现重复或乱序

---

### User Story 3 - AI 服务商可切换（Provider-Plugin 架构） (Priority: P3)

运营人员在配置面板修改 `AI_PROVIDER` 为 `anthropic` 或 `openai`，无需重启服务，下一个对话请求即使用新的服务商。

**Why this priority**: 体现 Constitution 核心原则；但在 P1/P2 就绪后可独立验证，不阻塞基础对话能力。

**Independent Test**: 将 `AI_PROVIDER` 设为 `anthropic`，发送对话请求，通过日志或响应特征确认使用了 Claude 模型；再切换为 `openai`，验证切换生效。

**Acceptance Scenarios**:

1. **Given** 配置 `AI_PROVIDER=openai`，**When** 发送对话请求，**Then** 通过 OpenAI SDK 发起请求，使用 `AI_MODEL` 配置的模型名
2. **Given** 配置 `AI_PROVIDER=anthropic`，**When** 发送对话请求，**Then** 通过 Anthropic SDK 发起请求，使用 `AI_MODEL` 配置的模型名
3. **Given** 运营面板将 `AI_PROVIDER` 从 `openai` 改为 `anthropic` 并保存，**When** 下一个对话请求到达，**Then** 使用新服务商，无需重启
4. **Given** `AI_PROVIDER` 设为未知值，**When** 发送对话请求，**Then** 返回 500 并提示配置错误，不产生静默失败

---

### User Story 4 - System Prompt 运营可配置 (Priority: P4)

运营人员在配置面板修改 `SYSTEM_PROMPT`，之后的所有对话均使用新的 system prompt，AI 人设立即切换。

**Why this priority**: 在 P1 流式对话能力之上叠加，是运营灵活性的体现；可独立验证。

**Acceptance Scenarios**:

1. **Given** 配置面板保存了新的 `SYSTEM_PROMPT`，**When** 下一个对话请求到达，**Then** 该 system prompt 作为第一条 `system` 消息注入 AI 请求
2. **Given** 数据库中未配置 `SYSTEM_PROMPT`，**When** 发送对话请求，**Then** 回退到环境变量 `SYSTEM_PROMPT`，若也不存在则使用空 system prompt 或合理默认值

---

## Functional Requirements

### FR-001: LLMProvider 接口
- 定义 `LLMProvider` 接口，位于 `lib/llm/types.ts`
- 方法签名：`chat(messages: LLMMessage[], options?: LLMChatOptions): AsyncIterable<string>`
- 接口标志位：`supportsVision: boolean`、`supportsNativeAudio: boolean`
- `LLMMessage` 类型：`{ role: 'system' | 'user' | 'assistant'; content: string | LLMContentPart[] }`

### FR-002: 服务商实现
- `OpenAIProvider`（`lib/llm/openai-provider.ts`）：使用 `openai` SDK，支持流式 `stream: true`
- `AnthropicProvider`（`lib/llm/anthropic-provider.ts`）：使用 `@anthropic-ai/sdk`，支持流式 `stream()`
- 两者均实现 `LLMProvider` 接口，均支持 `supportsVision: true`，`supportsNativeAudio: false`

### FR-003: LLMFactory
- 位于 `lib/llm/factory.ts`
- `LLMFactory.create(): Promise<LLMProvider>` 读取运营配置 `AI_PROVIDER`（数据库优先于环境变量），实例化对应 Provider
- 配置读取：`AI_API_KEY`（Provider 构造参数）、`AI_MODEL`（默认模型）
- 未知 Provider 值时抛出明确错误信息

### FR-004: `/api/chat` SSE 路由
- 路径：`POST /api/chat`
- 请求 Body：`{ sessionId?: string; message: string }`
- 鉴权：URL query 参数 `?token=<accessToken>`（用户扫码打开 `/?token=xxx` 时天然携带，前台页面从 URL 读取后附加到每次请求），验证 `AccessToken` 表（enabled=true，未过期）
- 若 `sessionId` 为空，自动创建新 `ChatSession`（关联 accessToken）
- 从数据库加载该 session 的历史消息，拼装 messages 列表，注入 system prompt
- 调用 `LLMFactory.create()` 获取 Provider，调用 `provider.chat(messages)` 获取流
- 流式写入响应，格式：`data: {"text":"<token>"}

`，结束时发送 `data: [DONE]

`
- 完整响应收集后，将用户消息和 AI 回复持久化到 `Message` 表
- 响应头：`Content-Type: text/event-stream`、`Cache-Control: no-cache`、`X-Accel-Buffering: no`

### FR-005: 对话历史管理
- 每次 `/api/chat` 请求先持久化用户消息，再调用 AI
- AI 回复完整接收后持久化 assistant 消息
- 历史消息按 `createdAt` 升序排列传入 AI
- `ChatSession` 的 `updatedAt` 在每次对话后刷新

### FR-006: 错误处理
- AI Provider 调用失败：SSE 流中发送 `data: {"error":"AI service error"}

` 后关闭流，同时返回适当的 HTTP 状态码
- accessToken 无效：返回 401，不启动 SSE
- 配置缺失（如 `AI_PROVIDER` 未设置）：返回 500，错误消息明确指出缺失的配置项

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 访客发送消息后，首个 AI token 在 2 秒内出现在流响应中（正常网络条件下）
- **SC-002**: 切换 AI 服务商（修改 `AI_PROVIDER` 配置）后，下一个请求即生效，无需重启服务
- **SC-003**: 多轮对话中，AI 能正确引用最近 10 轮以内的上下文内容（取决于模型 context window）
- **SC-004**: 无效 accessToken 的请求 100% 被拒绝，返回 401，不触发任何 AI API 调用

## Assumptions

- 访客通过 accessToken 鉴权，token 验证逻辑复用 002-admin-backend 已有的 `AccessToken` 表结构
- 对话历史仅加载当前 session 内的消息，不跨 session 合并上下文
- 流式传输使用 SSE（Server-Sent Events），不使用 WebSocket
- 本期不实现 Vision（图片输入）能力，`supportsVision` 标志预留但不在 `/api/chat` 中启用，Vision 能力在 Feature 005 中实现
- 本期不实现 Token 计数或用量限制
- 对话历史不做截断处理（由调用方或后续 feature 处理 context window 限制）
- `lib/config/index.ts` 的 `getConfig` 函数已实现数据库优先于环境变量的读取逻辑，直接复用
