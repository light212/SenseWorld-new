# Implementation Plan: AI Chat Core

**Branch**: `003-ai-chat-core` | **Date**: 2025-07-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-ai-chat-core/spec.md`

## Summary

实现 SenseWorld 多模型可切换的流式 AI 对话核心。技术方案：定义 `LLMProvider` 接口（`stream()` 返回 `AsyncGenerator<string>`），实现 `OpenAIProvider`（openai SDK）和 `AnthropicProvider`（@anthropic-ai/sdk），`LLMFactory.create()` 从 Config 表读取运营配置决定实例化哪个 Provider；`POST /api/chat` 路由验证 AccessToken、管理 ChatSession、持久化 Message，以 SSE 格式将 LLM 流写入响应。所有数据模型复用 001 已定义表结构，无需数据库迁移。

## Technical Context

**Language/Version**: TypeScript 5.x，Node.js 20 LTS
**Primary Dependencies**: Next.js 14, @anthropic-ai/sdk ^0.36.0（新增）, openai ^4.x（新增）, Prisma ORM 5.x
**Storage**: MySQL 8.0，复用 ChatSession / Message / AccessToken / Config 四张已有表
**Testing**: 手动验证（curl SSE + 浏览器），与 001/002 保持一致
**Target Platform**: Linux 服务器（Docker Compose）；本地开发支持 macOS
**Project Type**: Web 应用（全栈，Next.js App Router monorepo）
**Performance Goals**: 首个 token 到达客户端 < 2s（受 LLM Provider 影响）；/api/chat 路由本身鉴权+DB 读写开销 < 200ms
**Constraints**: SSE 流不依赖 WebSocket；getConfig 使用内存缓存（002 已实现，数据库优先于环境变量，setConfig 写库后同步更新缓存）；不使用 Vercel AI SDK
**Scale/Scope**: 单节点，并发访客 < 100，消息历史不做分页截断（本期全量加载）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 检查项 | 状态 |
|------|--------|------|
| I. Provider-Plugin 架构 | LLMProvider 接口 + LLMFactory；业务逻辑（/api/chat）不直接 import Anthropic/OpenAI SDK | PASS |
| II. 运营可配置运行时 | AI_PROVIDER / AI_MODEL / API_KEY / SYSTEM_PROMPT 均通过 getConfig() 读取，数据库优先，实时生效 | PASS |
| III. 禁止 Emoji | 所有代码、注释、文档、UI 文案不含 emoji | PASS |
| IV. Spec 驱动开发 | spec.md 已完成，plan 在实现前完成 | PASS |
| V. 安全优先密钥管理 | API Key 通过 getConfig() 读取，不硬编码；不在日志中输出 API Key | PASS |

**Constitution Check Result**: 全部通过，无违规项。

## Project Structure

### Documentation (this feature)

```text
specs/003-ai-chat-core/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出
├── quickstart.md        # Phase 1 输出
├── contracts/
│   └── chat-api.md      # Phase 1 输出
└── tasks.md             # /speckit.tasks 输出
```

### Implementation Structure

```text
/
├── lib/
│   └── llm/
│       ├── types.ts              # LLMProvider 接口、LLMMessage 类型
│       ├── factory.ts            # LLMFactory.create() — 读取 AI_PROVIDER 配置
│       ├── openai-provider.ts    # OpenAI Provider 实现
│       └── anthropic-provider.ts # Anthropic Provider 实现
├── app/
│   └── api/
│       └── chat/
│           └── route.ts          # POST /api/chat SSE 路由
└── package.json                  # 新增 @anthropic-ai/sdk、openai 依赖
```

## Phase 0: Research

**Status**: COMPLETE — 见 [research.md](research.md)

| 问题 | 结论 |
|------|------|
| Next.js 14 SSE 实现方式 | `new Response(ReadableStream, { headers })` + `export const dynamic = 'force-dynamic'` |
| Anthropic SDK 流式方式 | `client.messages.stream()` → 迭代 `content_block_delta` 事件 |
| OpenAI SDK 流式方式 | `client.chat.completions.create({ stream: true })` → `chunk.choices[0].delta.content` |
| Provider 接口返回类型 | `AsyncGenerator<string>` — 与 ReadableStream for-await 适配最简洁 |
| 鉴权方案 | query param `?token=` → 查 AccessToken 表，验证 enabled + 未过期 |
| Session ID 传递 | 服务端创建后通过 `X-Session-Id` 响应头返回，客户端存储后续请求携带 |
| DB 写入时机 | ReadableStream `finally` 块异步写 assistant message，不阻塞流 |
| 新增依赖 | `@anthropic-ai/sdk`、`openai` |

## Phase 1: Design

**Status**: COMPLETE

### 1.1 LLM Provider 接口

```typescript
// lib/llm/types.ts
export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string; // Feature 005 预留，本期忽略
}

