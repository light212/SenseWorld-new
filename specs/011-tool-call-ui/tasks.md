# Tasks: 聊天界面 MCP 工具调用展示优化 (011-tool-call-ui)

**Input**: Design documents from `/specs/011-tool-call-ui/`
**Prerequisites**: plan.md (required), spec.md (required), research.md

**Tests**: 项目暂无前端测试框架，使用手动验证。spec.md 未明确要求测试。

**Organization**: Tasks 按 user story 分组，支持独立实现和测试。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 对应 spec.md 中的 User Story (US1, US2, US3)
- 描述中包含确切文件路径

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: 消息内容解析器 -- 所有 User Story 的基础设施

**依赖**: 无 -- 可立即开始

**Independent Test**:
1. 调用 `parseMessageContent('hello\n> 正在执行：`search`...\n\nworld')` 返回 3 个 segment: text("hello") + tool-call("search") + text("world")
2. 调用 `parseMessageContent('plain text')` 返回单个 text segment
3. 调用 `parseMessageContent('\n> ✅ [search] 返回结果：found it\n\n')` 返回 tool-result segment

- [X] T001 Create `parseMessageContent()` parser and `ContentSegment` type in `lib/parse-message-content.ts` -- regex exec loop matching 3 patterns: `\n> 正在执行：\`(\w[\w.-]*)\`...\n\n` (tool-call), `\n> ✅ \[(\w[\w.-]*)\] 返回结果：(.+)\n\n` (tool-result), `\n> ⚠️ 执行遇到错误：(.+)\n\n` (tool-error); unmatched text as text segments; skip empty text segments

**Checkpoint**: 解析器可正确拆分消息内容为 typed segments

---

## Phase 2: User Story 1 - 工具调用过程可视化 (Priority: P1)

**Goal**: 工具调用中显示为带旋转图标的半透明灰色卡片

**Independent Test**: 发送触发 MCP 工具调用的消息，验证出现 bg-slate-50/80 卡片 + Loader2 旋转图标 + 工具名 + "正在执行..."

**FR Coverage**: FR-003, FR-004, FR-010

- [X] T002 [US1] Create `ToolCallCard` component in `components/chat/tool-call-card.tsx` -- props: `{ toolName: string; isStreaming?: boolean }`; styles: `bg-slate-50/80 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-slate-200/60 flex items-center gap-2.5`; left icon: `Loader2` (animate-spin when streaming, `size={14} strokeWidth={2.5} text-slate-400`) or `Wrench` (when not streaming); tool name: `font-mono text-[13px] text-slate-500 tracking-wide`; status text: `text-[13px] text-slate-400` ("正在执行..."); mark as `'use client'`

**Checkpoint**: ToolCallCard 可独立渲染，匹配 Editorial Minimal 设计

---

## Phase 3: User Story 2 - 工具结果展示 (Priority: P2)

**Goal**: 工具成功结果显示为白色轻量卡片，长结果可折叠

**Independent Test**: 触发工具调用并成功返回，验证 bg-white/60 卡片 + CheckCircle2 + 工具名大写 + 结果文本（>150 字符可折叠）

**FR Coverage**: FR-005, FR-010

- [X] T003 [P] [US2] Create `ToolResultCard` component in `components/chat/tool-result-card.tsx` -- props: `{ toolName: string; result: string }`; styles: `bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-slate-200/40`; left icon: `CheckCircle2` (`size={14} strokeWidth={2.5} text-slate-400`); tool name: `font-mono text-[11px] text-slate-400 tracking-widest uppercase`; result text: `text-[13px] text-slate-600 leading-relaxed`; collapsible: default show first 150 chars if longer, toggle button `text-[11px] text-slate-400 hover:text-slate-600 transition-colors duration-200`; use `useState` for expand/collapse; mark as `'use client'`

**Checkpoint**: ToolResultCard 可折叠显示长结果，匹配 Editorial Minimal 设计

---

## Phase 4: User Story 3 - 工具错误展示 (Priority: P3)

**Goal**: 工具错误显示为淡红色背景卡片

