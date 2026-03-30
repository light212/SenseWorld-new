# Research: AI Chat Core (003-ai-chat-core)

## 1. SSE 流式响应方案（Next.js 14 App Router）

**Decision**: 使用 `new Response(ReadableStream, { headers })` 模式在 Next.js 14 App Router route.ts 中实现 SSE 流。

**Rationale**: Next.js 14 App Router API 路由返回标准 Web `Response` 对象。`ReadableStream` + `TextEncoder` 是 Node.js/Edge 兼容的最简方案，无需额外库。

**关键实现细节**:
```typescript
export const dynamic = 'force-dynamic'; // 必须，防止静态缓存

const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder();
    try {
      for await (const chunk of providerStream) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    } finally {
      controller.close();
      // 异步写库，不阻塞客户端
      saveAssistantMessage(sessionId, accumulated).catch(console.error);
    }
  },
});

return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // 禁用 nginx 缓冲
  },
});
```

**Alternatives considered**:
- `TransformStream`：可行但比 `ReadableStream` 构造函数更复杂，无额外收益。
- Vercel AI SDK (`ai` 包)：引入额外依赖，且本项目需要自定义 Provider 接口，绕过 SDK 封装反而增加复杂性。

---

## 2. Anthropic SDK 流式方案

**Decision**: 使用 `@anthropic-ai/sdk` 的 `client.messages.stream()` 方法，迭代 `content_block_delta` 事件获取文本 chunk。

**Rationale**: 官方 SDK，稳定 API，与 Provider 接口 `AsyncGenerator<string>` 自然适配。

**新增依赖**: `@anthropic-ai/sdk`（当前 package.json 中不存在）

**实现模式**:
```typescript
import Anthropic from '@anthropic-ai/sdk';

async *stream(messages, systemPrompt): AsyncGenerator<string> {
  const stream = await this.client.messages.stream({
    model: this.model,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
```

**Alternatives considered**:
- `client.messages.create({ stream: true })`：低级 API，需手动处理事件类型，不如 `.stream()` 简洁。

---

## 3. OpenAI SDK 流式方案

**Decision**: 使用 `openai` 包的 `client.chat.completions.create({ stream: true })`，迭代 chunk 获取 `choices[0].delta.content`。

**Rationale**: 官方 SDK，与 Anthropic 实现结构对称，易于维护。

**新增依赖**: `openai`（当前 package.json 中不存在）

**实现模式**:
```typescript
import OpenAI from 'openai';

async *stream(messages, systemPrompt): AsyncGenerator<string> {
  const stream = await this.client.chat.completions.create({
    model: this.model,
    stream: true,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  });
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) yield text;
  }
}
```

**Alternatives considered**:
- Azure OpenAI SDK：同一接口，但本期只支持 api.openai.com，Azure 可在 Factory 扩展时添加。

---

## 4. LLMProvider 接口设计

**Decision**: 定义 `LLMProvider` 接口，`stream()` 方法返回 `AsyncGenerator<string>`，附加 `supportsVision` 和 `supportsNativeAudio` 标志。

**Rationale**: `AsyncGenerator<string>` 与 `ReadableStream` 的适配代码最简洁（直接 `for await`），且 TypeScript 原生支持。两个能力标志供后续 Feature 005（Vision）和 Feature 004（Voice）使用，本期不启用。

**接口定义**:
```typescript
export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string; // Feature 005 预留
}

export interface LLMProvider {
  readonly supportsVision: boolean;
  readonly supportsNativeAudio: boolean;
  stream(messages: LLMMessage[], systemPrompt: string): AsyncGenerator<string>;
}
```

---

## 5. AccessToken 鉴权方案

**Decision**: 从 HTTP query 参数 `?token=<value>` 读取 token，查询 `AccessToken` 表验证 `enabled=true` 且未过期。

**Rationale**: 访客通过扫码或链接打开 `/?token=xxx`，前台页面从 URL 读取后附加到每次 `/api/chat` 请求。无需 Cookie，与无状态 SSE 兼容。

**验证逻辑**:
```typescript
const record = await prisma.accessToken.findUnique({ where: { token } });
if (!record || !record.enabled) return 401;
if (record.expiresAt && record.expiresAt < new Date()) return 401;
```

---

## 6. 对话历史与 Session 管理

**Decision**: Session ID 在第一次请求时由服务端创建，通过响应头 `X-Session-Id` 返回给客户端。后续请求在 Body 中携带 `sessionId`。

**Rationale**: 避免客户端生成 UUID（不可信），服务端控制 session 生命周期，与 `ChatSession` 表关联 `accessToken` 字段保持一致。

**历史加载**:
```typescript
const messages = await prisma.message.findMany({
  where: { sessionId },
  orderBy: { createdAt: 'asc' },
  select: { role: true, content: true },
});
```

**DB 写入时序**:
1. 收到请求 → 保存 user message
2. 返回 ReadableStream 开始流
3. 流结束（finally 块）→ 异步保存完整 assistant message（不阻塞客户端）

---

## 7. 新增依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `@anthropic-ai/sdk` | `^0.36.0` | Claude Provider 实现 |
| `openai` | `^4.x` | OpenAI Provider 实现 |

两个包均为 Provider 实现的直接依赖，无可替代方案。

---

## 8. Config Key 约定（复用 002 已定义）

| Key | 说明 | 回退环境变量 |
|-----|------|-------------|
| `AI_PROVIDER` | `openai` 或 `anthropic` | `AI_PROVIDER` |
| `AI_API_KEY` | 对应服务商 API Key | `AI_API_KEY` |
| `AI_MODEL` | 模型名称，如 `gpt-4o`/`claude-3-5-sonnet-20241022` | `AI_MODEL` |
| `SYSTEM_PROMPT` | 系统提示词 | `SYSTEM_PROMPT` |

所有 key 通过 `getConfig()` 读取，数据库优先于环境变量，实时生效（无缓存）。

---

## 解决的 NEEDS CLARIFICATION

所有技术细节已明确，无遗留未解决项。
