# Implementation Plan: 后台配置 UI 重设计 + xAI 接入

**Branch**: `009-config-ux-xai` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/009-config-ux-xai/spec.md`

## Summary

将后台配置表单的「大模型与基盘」和「语音信道」两个区块从平铺字段列表改造为 Provider 卡片选择 + 动态字段展示，同时完整接入 xAI（AI 对话、TTS 标准模式、实时语音 WebSocket）。xAI API 与 OpenAI SDK 完全兼容，TTS 和 LLM 均通过委托现有 Provider 实现，无需新增 HTTP 逻辑。实时语音通过后端生成 ephemeral token、前端直连 `wss://api.x.ai/v1/realtime` WebSocket 实现，通话 transcript 在结束后批量写入现有 Message 表。

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS, Next.js 14 (App Router)
**Primary Dependencies**: `@ai-sdk/openai`, `@ai-sdk/anthropic`, `openai` SDK, Prisma ORM 5.x, Tailwind CSS, shadcn/ui
**Storage**: MySQL 8.0 via Prisma — Config 表（key-value），ChatSession/Message 表（复用）
**Testing**: 手动验证（与现有功能保持一致，无自动化测试框架）
**Target Platform**: 桌面端浏览器（Chrome/Edge），Next.js 14 服务端
**Project Type**: Web application (frontend + backend in Next.js monorepo)
**Performance Goals**: Provider 切换字段刷新无感知延迟（纯前端状态切换）；xAI 实时语音首次回复 <= 2 秒（外部约束）
**Constraints**: 严格沿用现有 slate 单色风格；不引入新 npm 依赖；不改变 Prisma schema；不增加新保存入口
**Scale/Scope**: 单后台运营配置页面 + 用户对话输入栏新增实时通话按钮

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 状态 | 说明 |
|------|------|------|
| I. Provider-Plugin 架构 | PASS | XAISpeechProvider 实现 SpeechProvider 接口，通过 SpeechFactory 实例化；xAI LLM 通过 LLMFactory `case 'xai'` 路由 |
| II. 运营可配置 | PASS | 所有新增配置键（SPEECH_BASE_URL、SPEECH_REGION、SPEECH_VOICE_MODE）通过 Config 表存储，管理面板可运行时切换 |
| III. 无 Emoji | PASS | 所有代码、文档、UI 文案中不使用 Emoji |
| IV. Spec-Driven | PASS | spec.md 已创建并通过质量检查（14/14 项），按序执行 speckit 流程 |
| V. 密钥安全 | PASS | xAI API Key 存入 Config 表（机密凭据）；前端使用 ephemeral token，主密钥不出后端 |
| VI. 目录结构一致 | PASS | XAISpeechProvider 放 `lib/speech/`；新 API routes 放 `app/api/speech/` 和 `app/api/chat/`；无新建平行目录 |
| VII. pnpm | PASS | 无新增 npm 依赖（xAI TTS/LLM 复用 `openai` SDK，已安装）|

## Project Structure

### Documentation (this feature)

```text
specs/009-config-ux-xai/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出
└── tasks.md             # Phase 2 输出（/speckit.tasks 命令生成）
```

### Source Code (repository root)

```text
lib/
├── speech/
│   ├── types.ts                      # 不变
│   ├── openai-speech-provider.ts     # 修改：构造函数增加 baseURL 参数
│   ├── xai-speech-provider.ts        # 新增：委托 OpenAISpeechProvider + x.ai baseURL
│   ├── azure-speech-provider.ts      # 不变
│   └── factory.ts                    # 修改：增加 xai case + baseURL 参数
├── ai/
│   └── factory.ts                    # 修改：增加 xai case

app/
├── api/
│   ├── chat/
│   │   ├── route.ts                  # 修改：xAI 默认 baseURL
│   │   └── messages/
│   │       └── route.ts              # 新增：批量写入 transcript
│   ├── speech/
│   │   ├── stt/route.ts              # 修改：读取 SPEECH_BASE_URL + SPEECH_VOICE_MODE
│   │   ├── tts/route.ts              # 修改：读取 SPEECH_BASE_URL
│   │   └── realtime-session/
│   │       └── route.ts              # 新增：生成 xAI ephemeral token
│   └── capabilities/
│       └── route.ts                  # 修改：新增 realtimeVoice 标志

components/
├── admin/
│   └── ConfigForm.tsx                # 修改：ai_core + speech_stt 卡片式动态字段
└── chat/
    ├── chat-input-bar.tsx            # 修改：新增 realtimeVoice 相关 props
    └── realtime-voice-button.tsx     # 新增：WebSocket 实时通话全链路组件
```

**Structure Decision**: 单项目（Next.js monorepo），复用现有 lib/speech/、lib/ai/、app/api/、components/ 目录结构，不新建顶层目录。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

无 Constitution 违规，此节不适用。

---

## 已完成部分（无需重做）

