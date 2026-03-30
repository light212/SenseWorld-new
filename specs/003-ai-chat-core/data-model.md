# Data Model: AI Chat Core (003-ai-chat-core)

## 复用现有表（无 schema 迁移）

本 Feature 完全复用 001-project-scaffold 已定义的表结构，不新增任何表或字段。

---

## ChatSession 表

```prisma
model ChatSession {
  id          String    @id @default(uuid())
  accessToken String                          // 关联的访客 token（冗余存储，非外键）
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  messages    Message[]

  @@index([accessToken])
}
```

**用途**: 每次访客打开页面或显式新建对话时创建一条记录，id 作为后续消息的锚点。

**关键字段**:
- `id`: UUID，由数据库 `@default(uuid())` 生成，服务端创建后通过 `X-Session-Id` 响应头返回给客户端
- `accessToken`: 存储创建此 session 时使用的 token 字符串（非外键，允许 token 被删除后 session 记录仍可查询历史）

---

## Message 表

```prisma
model Message {
  id        Int         @id @default(autoincrement())
  sessionId String
  role      MessageRole  // 枚举：user | assistant
  content   String      @db.Text
  imageUrl  String?     @db.Text  // Feature 005 预留，本期始终为 null
  createdAt DateTime    @default(now())
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}

enum MessageRole {
  user
  assistant
}
```

**用途**: 存储对话历史，每轮对话写入两条记录（user + assistant）。

**写入时序**:
1. 收到 POST /api/chat 请求时，立即写入 `role=user` 消息
2. LLM 流结束后（ReadableStream finally 块），异步写入 `role=assistant` 消息（累积的完整文本）

---

## AccessToken 表（只读验证，不修改）

```prisma
model AccessToken {
  id        Int       @id @default(autoincrement())
  token     String    @unique
  label     String?
  expiresAt DateTime?
  enabled   Boolean   @default(true)
  createdAt DateTime  @default(now())
}
```

**用途**: 本 Feature 只做只读查询，验证 token 合法性。

**验证条件**:
```typescript
record.enabled === true
&& (record.expiresAt === null || record.expiresAt > new Date())
```

---

## Config 表（只读，通过 getConfig() 访问）

```prisma
model Config {
  id          Int      @id @default(autoincrement())
  key         String   @unique
  value       String   @db.Text
  description String?
  updatedAt   DateTime @updatedAt
}
```

**本 Feature 读取的 keys**:

| Key | 类型 | 示例值 | 说明 |
|-----|------|--------|------|
| `AI_PROVIDER` | string | `openai` / `anthropic` | 选择哪个 LLM Provider |
| `AI_API_KEY` | string | `sk-...` | 对应服务商的 API Key |
| `AI_MODEL` | string | `gpt-4o` | 具体模型名称 |
| `SYSTEM_PROMPT` | string | `You are a helpful assistant.` | 注入每次对话的系统提示词