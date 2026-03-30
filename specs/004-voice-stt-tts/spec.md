# Feature Specification: Voice STT/TTS 可配置语音能力

**Feature Branch**: `004-voice-stt-tts`
**Created**: 2025-07-18
**Status**: Draft
**Input**: STT/TTS 可配置语音能力（SpeechProvider 接口 + OpenAI/Azure 实现）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 语音输入转文字（STT）(Priority: P1)

用户点击麦克风按钮录音，录音结束后音频自动上传到 `/api/speech/stt`，返回转写文本，文本填入对话输入框，用户可直接发送。

**Why this priority**: STT 是语音交互的入口，没有它就无法实现语音对话。实现后即可独立演示语音输入能力，与 TTS 解耦。

**Independent Test**: 使用 curl 或 Postman 上传一段 webm/wav 音频到 `/api/speech/stt?token=<valid_token>`，验证返回转写文字，无需 TTS 或前端 UI。

**Acceptance Scenarios**:

1. **Given** 有效的 access token 且运营配置 `speech_provider=openai`，**When** POST `/api/speech/stt` 附带 audio/webm 音频文件，**Then** 返回 `{ text: "<转写内容>" }` 且 HTTP 200
2. **Given** 有效的 access token 且运营配置 `speech_provider=azure`，**When** POST `/api/speech/stt` 附带 audio/wav 音频文件，**Then** 返回 `{ text: "<转写内容>" }` 且 HTTP 200
3. **Given** 无效或过期的 access token，**When** POST `/api/speech/stt`，**Then** 返回 HTTP 401
4. **Given** 请求体不包含音频文件，**When** POST `/api/speech/stt`，**Then** 返回 HTTP 400 及错误描述
5. **Given** 音频文件超过 25MB，**When** POST `/api/speech/stt`，**Then** 返回 HTTP 413 或带 `{ error: "file too large" }` 的 400
6. **Given** 运营未配置 `speech_provider`，**When** POST `/api/speech/stt`，**Then** 返回 HTTP 503 及 `{ error: "speech service not configured" }`

---

### User Story 2 - 文字转语音（TTS）(Priority: P2)

AI 回复文字后，系统通过 `/api/speech/tts` 将文字合成为音频流，前端播放，实现完整的语音对话体验。

**Why this priority**: TTS 依赖 STT 完成完整闭环，但可独立通过 API 测试。优先级低于 STT，因为文字显示已是可用体验。

**Independent Test**: 使用 curl POST `/api/speech/tts?token=<valid_token>` 传入 `{ "text": "你好" }`，验证返回音频二进制流（audio/mpeg 或 audio/wav），可用播放器播放。

**Acceptance Scenarios**:

1. **Given** 有效的 access token 且运营配置 `speech_provider=openai`，**When** POST `/api/speech/tts` 传入 `{ text: "你好世界" }`，**Then** 返回 HTTP 200 及音频流（Content-Type: audio/mpeg）
2. **Given** 有效的 access token 且运营配置 `speech_provider=azure`，**When** POST `/api/speech/tts` 传入 `{ text: "你好世界" }`，**Then** 返回 HTTP 200 及音频流（Content-Type: audio/wav）
3. **Given** 请求 `text` 字段为空字符串，**When** POST `/api/speech/tts`，**Then** 返回 HTTP 400 及 `{ error: "text is required" }`
4. **Given** 无效 access token，**When** POST `/api/speech/tts`，**Then** 返回 HTTP 401
5. **Given** 运营未配置 `speech_provider`，**When** POST `/api/speech/tts`，**Then** 返回 HTTP 503 及 `{ error: "speech service not configured" }`

---

### User Story 3 - 运营配置语音服务商（Priority: P3）

运营人员在管理后台配置语音服务商（OpenAI 或 Azure）、API Key 及区域，配置后 STT/TTS API 自动切换到对应服务商，无需重启服务。

**Why this priority**: 语音服务商切换依赖于 STT/TTS 接口已实现，且运营后台（feature 002）已完成配置面板基础能力。

**Independent Test**: 在管理后台将 `speech_provider` 从 openai 切换为 azure，立即调用 `/api/speech/stt`，验证使用 Azure 服务转写。

**Acceptance Scenarios**:

1. **Given** 管理后台已登录，**When** 将 `speech_provider` 设为 `openai` 并保存 `speech_api_key`，**Then** STT/TTS 请求使用 OpenAI Whisper/TTS
2. **Given** 管理后台已登录，**When** 将 `speech_provider` 设为 `azure` 并保存 `speech_api_key` 和 `speech_region`，**Then** STT/TTS 请求使用 Azure Cognitive Services
3. **Given** 配置已更改，**When** 无需重启服务，**Then** 下一次 STT/TTS 请求即使用新配置