- `app/api/chat/route.ts`：已读取 `MCP_API_KEY` 并传给 MCPClientFactory
- `components/admin/ConfigForm.tsx`：已新增 MCP_API_KEY 字段
- `specs/009-config-ux-xai/spec.md`：已创建并通过质量检查
- `specs/009-config-ux-xai/research.md`：Phase 0 已完成
- `specs/009-config-ux-xai/data-model.md`：Phase 1 数据模型已完成

---

## 改动文件清单及实现细节

### 1. `lib/speech/openai-speech-provider.ts`（修改）

构造函数签名改为 `constructor(apiKey: string, voice?: string, baseURL?: string)`，将 `baseURL` 传给 `new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })`。

### 2. `lib/speech/xai-speech-provider.ts`（新增）

```typescript
import type { SpeechProvider } from './types'
import { OpenAISpeechProvider } from './openai-speech-provider'

export class XAISpeechProvider implements SpeechProvider {
  private inner: OpenAISpeechProvider
  constructor(apiKey: string, voice?: string) {
    this.inner = new OpenAISpeechProvider(apiKey, voice, 'https://api.x.ai/v1')
  }
  transcribe(): Promise<string> {
    throw new Error('xAI 标准模式不支持 STT，请切换至实时语音模式或选择其他服务商')
  }
  synthesize(text: string) {
    return this.inner.synthesize(text)
  }
}
```

### 3. `lib/speech/factory.ts`（修改）

- 签名改为 `static create(provider: string, apiKey: string, region?: string, voice?: string, baseURL?: string)`
- 新增 `case 'xai': return new XAISpeechProvider(apiKey, voice)`
- 更新 `case 'openai': return new OpenAISpeechProvider(apiKey, voice, baseURL)`

### 4. `lib/ai/factory.ts`（修改）

新增 `case 'xai': return new OpenAIProvider(apiKey, model, baseURL ?? 'https://api.x.ai/v1')`

### 5. `app/api/chat/route.ts`（修改）

在 model 创建处，将 else 分支改为：
```typescript
const defaultBaseUrl = aiProvider === 'xai' ? 'https://api.x.ai/v1' : 'https://api.openai.com/v1'
model = createOpenAI({ apiKey: aiApiKey, baseURL: aiBaseUrl || defaultBaseUrl })(modelName)
```

### 6. `app/api/speech/stt/route.ts`（修改）

新增读取 `SPEECH_BASE_URL` 和 `SPEECH_VOICE_MODE`；若 `voiceMode === 'realtime'` 且 `provider === 'xai'`，返回 503 `{ error: 'xAI STT 在实时模式下不可用，请使用实时通话功能' }`；否则将 `baseURL` 传给 `SpeechFactory.create(..., baseURL)`。

### 7. `app/api/speech/tts/route.ts`（修改）

新增读取 `SPEECH_BASE_URL`，传给 `SpeechFactory.create(..., baseURL)`。

### 8. `app/api/speech/realtime-session/route.ts`（新增）

```
POST /api/speech/realtime-session?token=xxx
1. validateToken(token)
2. getConfig('SPEECH_API_KEY') — xAI 密钥
3. fetch POST https://api.x.ai/v1/realtime/sessions
4. 返回 { ephemeralToken, expiresAt }
```

### 9. `app/api/chat/messages/route.ts`（新增）

```
POST /api/chat/messages?token=xxx
body: { sessionId: string, messages: Array<{role, content}> }
1. validateToken(token)
2. prisma.message.createMany({ data: messages.map(m => ({ sessionId, ...m })) })
3. 返回 { saved: messages.length }
```

### 10. `app/api/capabilities/route.ts`（修改）

- 统一读取键名为小写（与 STT/TTS routes 保持一致）
- 修正 `supportsSTT` 逻辑：`!!speechProvider && speechProvider !== 'xai'`
- 新增 `realtimeVoice: speechProvider === 'xai' && voiceMode === 'realtime'`

### 11. `components/admin/ConfigForm.tsx`（修改 — ai_core + speech_stt 两段）

**变更策略**：
- `GROUPS` 数组中移除 `ai_core` 和 `speech_stt` 两个 group
- 新增 state：`aiProvider`, `speechProvider`, `showAiAdvanced`, `showSpeechAdvanced`
- 在 JSX 中用独立渲染函数替代这两个 group 的平铺字段

**Provider 选择器 UI**（复用左导航按钮样式）：
```
● OpenAI     Anthropic     xAI
```
- 选中：`text-slate-900 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]`
- 未选中：`text-slate-500 hover:text-slate-900`
- 左侧小圆点：`w-1.5 h-1.5 rounded-full bg-slate-900`（选中时显示）

**模型芯片 UI**（复用「机密凭据」badge 样式）：
```
快捷选择：[gpt-4o] [gpt-4o-mini] [o1]
模型名称  ________________________
```
- 未选中 chip：`text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 tracking-widest font-bold rounded`
- 选中 chip（值匹配）：`bg-slate-900 text-white`

**高级设置折叠**：
- 触发器：`text-[11px] text-slate-400 tracking-widest` + 展开箭头
- 内容：与普通字段相同样式（底边框输入 `inputStyles`）

