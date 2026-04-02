# Tasks: 后台配置 UI 重设计 + xAI 接入

**Input**: Design documents from `/specs/009-config-ux-xai/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: 本项目无自动化测试框架，采用手动验证方式。

**Organization**: 任务按用户故事组织，支持独立实现和测试。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 所属用户故事（US1-US5）
- 描述包含具体文件路径

## Path Conventions

- **项目结构**: Next.js 14 App Router monorepo
- **lib/**: 服务层（AI、语音 provider）
- **app/api/**: API routes
- **components/**: UI 组件

---

## Phase 1: Setup

**Purpose**: 无需项目初始化（现有项目），仅确认环境就绪

- [x] T001 确认现有项目环境就绪（Node.js 20、pnpm、MySQL 容器运行）
- [x] T002 [P] 确认 `specs/009-config-ux-xai/` 文档齐全（spec.md、plan.md 已存在）

---

## Phase 2: Foundational（基础 Provider 支持）

**Purpose**: 为所有用户故事提供 xAI Provider 基础能力

**⚠️ CRITICAL**: 此阶段完成后方可开始 US1-US5 实现

### Speech Provider 基础

- [x] T003 修改 `lib/speech/openai-speech-provider.ts` 构造函数增加 baseURL 参数
- [x] T004 新增 `lib/speech/xai-speech-provider.ts` 实现 SpeechProvider 接口（委托 OpenAISpeechProvider）
- [x] T005 修改 `lib/speech/factory.ts` 增加 xai case 和 baseURL 参数支持（依赖 T004 完成）

### AI Provider 基础

- [x] T006 修改 `lib/ai/factory.ts` 增加 xai case（返回 OpenAIProvider + x.ai baseURL）
- [x] T027 修改 `app/api/chat/route.ts` 补充 xAI 默认 baseURL（`https://api.x.ai/v1`）

### API Routes 基础配置读取

- [x] T007 修改 `app/api/speech/stt/route.ts` 新增读取 SPEECH_BASE_URL 和 SPEECH_VOICE_MODE
- [x] T008 [P] 修改 `app/api/speech/tts/route.ts` 新增读取 SPEECH_BASE_URL 参数
- [x] T009 修改 `app/api/capabilities/route.ts` 新增 realtimeVoice 标志，修正 supportsSTT 逻辑

**Checkpoint**: xAI Provider 基础能力就绪，可开始用户故事实现

---

## Phase 3: User Story 1 - 运营选择 AI 服务商 (Priority: P1) 🎯 MVP

**Goal**: 运营可在后台配置页通过可视化按钮选择 AI 服务商（OpenAI/Anthropic/xAI），动态显示对应字段

**Independent Test**: 切换 Provider 卡片，验证字段动态显示/隐藏；选 xAI 时无代理地址字段

### Implementation for User Story 1

- [x] T010 [US1] 在 `components/admin/ConfigForm.tsx` 从 GROUPS 移除 ai_core group，新增 aiProvider state 和 Provider 选择器 UI（改用独立渲染同步完成）
- [x] T011 [US1] 在 `components/admin/ConfigForm.tsx` 实现 AI Provider 字段动态映射逻辑
- [x] T012 [US1] 在 `components/admin/ConfigForm.tsx` 新增 AI 高级设置折叠（AI_BASE_URL）

**Checkpoint**: US1 完成，AI Provider 卡片选择和动态字段可独立测试

---

## Phase 4: User Story 2 - 运营通过快捷选项选择模型 (Priority: P1)

**Goal**: 运营可通过点击快捷标签选择模型，标签与输入框双向联动高亮

**Independent Test**: 点击芯片自动填入；手动输入时芯片高亮联动

### Implementation for User Story 2

- [x] T014 [US2] 在 `components/admin/ConfigForm.tsx` 新增模型芯片数据和选中状态管理
- [x] T015 [US2] 在 `components/admin/ConfigForm.tsx` 实现芯片点击填入和输入框双向联动高亮

**Checkpoint**: US2 完成，模型快捷选择可独立测试

---

## Phase 5: User Story 3 - 运营配置语音信道服务商 (Priority: P1)

**Goal**: 运营可选择语音服务商（OpenAI/Azure/xAI/不启用），动态显示对应字段

**Independent Test**: 切换语音 Provider，验证字段显示；选 Azure 显示区域；选 xAI 显示模式切换；选不启用字段全隐藏

### Implementation for User Story 3

- [x] T016 [US3] 在 `components/admin/ConfigForm.tsx` 从 GROUPS 移除 speech_stt group，新增 speechProvider state 和语音 Provider 选择器 UI（改用独立渲染同步完成）
- [x] T017 [US3] 在 `components/admin/ConfigForm.tsx` 实现语音 Provider 字段动态映射（含 SPEECH_REGION、SPEECH_VOICE_MODE）
- [x] T018 [US3] 在 `components/admin/ConfigForm.tsx` 新增 TTS 音色芯片选择（各 provider 不同列表）
- [x] T019 [US3] 在 `components/admin/ConfigForm.tsx` 新增 xAI 交互模式切换 UI（标准/实时）

**Checkpoint**: US3 完成，语音 Provider 配置可独立测试

---

