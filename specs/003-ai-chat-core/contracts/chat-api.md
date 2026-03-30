# API Contract: AI Chat Core (003-ai-chat-core)

## POST /api/chat

**目的**: 接收访客消息，返回 LLM 流式回复（SSE）并持久化对话历史。

### 认证

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| `token` | Query string | string | 是 | 访客 AccessToken，URL 形式：`/api/chat?token=<value>` |

**验证失败响应**:
- `401 Unauthorized` — token 不存在、已禁用或已过期

### 请求体

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "你好，请介绍一下你自己"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sessionId` | string (UUID) | 否 | 对话 session ID；为空时服务端自动创建新 session |
| `message` | string | 是 | 用户输入的文本消息，不得为空字符串 |

**请求体验证失败响应**:
- `400 Bad Request` — `message` 为空或缺失

### 响应

**成功时**: HTTP 200，Content-Type: `text/event-stream`

**响应头**:

```
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
X-Session-Id: 550e8400-e29b-41d4-a716-446655440000
```

> `X-Session-Id`: 本次对话的 session UUID。若请求中 `sessionId` 为空（新建 session），此处返回新创建的 ID；若已有 session，返回原 ID。客户端应在收到第一条 SSE 事件前读取此响应头并持久化，用于后续请求。

### SSE 事件格式

**文本 chunk 事件**（流式，每个 LLM token 一条）:
```
data: {"text":"你"}

data: {"text":"好"}

data: {"text":"！"}

```

**流结束事件**（最后一条）:
```
data: [DONE]

```

**错误事件**（LLM 调用失败时）:
```
data: {"error":"LLM provider error: <message>"}

data: [DONE]

```

### 服务端处理流程

```
1. 从 query ?token= 读取并验证 AccessToken
2. 解析请求体，校验 message 非空
3. 若 sessionId 为空 → 创建新 ChatSession（关联 token）
   若 sessionId 存在 → 查询验证 session 存在（404 if not found）
4. 从 DB 加载该 session 历史消息（按 createdAt ASC）
5. 写入 user Message 到 DB
6. 从 Config 表读取 AI_PROVIDER / AI_API_KEY / AI_MODEL / SYSTEM_PROMPT
7. LLMFactory.create() 实例化对应 Provider
8. 调用 provider.stream(messages, systemPrompt) 获取 AsyncGenerator
9. 返回 ReadableStream SSE 响应，逐 chunk 写入 encoder.encode(`data: {...}\n\n`)
10. 流结束（finally 块）→ 异步写入 assistant Message 到 DB
```

### 错误响应汇总

| 状态码 | 触发条件 | 响应体 |
|--------|---------|--------|
| `400` | message 为空或缺失 | `{ "error": "message is required" }` |
| `401` | token 无效/禁用/过期 | `{ "error": "unauthorized" }` |
| `404` | sessionId 不存在 | `{ "error": "session not found" }` |
| `503` | LLM Provider 未配置（AI_PROVIDER 为空） | `{ "error": "AI provider not configured" }` |

### 客户端使用示例

**第一次对话（新建 session）**:
```typescript
const token = new URLSearchParams(window.location.search).get('token');
const res = await fetch(`/api/chat?token=${token}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: '你好' }),
});

const sessionId = res.headers.get('X-Session-Id'); // 存储供后续使用

const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const parts = buffer.split('\n\n');
  buffer = parts.pop() ?? '';
  for (const part of parts) {
    if (!part.startsWith('data: ')) continue;
    const payload = part.slice(6).trim();
    if (payload === '[DONE]') return;
    const { text, error } = JSON.parse(payload);
    if (text) appendToMessage(text);
  }
}
```

**后续对话（复用 session）**:
```typescript
body: JSON.stringify({ sessionId, message: '继续上面的话题' })
```