---

### Edge Cases

- 音频格式不被服务商支持时（如 Azure 不支持 webm），系统返回 HTTP 415 或转换提示
- 第三方语音服务 API 超时（>30s），系统返回 HTTP 504
- 第三方语音服务返回鉴权失败（API Key 无效），系统返回 HTTP 502 及 `{ error: "speech provider authentication failed" }`
- TTS 文本超过服务商单次限制（OpenAI 4096 字符），系统截断或返回 400 说明
- 并发多个 TTS 请求时，各请求独立处理，互不干扰

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 提供 `POST /api/speech/stt` 端点，接受 multipart/form-data 格式音频文件，返回转写文本
- **FR-002**: 系统 MUST 提供 `POST /api/speech/tts` 端点，接受 JSON `{ text: string }`，返回音频二进制流
- **FR-003**: 两个端点 MUST 使用与 `/api/chat` 相同的 access token 校验机制（`?token=` query param）
- **FR-004**: 系统 MUST 实现 `OpenAISpeechProvider`，使用 Whisper API 做 STT、TTS-1 做 TTS
- **FR-005**: 系统 MUST 实现 `AzureSpeechProvider`，使用 Azure Cognitive Services Speech SDK 做 STT 和 TTS
- **FR-006**: `SpeechFactory.create()` MUST 根据运营配置的 `speech_provider` 值（`openai` / `azure`）选择对应实现
- **FR-007**: 语音服务商配置（provider、api_key、region）MUST 从 MySQL `Config` 表读取，优先级高于环境变量
- **FR-008**: 系统 MUST 在 `speech_provider` 未配置时，对 STT/TTS 请求返回 HTTP 503
- **FR-009**: STT 端点 MUST 支持 audio/webm、audio/wav、audio/mp4 等常见格式
- **FR-010**: TTS 端点 MUST 在响应头中设置正确的 `Content-Type`（OpenAI: audio/mpeg，Azure: audio/wav）

### Key Entities *(include if feature involves data)*

- **Config（现有）**: 复用现有 `Config` 表存储语音配置，key 约定：
  - `speech_provider`: `"openai"` 或 `"azure"`
  - `speech_api_key`: 服务商 API 密钥
  - `speech_region`: Azure 区域（仅 Azure 需要，如 `"eastus"`）
  - `tts_voice`: TTS 音色（可选，OpenAI 默认 `alloy`，Azure 默认 `zh-CN-XiaoxiaoNeural`）
- **SpeechProvider（接口，现有）**: `transcribe(audioBuffer, mimeType): Promise<string>`，`synthesize(text): Promise<{ audio: Buffer; mimeType: string }>`
- **OpenAISpeechProvider（新建）**: 实现 `SpeechProvider`，封装 Anthropic/OpenAI SDK 调用
- **AzureSpeechProvider（新建）**: 实现 `SpeechProvider`，封装 Azure Cognitive Services SDK 调用

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: STT 端点对 10 秒以内普通话语音的转写准确率 ≥ 90%（通过 OpenAI Whisper 或 Azure STT）
- **SC-002**: STT 响应时间在网络正常情况下 ≤ 5 秒（10 秒音频）
- **SC-003**: TTS 端点生成 100 字以内文本音频 ≤ 3 秒
- **SC-004**: 服务商切换（openai ↔ azure）无需代码变更，仅改运营配置即可生效
- **SC-005**: STT/TTS 端点通过与 `/api/chat` 相同的 token 校验，无额外认证成本

## Assumptions

- 用户使用现代浏览器，支持 MediaRecorder API（Chrome 47+，Firefox 29+，Safari 14+）
- 运营后台（feature 002）已实现配置面板，可写入/读取 `Config` 表，本 feature 不需修改管理后台 UI
- OpenAI TTS 默认返回 audio/mpeg（mp3），Azure TTS 默认返回 audio/wav；前端需能播放两种格式
- 音频文件大小限制为 25MB（OpenAI Whisper 上限），Azure 有类似限制
- Azure Speech SDK（`microsoft-cognitiveservices-speech-sdk`）用 npm 安装，不使用 REST 直调
- 本 feature 不涉及前端 UI 组件（录音按钮、音频播放器），UI 在 feature 006 实现；本 feature 仅交付后端 API 和 Provider 实现
- 现有 `AccessToken` 校验逻辑（`validateToken`）直接复用，不重复实现
- 对话中 TTS 播放与否由前端控制，后端仅提供按需合成接口
