# Feature Specification: Chat UI（完整前端对话界面）

**Feature Branch**: `006-chat-ui`  
**Created**: 2025-07-21  
**Status**: Draft  
**Input**: 完整前端对话界面（消息列表、流式显示、录音按钮、摄像头预览）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 文字对话界面 (Priority: P1)

用户通过访客链接进入对话页面，在消息列表中看到历史消息，输入文字并发送后，AI 回复以流式方式实时显示在界面上。

**Why this priority**: 这是对话界面的核心功能。没有可用的消息列表和流式显示，所有其他功能都无法呈现。

**Independent Test**: 访问 `/chat?token=<token>` → 看到历史消息（若有）→ 输入「你好」→ 点击发送 → AI 回复逐字流式出现在消息列表中。

**Acceptance Scenarios**:

1. **Given** 用户持有有效 token，**When** 访问 `/chat?token=<token>`，**Then** 页面加载，显示历史消息列表（若存在），底部显示输入栏。
2. **Given** 用户在输入栏输入文字，**When** 点击发送按钮或按 Enter，**Then** 用户消息立即出现在列表末尾，输入栏清空，发送按钮禁用。
3. **Given** 用户消息已发送，**When** 后端 SSE 推送 AI 回复 chunks，**Then** AI 消息气泡实时更新，逐字渲染，流结束后停止加载动画。
4. **Given** AI 正在回复，**When** 流式数据推送中，**Then** 消息列表自动滚动到底部，始终显示最新内容。
5. **Given** 后端返回错误事件，**When** SSE 推送 `{"error": "..."}` 或网络中断，**Then** 页面显示错误提示，输入栏恢复可用。

---

### User Story 2 - 语音输入（录音按钮）(Priority: P2)

用户按住录音按钮进行语音输入，松开后语音自动转为文字并发送给 AI。

**Why this priority**: 语音输入是 SenseWorld 的核心交互方式之一，通过 `/api/speech/stt` 已有后端支持，前端整合是关键缺失环节。

**Independent Test**: 进入对话页 → 按住麦克风按钮说「今天天气怎么样」→ 松开 → AI 回复关于天气的内容。

**Acceptance Scenarios**:

1. **Given** 用户进入对话页，**When** 按住录音按钮，**Then** 按钮变为录音中状态（视觉反馈），浏览器开始录音。
2. **Given** 正在录音，**When** 用户松开录音按钮，**Then** 录音停止，音频发送至 `/api/speech/stt`，转录文字填入输入栏。
3. **Given** STT 转录完成，**When** 文字出现在输入栏，**Then** 自动触发发送（等同用户点击发送）。
4. **Given** 语音服务未配置（`supportsSTT: false`），**When** 用户进入页面，**Then** 录音按钮隐藏，不显示该功能。
5. **Given** 用户拒绝麦克风权限，**When** 点击录音按钮，**Then** 显示「麦克风权限被拒绝」提示，不中断对话。

---

### User Story 3 - 摄像头预览与视觉输入 (Priority: P3)

用户在对话界面开启摄像头后，摄像头预览嵌入界面，发送消息时 AI 能看见当前画面。

**Why this priority**: 基于 005-vision-input 已有的 `CameraCapture` 组件和后端 Vision 支持，前端集成即可完成完整视觉对话闭环。

**Independent Test**: 进入对话页 → 点击摄像头图标 → 预览显示 → 发送「描述你看到的」→ AI 回复包含对画面的描述。

**Acceptance Scenarios**:

1. **Given** 用户进入对话页，**When** 点击摄像头开关，**Then** 摄像头预览区域显示在输入栏上方，实时画面可见。
2. **Given** 摄像头已开启，**When** 用户发送消息，**Then** 当前帧随消息一起发送给 AI（`images` 字段附加到请求）。
3. **Given** 摄像头权限被拒或设备不可用，**When** 尝试开启，**Then** 显示对应错误提示，界面其余功能不受影响。
4. **Given** 用户关闭摄像头，**When** 再次发送消息，**Then** 消息不含图片，走纯文字流程。

---

### User Story 4 - TTS 语音播报 AI 回复 (Priority: P4)

当 AI 完成一条回复后，系统自动将文字转为语音播放，用户也可手动触发或跳过。

**Why this priority**: TTS 让 SenseWorld 成为真正的语音对话体验，`/api/speech/tts` 已有后端，前端播放是最后一环。

**Independent Test**: 进入对话页 → 发送消息 → AI 回复结束后 → 自动播放语音。