**AI Provider 字段映射**：

| Provider | 显示字段 | 高级折叠内 |
|----------|---------|-----------|
| openai | AI_API_KEY, AI_MODEL (with chips), SYSTEM_PROMPT | AI_BASE_URL |
| anthropic | AI_API_KEY, AI_MODEL (with chips), SYSTEM_PROMPT | AI_BASE_URL |
| xai | AI_API_KEY, AI_MODEL (with chips), SYSTEM_PROMPT | 无 |

**模型芯片列表**：
- openai: `['gpt-4o', 'gpt-4o-mini', 'o1']`
- anthropic: `['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5']`
- xai: `['grok-2-vision-1212', 'grok-4.20-0309-reasoning', 'grok-4.20-0309-non-reasoning']`

**Speech Provider 字段映射**：

| Provider | 显示字段 | 高级折叠内 |
|----------|---------|-----------|
| openai | SPEECH_API_KEY, TTS_VOICE (chips) | SPEECH_BASE_URL |
| azure | SPEECH_API_KEY, SPEECH_REGION, TTS_VOICE (chips) | 无 |
| xai | SPEECH_API_KEY, SPEECH_VOICE_MODE toggle, TTS_VOICE (chips) | 无 |
| 不启用 | 无字段 | — |

**TTS 音色芯片列表**：
- openai: `['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']`
- azure: `['zh-CN-XiaoxiaoNeural', 'zh-CN-YunxiNeural', 'zh-CN-XiaoyiNeural']`
- xai: `['eve', 'ara', 'rex', 'sal', 'leo']`

**xAI 语音模式切换**（SPEECH_VOICE_MODE）：
```
交互模式   ● 标准    实时
```
与 Provider 选择器相同样式（两个文字按钮 + 小圆点指示器）。

### 12. `components/chat/realtime-voice-button.tsx`（新增）

**状态机**：`idle -> connecting -> active -> ending -> idle`

```
idle: 显示「实时通话」按钮（Mic2 图标）

connecting:
  1. GET /api/speech/realtime-session?token=xxx → ephemeralToken
  2. new WebSocket('wss://api.x.ai/v1/realtime')
  3. session.update: 配置语音 + instructions (system prompt)
  4. 初始化 AudioContext + AudioWorklet（PCM 采集）

active:
  - input_audio_buffer.append（Base64 PCM 数据）
  - 收到 response.output_audio.delta → AudioContext 播放
  - 收到 response.output_audio_transcript.delta → 追加到 transcript
  - 收到 conversation.item.input_audio_transcription.completed → 追加用户消息

ending（点击「结束」）:
  1. 关闭 WebSocket
  2. 收集 { userMessages[], aiMessages[] }
  3. POST /api/chat/messages { messages: [...], sessionId } 批量写入
  4. 通知父组件刷新消息列表
```

**Props**：
```typescript
{
  token: string
  sessionId?: string
  onSessionCreated: (id: string) => void
  onNewMessages: (msgs: Message[]) => void
  capabilities: { realtimeVoice: boolean }
}
```

**断线处理**：WebSocket `onerror` / `onclose` 时显示「连接断开」提示，自动保存已收到的 transcript。

### 13. `components/chat/chat-input-bar.tsx`（修改）

新增 props：
```typescript
realtimeVoice?: boolean
token?: string
sessionId?: string
onSessionCreated?: (id: string) => void
onNewMessages?: (msgs: Message[]) => void
```

当 `realtimeVoice` 为 true 时，在现有录音按钮旁渲染 `<RealtimeVoiceButton ...>`。

---

## 验证方式

1. **配置 UI — Provider 选择**：后台切换 AI Provider 卡片，确认字段动态显示/隐藏；选 xAI 时无代理地址字段
2. **配置 UI — 模型芯片**：点击芯片自动填入输入框；手动输入时芯片高亮联动
3. **配置 UI — 语音字段**：选 Azure 显示 SPEECH_REGION；选 xAI 显示模式切换；选不启用时语音字段全隐藏
4. **xAI TTS（标准模式）**：配置 xAI + 标准模式，AI 回复触发 TTS 发音正常（走 x.ai/v1/audio/speech）
5. **xAI Vision**：配置 xAI + grok-2-vision-1212，发送带图片消息，AI 正确描述图片
6. **capabilities**：`GET /api/capabilities?token=xxx` 在 xAI+realtime 时返回 `realtimeVoice: true`
7. **STT 置灰**：xAI 标准模式下 `capabilities.supportsSTT: false`，录音按钮显示 disabled
8. **xAI 实时通话（集成）**：配置 xAI+realtime → 点击「实时通话」→ 说话 → AI 实时语音回复 → 结束后消息保存到历史
9. **回归 — OpenAI/Azure**：切回 OpenAI 或 Azure，现有 STT/TTS 链路正常工作
10. **OpenAI 代理地址**：填写代理地址后，AI 请求走代理而非官方 API
