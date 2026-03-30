# Data Model: 项目脚手架搭建

**Feature**: 001-project-scaffold
**Date**: 2025-01-30

## 实体关系概述

```
AdminUser          （独立，无外键关联）
Config             （独立，键值对配置）
AccessToken        （独立，访客入口令牌）
ChatSession        ──── belongs to ────> AccessToken (token 字段)
Message            ──── belongs to ────> ChatSession (id 字段)
```

## 实体定义

### AdminUser 管理员表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Int | 主键，自增 | 管理员 ID |
| username | String | 唯一，非空 | 登录用户名 |
| passwordHash | String | 非空 | bcrypt 哈希后的密码 |
| createdAt | DateTime | 默认 now() | 创建时间 |
| updatedAt | DateTime | 自动更新 | 最后更新时间 |

**业务规则**：
- 初始 seed 阶段创建唯一管理员账号，幂等（表非空则跳过）
- 密码明文不落库，任何情况下只存储 bcrypt hash

---

### Config 系统配置表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Int | 主键，自增 | 配置项 ID |
| key | String | 唯一，非空 | 配置键名 |
| value | String（长文本） | 非空 | 配置值 |
| description | String? | 可空 | 配置说明（给运营看） |
| updatedAt | DateTime | 自动更新 | 最后更新时间 |

**预定义键名**（002-admin-backend 阶段写入）：

| key | 说明 |
|-----|------|
| `llm_provider` | 当前使用的 LLM 服务商名称 |
| `llm_api_key` | LLM API Key |
| `llm_model` | 模型名称 |
| `speech_provider` | 语音服务商名称 |
| `speech_api_key` | 语音 API Key |
| `speech_region` | Azure 区域（若适用） |
| `avatar_provider` | 数字人服务商（预留） |
| `avatar_api_key` | 数字人 API Key（预留） |
| `system_prompt` | AI 角色/人设 System Prompt |
| `mcp_server_url` | MCP Server 地址（预留） |

---

### AccessToken 访客入口表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Int | 主键，自增 | 记录 ID |
| token | String | 唯一，非空 | 随机生成的访问令牌（URL 参数） |
| label | String? | 可空 | 运营备注名称（如"展会入口"） |
| expiresAt | DateTime? | 可空 | 到期时间，为空表示永久有效 |
| enabled | Boolean | 默认 true | 是否启用 |
| createdAt | DateTime | 默认 now() | 创建时间 |

**业务规则**：
- 用户访问 `/?token=xxx` 时验证 token 有效性（enabled=true 且未过期）
- token 由后台生成，格式：32 位随机字母数字字符串

---

### ChatSession 对话会话表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String（UUID） | 主键 | 会话唯一标识 |
| accessToken | String | 非空，索引 | 关联的访客令牌值 |
| createdAt | DateTime | 默认 now() | 会话创建时间 |
| updatedAt | DateTime | 自动更新 | 最后活跃时间 |

**业务规则**：
- 每次用户访问对话页面时创建新 ChatSession
- id 使用 UUID v4，避免可枚举
- accessToken 字段存储令牌字符串值（非外键，因访客可能匿名使用）

---

### Message 消息表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Int | 主键，自增 | 消息 ID |
| sessionId | String | 非空，外键 -> ChatSession.id | 关联会话 |
| role | Enum | 非空 | 消息角色：user / assistant |
| content | String（长文本） | 非空 | 消息文本内容 |
| hasImage | Boolean | 默认 false | 是否携带图像（Vision 输入） |
| createdAt | DateTime | 默认 now() | 消息创建时间 |

**业务规则**：
- role 枚举值：`user`（用户消息）、`assistant`（AI 回复）
- hasImage=true 时，图像数据不落库（仅在请求时传递给 Vision API，控制存储成本）
- 级联删除：ChatSession 删除时，关联 Message 同步删除

---

## Prisma Schema 示意

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model AdminUser {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Config {
  id          Int      @id @default(autoincrement())
  key         String   @unique
  value       String   @db.Text
  description String?
  updatedAt   DateTime @updatedAt
}

model AccessToken {
  id        Int       @id @default(autoincrement())
  token     String    @unique
  label     String?
  expiresAt DateTime?
  enabled   Boolean   @default(true)
  createdAt DateTime  @default(now())
}

model ChatSession {
  id          String    @id @default(uuid())
  accessToken String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  messages    Message[]

  @@index([accessToken])
}

model Message {
  id        Int         @id @default(autoincrement())
  sessionId String
  role      MessageRole
  content   String      @db.Text
  imageUrl  String?     @db.Text
  createdAt DateTime    @default(now())
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}

enum MessageRole {
  user
  assistant
}
```

## 迁移策略

- 本 Feature 使用 `prisma migrate dev --name init` 创建初始迁移
- 迁移文件提交至版本库（`prisma/migrations/`）
- 后续 Feature 新增字段通过新迁移文件追加，不修改初始迁移