**Acceptance Scenarios**:

1. **Given** AI 完成流式回复，**When** 收到 `[DONE]` 事件，**Then** 自动调用 `/api/speech/tts` 获取音频并播放。
2. **Given** 音频正在播放，**When** 有新消息发送，**Then** 停止当前音频播放，处理新请求。
3. **Given** 语音服务未配置（`supportsTTS: false`），**When** AI 完成回复，**Then** 不发起 TTS 请求，仅显示文字。
4. **Given** TTS 请求失败，**When** 网络或服务错误，**Then** 静默降级，不显示错误提示，文字回复正常显示。

---

### Edge Cases

- **token 无效或过期**：页面加载时验证 token，无效则显示「链接已失效」页面，不进入对话。
- **同时按住录音和发送**：录音期间禁用发送按钮，松开后自动发送，不允许手动触发。
- **AI 回复过长**：消息列表支持滚动，不裁断内容；TTS 播放完整文字。
- **快速连续发送**：上一条 AI 回复的 SSE 流未结束时，禁用发送按钮直到上一条完成。
- **页面刷新**：通过 `sessionId` 从后端恢复历史消息；摄像头状态重置为关闭。
- **移动端**：布局适配移动端屏幕，录音按钮支持 touch 事件（touchstart/touchend）。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 在 `/chat?token=<token>` 路由下渲染对话界面；token 无效时显示「链接已失效」错误页。
- **FR-002**: 系统 MUST 在页面加载时从后端获取历史消息并渲染到消息列表。
- **FR-003**: 用户 MUST 能通过文字输入栏发送消息（Enter 键或发送按钮），发送时输入栏清空。
- **FR-004**: 系统 MUST 以 SSE 流式方式渲染 AI 回复，每个 chunk 实时追加到消息气泡。
- **FR-005**: 系统 MUST 在 AI 回复流结束前禁用发送按钮，流结束后恢复。
- **FR-006**: 消息列表 MUST 在新消息出现时自动滚动到底部。
- **FR-007**: 录音按钮 MUST 在 `supportsSTT: true` 时显示；按住触发录音，松开发送至 `/api/speech/stt`，转录文字自动发送。
- **FR-008**: 摄像头开关 MUST 集成 `CameraCapture` 组件（来自 005-vision-input）；开启时发送消息附带截帧图片。
- **FR-009**: TTS MUST 在 `supportsTTS: true` 时，AI 回复完成后自动调用 `/api/speech/tts` 播放语音；TTS 失败时静默降级。
- **FR-010**: 录音按钮 MUST 支持 touch 事件（移动端兼容）。
- **FR-011**: 系统 MUST 通过 `/api/config/capabilities` 或等效接口获取 provider 能力标志（`supportsSTT`、`supportsTTS`、`supportsVision`），根据结果动态显示/隐藏对应 UI 控件。

### Key Entities

- **ChatMessage（显示用）**: `id`、`role`（user/assistant）、`content`（文字）、`createdAt`；不持久化图片。
- **CapabilityFlags**: `supportsSTT: boolean`、`supportsTTS: boolean`、`supportsVision: boolean`；从后端读取，前端只读。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户从进入页面到发出第一条消息并看到 AI 回复流开始，不超过 3 次点击。
- **SC-002**: AI 回复第一个字符出现延迟（TTFB）不超过 3 秒（取决于 LLM provider，非界面问题）。
- **SC-003**: 录音从松开按钮到文字出现在输入栏不超过 5 秒（正常网络）。
- **SC-004**: 摄像头关闭时发送消息，请求体不含 `images` 字段（可通过 DevTools 网络面板验证）。
- **SC-005**: 界面在 375px 宽移动端屏幕可正常操作，无水平滚动条。

## Assumptions

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right assumptions based on reasonable defaults
  chosen when the feature description did not specify certain details.
-->

- `/api/chat`（SSE 流式）、`/api/speech/stt`、`/api/speech/tts` 路由已由 003/004 实现并可用。
- `CameraCapture` 组件（`components/camera-capture.tsx`）由 005-vision-input 实现，本 feature 直接复用。
- 后端提供接口（或通过现有接口）返回 provider 能力标志；若无，前端默认全部显示并按实际响应降级。
- 本期不实现 Avatar 视频播放（留给 008-avatar）；TTS 播放采用 `<audio>` 标签直接播放 arraybuffer。
- 移动端支持在 scope 内，但不需要 PWA 或原生应用适配。
- 用户为访客（非注册用户），通过 token 访问；无账号体系。
