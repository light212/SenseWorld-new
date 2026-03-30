# Data Model: Admin Backend (002-admin-backend)

## 复用现有表（无需迁移）

所有数据模型均已在 001-project-scaffold 的 `prisma/schema.prisma` 中定义，本 Feature 直接复用，无需新增或修改表结构。

---

## AdminUser

管理员账号表。

```prisma
model AdminUser {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**字段说明**:
- `username`: 管理员登录账号，唯一约束
- `passwordHash`: bcrypt 哈希密码，明文不存储
- 初始账号通过 `prisma/seed.ts` 从环境变量 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 创建

**状态转换**: 无（无账号状态机，仅通过 seed 创建）

---

## Config

运营配置 Key-Value 表。

```prisma
model Config {
  id          Int      @id @default(autoincrement())
  key         String   @unique
  value       String   @db.Text
  description String?
  updatedAt   DateTime @updatedAt
}
```

**字段说明**:
- `key`: 配置键名，全大写下划线格式，唯一约束
- `value`: 配置值，Text 类型支持 System Prompt 等长文本
- `description`: 可选说明，用于管理员界面展示
- `updatedAt`: 自动更新，可用于审计最后修改时间

**配置键名约定**:

| key | 说明 |
|-----|------|
| `AI_PROVIDER` | AI 服务商标识（如 `openai`, `anthropic`） |
| `AI_API_KEY` | AI 服务 API Key（敏感，脱敏展示） |
| `AI_MODEL` | AI 模型名称（如 `gpt-4o`） |
| `SPEECH_PROVIDER` | 语音服务商标识 |
| `SPEECH_API_KEY` | 语音服务 API Key（敏感，脱敏展示） |
| `AVATAR_PROVIDER` | Avatar 服务商标识（预留） |
| `AVATAR_API_KEY` | Avatar API Key（预留，脱敏展示） |
| `SYSTEM_PROMPT` | AI 系统提示词（长文本） |

**读取优先级**: 数据库 Config 表 > `process.env` 同名环境变量

**验证规则**:
- `key` 不可为空，不可包含空格
- `value` 允许为空字符串（表示未配置）

---

## AccessToken

访客入口链接表。

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

**字段说明**:
- `token`: UUID v4，访客访问链接的唯一标识
- `label`: 可选备注名称（如「展会入口」「测试链接」）
- `expiresAt`: 到期时间，`null` 表示永久有效
- `enabled`: 手动启用/禁用开关

**状态矩阵**:

| enabled | expiresAt | 访客访问结果 |
|---------|-----------|-------------|
| true | null | 允许 |
| true | 未来时间 | 允许 |
| true | 过去时间 | 拒绝（已过期） |
| false | 任意 | 拒绝（已禁用） |

**验证规则**:
- `token` 由服务端生成（`crypto.randomUUID()`），不接受客户端传入
- `expiresAt` 若提供必须是未来时间

---

## 无需新增表或字段

本 Feature 所有功能均基于 001 已定义的表结构，无 Prisma migration 需求。
