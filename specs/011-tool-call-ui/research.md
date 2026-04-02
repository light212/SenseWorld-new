# Research: 聊天界面 MCP 工具调用展示优化

**Feature**: 011-tool-call-ui
**Date**: 2026-04-03

## Decision 1: 消息内容解析策略

**Decision**: 使用正则表达式 `exec` 循环匹配三种工具文本模式，未匹配部分作为纯文本段落。

**Rationale**:
- 后端 SSE 文本模式固定且格式统一（`> 正在执行：`...`...`、`> [工具名] 返回结果：`、`> 执行遇到错误：`）
- 正则性能足够（每条消息只解析一次，消息长度通常 < 10KB）
- 比状态机或字符串 split 更简洁，且能精确提取工具名和结果文本

**Alternatives considered**:
- 字符串 `split` + `indexOf`：需要多层嵌套判断，不如正则直观
- 后端直接返回结构化数据：违反 FR-011（不改后端 SSE 格式）

## Decision 2: 解析器放置位置

**Decision**: 放在 `lib/parse-message-content.ts`，作为独立工具函数。

**Rationale**:
- 遵循项目惯例（`lib/utils.ts`、`lib/types/` 等）
- 解析逻辑是纯函数，与 UI 组件解耦，便于测试和复用
- 与 `components/chat/` 的 UI 组件职责分离

**Alternatives considered**:
- 放在 `components/chat/` 内：逻辑和 UI 耦合，不利于复用
- 放在 `lib/mcp/`：解析器是通用 UI 工具，不是 MCP 特有逻辑

## Decision 3: 折叠交互实现

**Decision**: 使用 React `useState` 管理展开/收起状态，无需动画库。

**Rationale**:
- 项目无动画库依赖，遵循 Constitution VII（不新增依赖）
- 简单的 show/hide 切换不需要过渡动画
- 150 字符阈值足够避免初始消息过长

**Alternatives considered**:
- CSS `max-height` 过渡动画：在动态内容高度下不可靠
- framer-motion：需要新增依赖，违反 Constitution VII

## Decision 4: 流式传输中的解析行为

**Decision**: 每次 `msg.content` 变化时重新完整解析，不完整模式作为纯文本渲染。

**Rationale**:
- 消息内容是累积的（`fullContent += textDelta`），每次增量更新后整体重新解析
- 正则只匹配完整模式，不完整的中间态自然落入纯文本段
- 实现简单，React 的 reconciliation 确保高效渲染

**Alternatives considered**:
- 增量解析（只解析新增部分）：状态管理复杂，收益低
- 缓存解析结果 + 增量匹配：过度工程化