**Independent Test**: 触发失败的工具调用，验证 bg-red-50/40 卡片 + AlertTriangle + 红色错误文本

**FR Coverage**: FR-006, FR-010

- [X] T004 [P] [US3] Create `ToolErrorCard` component in `components/chat/tool-error-card.tsx` -- props: `{ error: string }`; styles: `bg-red-50/40 rounded-xl px-4 py-2.5 border border-red-100/60`; left icon: `AlertTriangle` (`size={14} strokeWidth={2.5} text-red-300`); error text: `text-[13px] text-red-400`; mark as `'use client'`

**Checkpoint**: ToolErrorCard 显示错误信息，匹配 Editorial Minimal 设计

---

## Phase 5: Integration

**Purpose**: 将解析器和卡片组件集成到 MessageList

**依赖**: Phase 1 (解析器) + Phase 2/3/4 (卡片组件)

**FR Coverage**: FR-001, FR-007, FR-008, FR-009

- [X] T005 Update `components/chat/message-list.tsx` to use segment rendering -- import `parseMessageContent` from `@/lib/parse-message-content` and card components; for `msg.role === 'assistant'`: call `parseMessageContent(msg.content)`, iterate segments rendering: text -> existing `whitespace-pre-wrap` div, tool-call -> `<ToolCallCard isStreaming={msg.streaming} />`, tool-result -> `<ToolResultCard />`, tool-error -> `<ToolErrorCard />`; move streaming cursor (animate-pulse span) after last segment; user messages (msg.role !== 'assistant') rendering unchanged

**Checkpoint**: 聊天界面正确显示工具调用卡片，纯文本消息和用户消息渲染不变

---

## Phase 6: Polish & Verification

- [X] T006 Run `pnpm build` and fix any TypeScript compilation errors
- [X] T007 Update `PLAN.md` -- change 011-tool-call-ui status from "进行中" to "已完成"

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies -- start immediately
- **Phase 2 (US1)**: Depends on Phase 1 (uses ContentSegment type conceptually)
- **Phase 3 (US2)**: Depends on Phase 1 -- can run in parallel with Phase 2 [P]
- **Phase 4 (US3)**: Depends on Phase 1 -- can run in parallel with Phase 2, Phase 3 [P]
- **Phase 5 (Integration)**: Depends on Phase 1 + Phase 2 + Phase 3 + Phase 4
- **Phase 6 (Polish)**: Depends on Phase 5

### User Story Dependencies

```
US1 (ToolCallCard)   -- Phase 2
US2 (ToolResultCard) -- Phase 3  [P: parallel with US1]
US3 (ToolErrorCard)  -- Phase 4  [P: parallel with US1, US2]
                        |
                        v
                  Integration -- Phase 5
                        |
                        v
                  Polish -- Phase 6
```

### Parallel Opportunities

- Phase 2 + Phase 3 + Phase 4: T002, T003, T004 all in different files, can run in parallel
- Phase 6: T006 and T007 can run sequentially (T007 only if T006 passes)

---

## Parallel Example: Card Components

```text
# After parser (T001) is complete, launch all card components in parallel:
Task T002: "Create ToolCallCard in components/chat/tool-call-card.tsx"
Task T003: "Create ToolResultCard in components/chat/tool-result-card.tsx"
Task T004: "Create ToolErrorCard in components/chat/tool-error-card.tsx"

# Then integrate:
Task T005: "Update message-list.tsx to use segment rendering"
```

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2 + Phase 5 minimal)

1. Complete Phase 1: Parser
2. Complete Phase 2: ToolCallCard
3. Modify MessageList minimally (just tool-call + text segments)
4. **STOP and VALIDATE**: Test tool call display works

### Full Delivery

5. Complete Phase 3: ToolResultCard
6. Complete Phase 4: ToolErrorCard
7. Complete Phase 5: Full MessageList integration
8. Complete Phase 6: Build verification
9. All user stories delivered

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to spec.md user story for traceability
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- No new npm dependencies per Constitution VII
- All card components in `components/chat/` per Constitution VI
- Parser in `lib/` per project convention (same as `lib/utils.ts`)
