# Tasks: Chat UI（006）

**Branch**: `006-chat-ui`
**Input**: `/specs/006-chat-ui/` — plan.md, spec.md, data-model.md, contracts/
**Tests**: 手动验证（quickstart.md）

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件，无依赖）
- **[Story]**: 对应用户故事

---

## Phase 1: 基础设施（阻塞所有故事）

**⚠️ CRITICAL**: 以下任务必须先完成，所有 User Story 才能开始。

- [ ] T001 新增 `GET /api/capabilities/route.ts` — token 验证 + 读取 LLMFactory/SpeechFactory 能力标志，返回 `{ supportsSTT, supportsTTS, supportsVision }`（契约：`contracts/api-capabilities.md`）
- [ ] T002 在 `app/api/chat/route.ts` 新增 `GET` handler — `?sessionId&token` 加载历史消息，返回 `{ sessionId, messages[] }`（契约：`contracts/api-chat-history.md`）

---

## Phase 2: US1 — 文字对话

**依赖**: T001, T002

- [ ] T003 [US1] 新建 `components/chat/message-bubble.tsx` — 渲染单条消息气泡（user/assistant 区分样式，streaming 状态支持）
- [ ] T004 [P] [US1] 新建 `components/chat/message-list.tsx` — 消息列表，自动滚动到底部，渲染 `DisplayMessage[]`
- [ ] T005 [P] [US1] 新建 `components/chat/chat-input-bar.tsx` — 文字输入框 + 发送按钮，支持 Enter 发送，loading 时禁用
- [ ] T006 [US1] 新建 `app/(chat)/page.tsx` — `/chat?token=` 路由主页面：token 无效时显示「链接已失效」，有效时初始化 `ChatState`，调用 T001/T002 端点，渲染 MessageList + ChatInputBar
- [ ] T007 [US1] 在 `app/(chat)/page.tsx` 实现 SSE 流式发送逻辑 — `POST /api/chat`，逐 chunk 更新最后一条 assistant 消息的 `content`，流结束后清除 `streaming` 标志

**验收**（quickstart.md US1）：进入页面 → 输入「你好」→ 看到 AI 流式回复。

---

## Phase 3: US2 — 语音输入（STT）

**依赖**: T006（页面已存在）

- [ ] T008 [US2] 新建 `components/voice-recorder.tsx` — 按住录音（支持 touch 事件）、松开后调用 `POST /api/speech/stt`，返回转录文字；状态机：`idle → recording → processing → idle`
- [ ] T009 [US2] 在 `app/(chat)/page.tsx` 集成 VoiceRecorder — `capabilities.supportsSTT` 为 `true` 时显示录音按钮；转录结果填入输入栏

**验收**（quickstart.md US2）：按住录音 → 说话 → 松开 → 文字出现在输入栏。

---

## Phase 4: US3 — 摄像头视觉（Vision）

**依赖**: T006（页面已存在）

- [ ] T010 [US3] 在 `app/(chat)/page.tsx` 集成已有 `CameraCapture`（`components/camera-capture.tsx`）— `capabilities.supportsVision` 为 `true` 时显示摄像头开关；摄像头关闭时发送请求不含 `images` 字段

**验收**（quickstart.md US3）：开启摄像头 → 发送「你看到了什么？」→ AI 描述画面内容。

---

## Phase 5: US4 — TTS 语音回复

**依赖**: T007（SSE 流完成逻辑已存在）

- [ ] T011 [US4] 在 `app/(chat)/page.tsx` 实现 TTS 播放逻辑 — SSE 流结束后，若 `capabilities.supportsTTS` 为 `true` 则调用 `POST /api/speech/tts`，用 `<audio>` 标签播放；新消息发送时停止当前播放；TTS 失败静默降级；`supportsTTS` 为 `false` 时跳过

**验收**（quickstart.md US4）：AI 回复结束后自动播放语音；发送下一条时语音停止。

---

## Phase 6: 响应式布局（跨所有故事）

**依赖**: T003–T005（组件存在后）

- [ ] T013 [P] 在所有新组件中应用 Tailwind 移动端断点 — 375px 最小宽度无水平滚动，ChatInputBar 固定底部，录音按钮足够大可触摸

**验收**（SC-005）：375px 宽度设备访问无水平滚动条。

---

## 实施顺序

```
T001 + T002（并行）
    ↓
T003 + T004 + T005（并行）
    ↓
T006 → T007          ← US1 MVP，可独立验证
    ↓
T008 → T009          ← US2，可独立验证
T010                 ← US3，可独立验证
T011                 ← US4，可独立验证
T013（任意时机）     ← 响应式，建议与各故事同步推进
```