export interface LLMProvider {
  readonly supportsVision: boolean;       // Feature 005 使用
  readonly supportsNativeAudio: boolean;  // Feature 004 使用
  stream(
    messages: LLMMessage[],
    systemPrompt: string
  ): AsyncGenerator<string>;
}
```

### 1.2 LLMFactory

```typescript
// lib/llm/factory.ts
import { getConfig } from '@/lib/config';
import { LLMProvider } from './types';
import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';

export class LLMFactory {
  static async create(): Promise<LLMProvider> {
    const provider = await getConfig('AI_PROVIDER');
    const apiKey   = await getConfig('AI_API_KEY');
    const model    = await getConfig('AI_MODEL');

    if (!provider) throw new Error('AI provider not configured');
    if (!apiKey)   throw new Error('AI API key not configured');

    switch (provider.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(apiKey, model ?? 'gpt-4o');
      case 'anthropic':
        return new AnthropicProvider(apiKey, model ?? 'claude-3-5-sonnet-20241022');
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  }
}
```

### 1.3 POST /api/chat 路由逻辑

```
GET 请求体: { sessionId?: string, message: string }
query param: ?token=<value>

1. validateToken(token)       → 401 if invalid
2. validate message non-empty → 400 if empty
3. sessionId 为空 → prisma.chatSession.create({ data: { accessToken: token } })
   sessionId 存在 → prisma.chatSession.findUnique → 404 if not found
4. 加载历史: prisma.message.findMany({ where: { sessionId }, orderBy: createdAt asc })
5. 写 user message: prisma.message.create({ sessionId, role: 'user', content: message })
6. systemPrompt = await getConfig('SYSTEM_PROMPT') ?? 'You are a helpful assistant.'
7. llmProvider = await LLMFactory.create()    → 503 if throws
8. generator = llmProvider.stream(history + user msg, systemPrompt)
9. 返回 new Response(ReadableStream { start(controller) {
     accumulated = ''
     for await (chunk of generator) {
       accumulated += chunk
       controller.enqueue(encode(`data: {"text":"..."}\n\n`))
     }
     controller.enqueue(encode('data: [DONE]\n\n'))
   },
   finally: saveAssistantMessage(sessionId, accumulated).catch()
}), headers: { Content-Type: text/event-stream, X-Session-Id: sessionId })
```

### 1.4 数据模型

见 [data-model.md](data-model.md) — 无 schema 迁移，复用 001 全部表。

### 1.5 API 契约

见 [contracts/chat-api.md](contracts/chat-api.md)

## Phase 2: Tasks

**Status**: PENDING — 执行 `/speckit.tasks` 生成

---

## Appendix: Sequence Diagram

```
Client           /api/chat          LLMFactory       LLMProvider        DB (Prisma)
  |                  |                   |                 |                |
  |-- POST /api/chat?token=xxx --------->|                 |                |
  |                  |-- validateToken() ---------------------------------------->|
  |                  |<----------------------------------------------- record ----|
  |                  |-- load/create session ---------------------------------->|
  |                  |-- save user Message ------------------------------------>|
  |                  |-- LLMFactory.create() ------->|                 |        |
  |                  |<------------------ provider --|                 |        |
  |                  |-- provider.stream() ---------------------->|             |
  |<-- 200 SSE ----  |                               |            |             |
  |<- data:{text}    |<-- yield chunk --------------|             |             |
  |<- data:{text}    |<-- yield chunk --------------|             |             |
  |<- data:[DONE] -- |                               |            |             |
  |                  |-- saveAssistantMessage (async) ----------------------->|
```
