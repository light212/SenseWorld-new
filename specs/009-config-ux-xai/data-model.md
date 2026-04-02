# Data Model: 后台配置 UI 重设计 + xAI 接入

**Branch**: `009-config-ux-xai` | **Phase**: 1 | **Date**: 2026-04-02

## 数据库 Schema 变更

**无需变更 Prisma schema。** `Config` 表为 key-value 存储，新增配置键直接写入即可。

---

## 新增配置键（Config 表）

| 键名 | 类型 | 是否新增 | 说明 | 示例值 |
|------|------|----------|------|--------|
| `SPEECH_BASE_URL` | string | 新增 | OpenAI 语音代理地址（仅 OpenAI 语音 provider 可选） | `https://proxy.example.com/v1` |
| `SPEECH_REGION` | string | 新增 | Azure 认知服务区域 | `eastasia` |
| `SPEECH_VOICE_MODE` | string | 新增 | xAI 语音交互模式 | `standard` / `realtime` |
| `TTS_VOICE` | string | 已存在 | TTS 音色（STT/TTS routes 已读取），各 provider 取值不同 | `alloy` / `eve` / `zh-CN-XiaoxiaoNeural` |

> `TTS_VOICE` 键已存在于数据库，STT/TTS API routes 已读取，本次仅在 ConfigForm 中补充 UI 入口。

---

## 全量配置键约定（AI 核心 + 语音信道）

| 键名 | 归属模块 | 说明 | 取值范围 |
|------|----------|------|----------|
| `AI_PROVIDER` | AI 核心 | AI 引擎服务商 | `openai` / `anthropic` / `xai` |
| `AI_API_KEY` | AI 核心 | AI 服务商 API 密钥 | 字符串（机密）|
| `AI_MODEL` | AI 核心 | 模型名称 | `gpt-4o` / `grok-2-vision-1212` 等 |
| `AI_BASE_URL` | AI 核心 | AI 代理地址（仅 OpenAI/Anthropic 可选）| URL 字符串 |
| `SYSTEM_PROMPT` | AI 核心 | 系统角色引导规约 | 多行文本 |
| `SPEECH_PROVIDER` | 语音信道 | 语音服务商 | `openai` / `azure` / `xai` / `''`（不启用）|
| `SPEECH_API_KEY` | 语音信道 | 语音服务商 API 密钥 | 字符串（机密）|
| `SPEECH_BASE_URL` | 语音信道 | 语音代理地址（仅 OpenAI 可选）| URL 字符串 |
| `SPEECH_REGION` | 语音信道 | Azure 服务区域 | `eastasia` / `westus` 等 |
| `SPEECH_VOICE_MODE` | 语音信道 | xAI 语音交互模式 | `standard` / `realtime` |
| `TTS_VOICE` | 语音信道 | TTS 音色标识 | `alloy` / `eve` / `zh-CN-XiaoxiaoNeural` 等 |

---

## 实体状态说明

### Provider Config

由 `Config` 表的键值对表示，不引入独立实体/新表。运行时通过 `getConfig(key)` 读取，运营通过管理面板写入，无需重启服务。

### Voice Mode (语音模式)

以 `SPEECH_VOICE_MODE` 单键存储，业务语义：
- `standard`：走传统 STT -> LLM -> TTS 三步流程
- `realtime`：走 xAI Voice Agent WebSocket 全链路

### Realtime Session (实时通话会话)

不引入新数据库表。实时通话状态为前端纯内存状态（WebSocket 连接对象）。通话结束后，通过现有 `Message` 表批量写入 transcript（`role: 'user'` 和 `role: 'assistant'` 分别写入），关联到现有 `ChatSession`。

### ChatSession / Message（复用现有 schema）

无需变更。实时通话结束后通过 `POST /api/chat/messages`（新增批量写入接口）将 transcript 写入 `Message` 表，字段与现有消息完全一致。

---

## 模型快捷选项（UI 层，不存储）

以下快捷标签仅在 ConfigForm 前端渲染，点击后填入 `AI_MODEL` 输入框，不改变数据库结构：

| Provider | 快捷标签 |
|----------|---------|
| openai | `gpt-4o`, `gpt-4o-mini`, `o1` |
| anthropic | `claude-opus-4-5`, `claude-sonnet-4-5`, `claude-haiku-4-5` |
| xai | `grok-2-vision-1212`, `grok-4.20-0309-reasoning`, `grok-4.20-0309-non-reasoning` |

## TTS 音色快捷选项（UI 层，写入 TTS_VOICE）

| Provider | 快捷标签 |
|----------|---------|
| openai | `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer` |
| azure | `zh-CN-XiaoxiaoNeural`, `zh-CN-YunxiNeural`, `zh-CN-XiaoyiNeural` |
| xai | `eve`, `ara`, `rex`, `sal`, `leo` |
