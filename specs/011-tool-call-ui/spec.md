# Feature Specification: 聊天界面 MCP 工具调用展示优化

**Feature Branch**: `011-tool-call-ui`
**Created**: 2026-04-02
**Status**: Draft
**Input**: User description: "优化聊天界面中 MCP 工具调用的展示，从纯文本改为 Editorial Minimal 风格卡片组件"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 工具调用过程可视化 (Priority: P1)

用户在聊天中发送消息触发 MCP 工具调用时，希望看到清晰、美观的工具执行状态，而不是混在纯文本中的一行 "> 正在执行：`toolName`..."。

**Why this priority**: 工具调用状态是最常见的场景，直接影响用户对系统"正在工作"的感知，是整个优化的核心价值。

**Independent Test**: 发送一条会触发 MCP 工具调用的消息，验证助手回复中出现带旋转图标的半透明灰色卡片，显示工具名称和"正在执行..."状态文字。

**Acceptance Scenarios**:

1. **Given** 用户发送了一条触发 MCP 工具调用的消息, **When** AI 正在执行工具, **Then** 消息流中出现半透明灰色卡片（bg-slate-50/80 + backdrop-blur-sm），左侧显示旋转 Loader2 图标，中间显示工具名（font-mono），右侧显示"正在执行..."文字
2. **Given** 工具正在执行中（streaming 状态）, **When** 消息仍在流式传输, **Then** 旋转图标持续动画，卡片样式保持稳定
3. **Given** 工具执行完毕, **When** 结果或错误消息到达, **Then** "正在执行"卡片被对应的结果或错误卡片替换

---

### User Story 2 - 工具结果展示 (Priority: P2)

工具执行成功后，用户希望看到整洁的结果卡片，而不是一行带 emoji 的纯文本。长结果应该可以折叠，避免占用过多聊天空间。

**Why this priority**: 结果展示是工具调用的最终产出，但依赖 P1（解析逻辑）完成。

**Independent Test**: 发送消息触发工具调用并成功返回，验证出现白色轻量卡片，显示工具名和结果文本，超过 150 字符时出现"展开/收起"按钮。

**Acceptance Scenarios**:

1. **Given** 工具成功返回结果, **When** 结果文本长度 <= 150 字符, **Then** 显示白色轻量卡片（bg-white/60 + backdrop-blur-sm），左侧 CheckCircle2 图标，工具名（font-mono 大写），结果文本完整显示
2. **Given** 工具成功返回结果, **When** 结果文本长度 > 150 字符, **Then** 默认只显示前 150 字符，下方出现"展开"按钮
3. **Given** 结果已折叠显示, **When** 用户点击"展开"按钮, **Then** 显示完整结果文本，按钮变为"收起"
4. **Given** 结果已展开显示, **When** 用户点击"收起"按钮, **Then** 结果文本重新折叠，按钮变为"展开"

---

### User Story 3 - 工具错误展示 (Priority: P3)

工具执行失败时，用户希望看到明确的错误提示卡片，而不是带 emoji 的一行文字。

**Why this priority**: 错误展示频率较低但很重要，依赖 P1 解析逻辑。

**Independent Test**: 触发一个会失败的工具调用，验证出现淡红色背景的错误卡片，显示 AlertTriangle 图标和错误信息。

**Acceptance Scenarios**:

1. **Given** 工具执行遇到错误, **When** 错误消息到达, **Then** 显示淡红色背景卡片（bg-red-50/40），左侧 AlertTriangle 图标（text-red-300），错误信息文本（text-red-400）

---

### Edge Cases

- 消息中同时包含纯文本和多次工具调用（文本 + 工具调用 + 文本 + 工具调用 + 结果）：各段独立渲染，保持原有顺序
- 纯文本消息（无任何工具调用）：渲染逻辑不变，与当前 whitespace-pre-wrap 一致
- 工具名包含特殊字符（如中划线、点号）：正则正确提取完整工具名
- 流式传输中工具调用文本逐步到达：解析器应能处理不完整的模式（不匹配时作为纯文本渲染）
- 空消息内容：不渲染任何内容
- 用户消息：不受影响，保持原有渲染逻辑

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须解析助手消息内容，将文本拆分为四种类型的段落：纯文本（text）、工具调用中（tool-call）、工具结果（tool-result）、工具错误（tool-error）
- **FR-002**: 解析器必须识别后端 SSE 流式格式中的三种工具相关文本模式："> 正在执行：`toolName`..."、"> ✅ [toolName] 返回结果：..."、"> ⚠️ 执行遇到错误：..."
- **FR-003**: 工具调用中的卡片必须使用半透明灰色背景（bg-slate-50/80）+ 玻璃效果（backdrop-blur-sm）+ 轻边框（border-slate-200/60）+ 圆角（rounded-xl）
- **FR-004**: 工具调用中卡片在 streaming 状态时必须显示旋转 Loader2 图标动画
- **FR-005**: 工具结果卡片必须使用白色轻量背景（bg-white/60）+ 玻璃效果 + 可折叠结果文本（超过 150 字符可展开/收起）
- **FR-006**: 工具错误卡片必须使用淡红色背景（bg-red-50/40）+ AlertTriangle 图标 + 红色系错误文本
- **FR-007**: 助手消息必须按段落顺序渲染，纯文本段保持原有 whitespace-pre-wrap 样式，工具卡片段渲染为对应卡片组件
- **FR-008**: 用户消息渲染逻辑完全不变
- **FR-009**: 流式光标（animate-pulse）应显示在消息最后一个段落之后
- **FR-010**: 所有图标使用 lucide-react，strokeWidth={2.5}，尺寸 size={14}
- **FR-011**: 后端 SSE 格式和流式累积逻辑不做任何修改

### Key Entities

- **ContentSegment**: 消息内容的最小渲染单元，类型为 text / tool-call / tool-result / tool-error
- **ToolCallCard**: 工具调用进行中的 UI 卡片组件
- **ToolResultCard**: 工具执行成功的 UI 卡片组件（含折叠功能）
- **ToolErrorCard**: 工具执行失败的 UI 卡片组件

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 所有包含 MCP 工具调用的助手消息都能正确解析并渲染为独立的卡片组件，无纯文本残留
- **SC-002**: 纯文本消息（无工具调用）的渲染效果与优化前完全一致
- **SC-003**: 长工具结果（超过 150 字符）默认折叠显示，用户点击可展开/收起，交互流畅无闪烁
- **SC-004**: 卡片视觉风格与现有聊天界面的 Editorial Minimal 设计语言无缝融合，无突兀感
- **SC-005**: 流式传输过程中工具调用卡片实时出现，光标动画正常显示

## Assumptions

- 后端 SSE 格式（app/api/chat/route.ts 中的 tool-call/tool-result/error 文本模式）保持不变
- 现有流式消息累积逻辑（chat-interface.tsx 中的 SSE 处理）保持不变
- 项目已有 lucide-react 依赖，无需新增 npm 依赖
- 项目已有 clsx 工具函数用于 class 合并
- 解析器只处理 role === 'assistant' 的消息
- 不完整的工具调用文本（流式传输中间态）作为纯文本渲染，等完整模式到达后不会重新渲染（因为消息内容是累积的，完整模式到达后整体重新解析）
