# Implementation Plan: 聊天界面 MCP 工具调用展示优化

**Branch**: `011-tool-call-ui` | **Date**: 2026-04-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-tool-call-ui/spec.md`

## Summary

将聊天界面中 MCP 工具调用的纯文本展示改为 Editorial Minimal 风格卡片组件。核心是新增消息内容解析器 `parseMessageContent()`，将助手消息文本拆分为 text / tool-call / tool-result / tool-error 四种段落，然后分别渲染为对应的卡片组件或纯文本。后端 SSE 格式和流式累积逻辑不做任何修改。

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Next.js 14 App Router, React 18, Tailwind CSS, lucide-react (已有), clsx (已有)
**Storage**: N/A（纯前端组件变更，无数据库操作）
**Testing**: 手动验证（项目暂无前端测试框架）
**Target Platform**: Web 浏览器（桌面 + 移动端）
**Project Type**: Web application（Next.js App Router）
**Performance Goals**: 解析器 O(n) 正则匹配，无性能瓶颈；卡片渲染与现有消息渲染一致
**Constraints**: 不修改后端 SSE 格式（FR-011）；不新增 npm 依赖
**Scale/Scope**: 1 个解析函数 + 3 个卡片组件 + 1 个组件修改

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Provider-Plugin | PASS | 纯前端 UI 变更，不涉及 Provider |
| II. Operator-Configurable | PASS | 不涉及运行时配置 |
| III. No Emoji | PASS | 新代码不含 emoji；解析器匹配后端已有的 emoji 文本模式但 UI 不展示 emoji |
| IV. Spec-Driven | PASS | spec.md 已通过质量检查 |
| V. Security-First | PASS | 无 secret 相关变更 |
| VI. Directory Structure | PASS | 新文件：`lib/parse-message-content.ts`，`components/chat/tool-*-card.tsx` |
| VII. Package Manager | PASS | 无新依赖安装 |

**Technology Constraints Check**:
- Next.js 14 App Router: PASS -- 使用 'use client' 组件
- Prisma 5: N/A
- /api/health: N/A

## Project Structure

### Documentation (this feature)

```text
specs/011-tool-call-ui/
├── plan.md              # This file
├── spec.md              # Feature specification
├── checklists/          # Quality checklists
└── tasks.md             # /speckit.tasks output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
lib/
├── parse-message-content.ts    # NEW: 消息内容解析器

components/chat/
├── tool-call-card.tsx          # NEW: 工具调用中卡片
├── tool-result-card.tsx        # NEW: 工具结果卡片
├── tool-error-card.tsx         # NEW: 工具错误卡片
├── message-list.tsx            # MODIFY: 使用分段渲染
├── chat-interface.tsx          # UNCHANGED: 流式累积逻辑不变
```

**Structure Decision**: 纯前端变更。解析器放 `lib/` 目录遵循项目工具函数惯例（同 `lib/utils.ts`、`lib/types/`）。卡片组件放 `components/chat/` 与现有聊天组件同级。不修改后端任何文件。

## Source Code Patterns (from existing codebase)

### 后端 SSE 文本模式 (app/api/chat/route.ts:227-244)

解析器必须识别的三种文本模式（不做修改）：

```
\n> 正在执行：`toolName`...\n\n          # tool-call
\n> ✅ [toolName] 返回结果：preview...\n\n  # tool-result
\n> ⚠️ 执行遇到错误：error msg\n\n         # tool-error
```

### 现有消息渲染 (components/chat/message-list.tsx:49-68)

当前渲染方式：`msg.content` 整体作为 `whitespace-pre-wrap` 纯文本。

### 设计 token（从现有代码提取）

| Token | 值 |
|-------|-----|
| 正文 | `text-[15px] leading-[1.8] md:leading-[2] tracking-[0.02em]` |
| 正文色 | `text-slate-800 font-medium`（助手），`text-slate-600`（用户） |
| 标签文字 | `text-[13px] font-bold tracking-widest uppercase` |
| 小文字 | `text-[11px] text-slate-400 tracking-widest uppercase` |
| 图标 | lucide-react, `strokeWidth={2.5}`, `size={14}` |
| 圆角 | `rounded-xl` |
| 玻璃效果 | `backdrop-blur-sm` |
| 工具函数 | `clsx()` from `clsx`（项目已使用） |

### ContentSegment 类型设计

```typescript
type ContentSegment =
  | { type: 'text'; content: string }
  | { type: 'tool-call'; toolName: string }
  | { type: 'tool-result'; toolName: string; result: string }
  | { type: 'tool-error'; error: string }
```

解析策略：正则 `exec` 循环，匹配三种工具模式，之间的文本作为 `text` 段。空 text 段跳过。

### 卡片组件设计

**ToolCallCard** -- 工具调用中：
```
bg-slate-50/80 backdrop-blur-sm rounded-xl px-4 py-2.5
border border-slate-200/60
flex items-center gap-2.5
Loader2 (animate-spin, streaming) / Wrench (非 streaming)
font-mono text-[13px] text-slate-500 tracking-wide (工具名)
text-[13px] text-slate-400 ("正在执行...")
```

**ToolResultCard** -- 工具结果：
```
bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2.5
border border-slate-200/40
CheckCircle2 (text-slate-400)
font-mono text-[11px] text-slate-400 tracking-widest uppercase (工具名)
text-[13px] text-slate-600 leading-relaxed (结果文本)
> 150 字符可折叠，展开/收起按钮 text-[11px] text-slate-400 hover:text-slate-600
```

**ToolErrorCard** -- 工具错误：
```
bg-red-50/40 rounded-xl px-4 py-2.5
border border-red-100/60
AlertTriangle (text-red-300)
text-[13px] text-red-400 (错误文本)
```

### MessageList 修改要点

1. 仅对 `msg.role === 'assistant'` 调用 `parseMessageContent(msg.content)`
2. 遍历 segments，按 type 渲染：
   - `text` -> 原 `whitespace-pre-wrap` div
   - `tool-call` -> `<ToolCallCard isStreaming={msg.streaming} />`
   - `tool-result` -> `<ToolResultCard />`
   - `tool-error` -> `<ToolErrorCard />`
3. 流式光标移到最后一个 segment 之后
4. 用户消息渲染不变

## Complexity Tracking

无 Constitution 违规。此 feature 是纯增量 UI 优化，复杂度低。