## Phase 6: User Story 4 - xAI 实时语音对话 (Priority: P2)

**Goal**: 配置 xAI+实时模式后，用户端可发起实时语音通话，AI 实时回复，结束后保存历史

**Independent Test**: 后台配置 xAI+实时 → 前端测试实时通话按钮和连接

### Backend Support for User Story 4

- [x] T021 [US4] 新增 `app/api/speech/realtime-session/route.ts` 生成 xAI ephemeral token
- [x] T022 [US4] 新增 `app/api/chat/messages/route.ts` 批量写入 transcript 到 Message 表

### Frontend Implementation for User Story 4

- [x] T023 [US4] 新增 `components/chat/realtime-voice-button.tsx` WebSocket 实时通话组件（状态机：idle/connecting/active/ending）
- [x] T024 [US4] 修改 `components/chat/chat-input-bar.tsx` 新增 realtimeVoice props 并渲染 RealtimeVoiceButton
- [x] T025 [US4] 在 `components/chat/realtime-voice-button.tsx` 实现 AudioWorklet PCM 采集和 AudioContext 播放
- [x] T026 [US4] 在 `components/chat/realtime-voice-button.tsx` 实现通话结束批量保存消息逻辑

**Checkpoint**: US4 完成，实时通话功能可独立测试

---

## Phase 7: User Story 5 - xAI 作为 AI 核心使用 (Priority: P2)

**Goal**: 配置 xAI 后，用户端文字对话和 Vision 功能通过 xAI 完成

**Independent Test**: 配置 xAI API Key + 模型，发送文字和图片消息验证回复（后端基础改动 T006、T027 已在 Phase 2 完成）

> US5 无额外实现任务，依赖 Phase 2 的 T006（LLMFactory xai case）和 T027（chat route baseURL）即可生效。

**Checkpoint**: US5 完成，xAI 对话和 Vision 可独立测试

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 回归测试和边界情况处理

- [x] T028 回归测试 OpenAI/Azure STT/TTS 链路正常工作
- [x] T029 [P] 回归测试 OpenAI/Anthropic 代理地址配置生效
- [x] T030 验证边界情况：xAI 实时模式切回 OpenAI AI 核心不互相干扰
- [x] T031 验证边界情况：xAI 标准模式录音按钮禁用状态和提示
- [x] T032 验证边界情况：网络断开时实时通话已收到内容自动保存
- [x] T033 更新 `PLAN.md` 标记 Feature 009 为已完成

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成 - **BLOCKS 所有用户故事**
- **US1-US3 (Phase 3-5)**: 依赖 Foundational 完成，P1 优先级
- **US4-US5 (Phase 6-7)**: 依赖 Foundational 完成，P2 优先级
- **Polish (Phase 8)**: 依赖所有用户故事完成

### User Story Dependencies

- **US1 (P1)**: 无跨故事依赖，独立可测
- **US2 (P1)**: 与 US1 共用 ConfigForm.tsx，建议顺序执行 US1 → US2
- **US3 (P1)**: 无跨故事依赖，独立可测（可与 US1/US2 并行）
- **US4 (P2)**: 依赖 US3（语音配置 UI）提供 realtimeVoice 标志
- **US5 (P2)**: 依赖 US1（AI 配置 UI）提供 xAI Provider 选择

### Within Each User Story

- ConfigForm 改动建议按 US1 → US2 → US3 顺序执行（同一文件）
- Backend routes 可与 Frontend 组件并行开发（不同文件）

### Parallel Opportunities

```
Phase 2 并行（注意 T004 → T005 顺序依赖）：
├── T003 (openai-speech-provider.ts) ─┐
├── T004 (xai-speech-provider.ts)   ─┤ 先完成
│   └── T005 (factory.ts)           ─┤ 依赖 T004
├── T006 (ai/factory.ts)            ─┼─ 可与 T003/T004 并行
├── T027 (chat/route.ts)            ─┤
├── T007 (stt/route.ts)             ─┤
├── T008 (tts/route.ts)             ─┼─ 可与上述并行
└── T009 (capabilities/route.ts)    ─┘

Phase 6 并行（US4）：
├── T021 (realtime-session/route.ts) ─┐
├── T022 (messages/route.ts)        ─┼─ 后端并行
└── T023 (realtime-voice-button.tsx)─┴─ 可与后端并行
```

---

## Implementation Strategy

### MVP First (US1-US3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational（基础 Provider）
3. Complete Phase 3-5: US1 + US2 + US3（配置 UI）
4. **STOP and VALIDATE**: 测试后台配置 UI 全流程
5. 部署后台配置改进

### Incremental Delivery

1. Setup + Foundational → Provider 基础就绪
2. US1-US3 → 配置 UI 重设计完成 → 部署（MVP！）
3. US4 → 实时语音功能 → 部署
4. US5 → xAI 对话能力 → 部署
5. Polish → 全链路回归验证

---

## Notes

- 所有任务遵循 `- [ ] [ID] [P?] [Story?] 描述 + 文件路径` 格式
- ConfigForm.tsx 改动集中在 US1-US3，建议顺序执行避免冲突
- 本项目无自动化测试，采用手动验证（见 plan.md 验证方式）
- 每个任务完成后建议 commit
- 总任务数：31，已完成：31 (100%)