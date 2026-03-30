# Quickstart: AI Chat Core (003-ai-chat-core)

## 前提条件

- 001-project-scaffold 已完成（Prisma schema 含 ChatSession、Message、AccessToken、Config）
- 002-admin-backend 已完成（后台已配置 AI_PROVIDER、AI_API_KEY、AI_MODEL、SYSTEM_PROMPT）
- `.env` 文件已配置数据库连接

## 安装新依赖

```bash
pnpm add @anthropic-ai/sdk openai
```

## 验证功能可用（curl 测试）

### 1. 获取一个有效 AccessToken

从 admin 后台（/admin/tokens）生成一个 token，或直接查询数据库：

```bash
# 查看已有 token
npx prisma studio
# 或直接查询
mysql -u senseworld -p senseworld -e "SELECT token FROM AccessToken WHERE enabled=1 LIMIT 1;"
```

### 2. 新建 session，发送第一条消息

```bash
curl -N -X POST 'http://localhost:3000/api/chat?token=<your-token>' \
  -H 'Content-Type: application/json' \
  -d '{"message": "你好"}' \
  -D - 2>/dev/null | head -50
```

**期望输出**（前几行为响应头，之后为 SSE 事件）：
```
HTTP/1.1 200 OK
Content-Type: text/event-stream
X-Session-Id: 550e8400-e29b-41d4-a716-446655440000

data: {"text":"你"}

data: {"text":"好"}

...

data: [DONE]

```

从 `X-Session-Id` 响应头记录 sessionId。

### 3. 复用 session，发送后续消息

```bash
curl -N -X POST 'http://localhost:3000/api/chat?token=<your-token>' \
  -H 'Content-Type: application/json' \
  -d '{"sessionId": "<session-id-from-step-2>", "message": "我刚才说了什么？"}'
```

AI 应能回忆上一轮对话内容，证明历史管理正常。

### 4. 验证无效 token 被拒绝

```bash
curl -X POST 'http://localhost:3000/api/chat?token=invalid-token' \
  -H 'Content-Type: application/json' \
  -d '{"message": "hello"}'
# 期望: 401 {"error":"unauthorized"}
```

### 5. 切换 AI Provider（通过 admin 后台配置后验证）

在 `/admin/config` 将 `AI_PROVIDER` 从 `openai` 改为 `anthropic`，重新执行步骤 2，验证新 provider 被使用（观察响应速度或 token 计数差异）。

## 项目文件结构（本 Feature 新增）

```text
lib/
  llm/
    types.ts              # LLMProvider 接口 + LLMMessage 类型
    factory.ts            # LLMFactory.create() — 按配置选择 Provider
    openai-provider.ts    # OpenAI Provider 实现
    anthropic-provider.ts # Anthropic Provider 实现
app/
  api/
    chat/
      route.ts            # POST /api/chat SSE 路由
```

## 本地开发调试提示

- SSE 流在浏览器 DevTools Network 标签页可实时查看每个 chunk
- 如 AI 无响应，检查 `Config` 表中 `AI_PROVIDER` 和 `AI_API_KEY` 是否正确写入
- `export const dynamic = 'force-dynamic'` 是 route.ts 中的必要配置，否则 Next.js 会尝试静态化此路由导致报错
- 流式响应期间 DB 写入在 `finally` 块异步执行，若服务重启可能丢失最后一条 assistant 消息，这是已知的可接受权衡
