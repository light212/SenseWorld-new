# Implementation Plan: Chat UI（006）

**Branch**: `006-chat-ui` | **Date**: 2025-07-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-chat-ui/spec.md`

## Summary

构建完整的前端对话界面：`/chat?token=<token>` 路由，支持文字对话（SSE 流式）、语音输入（STT）、摄像头视觉（Vision）、TTS 语音回复，以及移动端响应式布局。新增 `GET /api/capabilities` 和 `GET /api/chat`（历史加载）两个后端端点。

## Technical Context

**Language/Version**: TypeScript 5, Next.js 14 App Router  
**Primary Dependencies**: React 18, Tailwind CSS, Anthropic/OpenAI SDK（已有）  
**Storage**: MySQL via Prisma（复用已有 ChatSession/Message 表）  
**Testing**: 手动验证（无自动化测试框架配置）  
**Target Platform**: 现代浏览器（Chrome/Firefox/Safari）+ 移动端 375px+
**Project Type**: Web App（Next.js full-stack）  
**Performance Goals**: SSE TTFB < 3s，录音转文字 < 5s  
**Constraints**: 无新 DB 表，无新 npm 依赖（仅使用已安装包）  
**Scale/Scope**: 单页面对话界面，访客用户，token 鉴权

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **No new database tables**: ✓ 复用已有 ChatSession/Message 表
- **No new npm dependencies**: ✓ 仅使用 React/Next.js/Tailwind 已有包
- **`/api/health` unaffected**: ✓ 不修改现有健康检查路由
- **No direct DB queries in components**: ✓ 前端通过 API 路由访问数据
- **Token auth preserved**: ✓ 所有新端点复用 `lib/auth/token.ts` 验证

## Project Structure

### Documentation (this feature)

```text
specs/006-chat-ui/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-capabilities.md
│   ├── api-chat-history.md
│   └── chat-page-component.md
└── tasks.md             # /speckit.tasks 生成
```

### Source Code (repository root)

```text
app/
├── (chat)/
│   └── page.tsx              # NEW: 对话主页面 /chat?token=...
├── api/
│   ├── capabilities/
│   │   └── route.ts          # NEW: GET /api/capabilities
│   └── chat/
│       └── route.ts          # MODIFY: 新增 GET 历史加载方法
components/
├── camera-capture.tsx        # EXISTING (005)
├── voice-recorder.tsx        # NEW
└── chat/
    ├── message-list.tsx      # NEW
    ├── message-bubble.tsx    # NEW
    └── chat-input-bar.tsx    # NEW
```

**Structure Decision**: Next.js App Router，`(chat)` route group 复用已有 layout。新增 4 个 React 组件 + 2 个 API 路由。无新 npm 依赖，无新 DB 表。

## Complexity Tracking

> 无 Constitution 违规。本 feature 仅新增前端页面和 2 个轻量 API 端点，未引入新依赖或新抽象层。
