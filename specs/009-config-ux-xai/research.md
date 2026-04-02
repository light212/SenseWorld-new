# Research: 后台配置 UI 重设计 + xAI 接入

**Branch**: `009-config-ux-xai` | **Phase**: 0 | **Date**: 2026-04-02

## R-01 xAI TTS API 格式

**Decision**: 使用 OpenAI 兼容接口（`POST /v1/audio/speech`），`XAISpeechProvider` 直接委托给 `OpenAISpeechProvider`，传入 `baseURL: 'https://api.x.ai/v1'`。

**Rationale**: xAI TTS 与 OpenAI Audio SDK 完全兼容，只需将 `baseURL` 指向 `https://api.x.ai/v1`。无需新增 HTTP fetch 逻辑，代码复用最大化。

**Alternatives considered**:
- 自行实现 `fetch` 调用 xAI REST API：被否决，OpenAI SDK 抽象已存在，重复实现无价值。
- 共享 `OpenAISpeechProvider` 并在构造函数中传 baseURL：最终采用此方案。

---

## R-02 xAI 实时语音临时 Token

**Decision**: 后端调用 `POST https://api.x.ai/v1/realtime/sessions`，返回 ephemeral token 给前端，前端直连 `wss://api.x.ai/v1/realtime`。

**Rationale**: xAI Realtime API 与 OpenAI Realtime API 设计一致，支持 ephemeral token 模式以避免在前端暴露主密钥（符合 Constitution V：密钥安全）。

**Risk**: 若 `/v1/realtime/sessions` 接口未正式发布，降级方案为后端代理 WebSocket，但需引入 custom HTTP server，复杂度高。当前方案优先尝试 ephemeral token；接口响应 4xx 时向前端返回清晰错误提示。

**Alternatives considered**:
- 直接在前端使用主 API Key：违反 Constitution V，被否决。
- 后端 WebSocket 代理：降级方案，仅在 ephemeral token 不可用时启用。

---

## R-03 xAI 作为 LLM Provider 接入

**Decision**: 在 `lib/ai/factory.ts` 的 `LLMFactory.create()` 中新增 `case 'xai'`，返回 `new OpenAIProvider(apiKey, model, baseURL ?? 'https://api.x.ai/v1')`。

**Rationale**: xAI API 完全兼容 OpenAI SDK（`@ai-sdk/openai`），无需新建 `XAIProvider` 类。`app/api/chat/route.ts` 中的 else 分支当前默认 baseURL 为 `https://api.openai.com/v1`，需补充 xAI 场景的正确默认值。

**Alternatives considered**:
- 新建 `XAIProvider` 类继承或包装 `OpenAIProvider`：被否决，代码重复无收益。
- 修改 `else` 分支注入 xAI URL：可行，但显式 `case 'xai'` 更清晰且符合 Factory 模式。

---

## R-04 ConfigForm 动态字段实现策略

**Decision**: 在现有 `ConfigForm.tsx` 中将 `ai_core` 和 `speech_stt` 两个 group 移出 `GROUPS` 数组，改为独立的专属渲染函数。`avatar_engine` 和 `advanced_mcp` 两个 group 保持现有平铺字段渲染不变。

**Rationale**:
- 保持代码集中，不新增文件（符合 Constitution VI：目录结构一致性）。
- Provider 选择状态用 React `useState` 管理，读取初始值来自 `initialConfigs`。
- UI 风格严格沿用现有 slate 单色系（`tracking-widest`、底边框输入、`rounded-none` 按钮），不引入彩色卡片。
- Provider 选择器复用左侧导航按钮样式；模型芯片复用「机密凭据」badge 样式。

**Alternatives considered**:
- 拆分新文件 `AICoreConfig.tsx` + `SpeechConfig.tsx`：逻辑分散，当前规模不必要，被否决。
- 使用 `select` 下拉：可见性差，用户需要多次交互，被否决。

---

## R-05 音频格式（xAI 实时语音 WebSocket）

**Decision**: 麦克风输入使用 PCM 16kHz（通过 `AudioWorkletProcessor` 采集），输出通过 `AudioContext.decodeAudioData()` 解码播放，格式由服务端决定。

**Rationale**: xAI Realtime API 推荐 PCM 24kHz 输入，`AudioWorkletProcessor` 可在浏览器端实现低延迟 PCM 捕获，兼容 xAI WebSocket `input_audio_buffer.append`（Base64 编码 PCM）。

**Alternatives considered**:
- `MediaRecorder` + WebM/Opus：不兼容 xAI WebSocket 协议要求的原始 PCM 格式，被否决。
- `getUserMedia` + ScriptProcessorNode：已废弃，不推荐，被否决。
