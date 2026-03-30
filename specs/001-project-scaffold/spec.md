# Feature Specification: 项目脚手架搭建

**Feature Branch**: `001-project-scaffold`
**Created**: 2025-01-30
**Status**: Draft
**Input**: User description: "根据项目根目录PLAN.md的001-project-scaffold为基础"

## 概述

为 SenseWorld AI 多模态对话平台搭建完整的项目基础结构，使开发团队能够在统一、可运行的代码基础上开始各功能模块的开发。脚手架需包含：Next.js 14 App Router + TypeScript 初始化、UI 组件库配置（含设计系统）、MySQL 数据库与 ORM 配置（含四张核心表的初始 schema）、容器化部署配置，以及 LLM / Speech / Avatar 三个 Provider 接口的骨架定义。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 开发者克隆并启动项目 (Priority: P1)

开发者拉取代码仓库后，能够按照 README 文档在 5 分钟内完成本地环境配置并成功启动开发服务，看到项目首页（哪怕是占位页面）。

**Why this priority**: 这是一切后续开发的前提。若开发者无法快速启动项目，所有功能开发都将受阻。

**Independent Test**: 全新机器克隆仓库，按 README 步骤执行，服务成功启动并访问首页。

**Acceptance Scenarios**:

1. **Given** 开发者已安装 Node.js 和 Docker，**When** 按 README 步骤执行安装与启动命令，**Then** 开发服务在 3 分钟内启动成功，浏览器可访问首页
2. **Given** 项目启动成功，**When** 访问数据库连接状态，**Then** 数据库连接正常，Prisma schema 已同步
3. **Given** 开发服务运行中，**When** 修改任意源码文件，**Then** 页面自动热更新，无需手动重启

---

### User Story 2 - 运维通过 Docker Compose 部署项目 (Priority: P2)

运维人员使用 Docker Compose 一键启动完整服务栈（Web 应用 + 数据库），无需手动安装运行时环境。

**Why this priority**: 项目最终部署依赖容器化方案，脚手架阶段就需验证容器化可行性。

**Independent Test**: 在全新 Linux 服务器上执行 `docker compose up`，服务完整启动。

**Acceptance Scenarios**:

1. **Given** 服务器已安装 Docker 和 Docker Compose，**When** 执行启动命令，**Then** Web 应用与数据库容器均正常运行，Web 可访问
2. **Given** 容器服务运行中，**When** 数据库容器重启，**Then** 数据持久化不丢失，Web 应用自动重连数据库
3. **Given** 环境变量文件（.env）已配置，**When** 启动容器服务，**Then** 应用正确读取环境变量，不暴露敏感配置

---

### User Story 3 - 开发者了解项目架构与扩展点 (Priority: P3)

新加入的开发者阅读项目文档和代码结构，能够理解各 Provider 接口的扩展方式，并知道新功能应放在哪个目录。

**Why this priority**: 项目架构清晰度决定后续开发效率，接口骨架需在脚手架阶段定义完整。

**Independent Test**: 新开发者无需口头指导，仅通过阅读 README 和代码即可理解扩展方式。

**Acceptance Scenarios**:

1. **Given** 新开发者查看项目代码，**When** 阅读 LLMProvider 接口定义，**Then** 能够理解新增 AI 服务商只需实现该接口
2. **Given** 新开发者查看目录结构，**When** 对比 README 中的目录说明，**Then** 每个目录的职责清晰，与文档描述一致
3. **Given** 新开发者查看 SpeechProvider 接口，**When** 对比已有实现示例，**Then** 能够仿照实现一个新的语音服务商适配器

---

## Functional Requirements *(mandatory)*

### FR-001：项目目录结构初始化

系统必须包含完整的标准目录结构，各目录具有明确职责划分：
- `app/` 下含对话页面入口、后台管理页面、API 路由（chat、speech、avatar、admin 子路由）
- `components/` 下含 chat、video、avatar、admin 子目录
- `lib/` 下含 ai、speech、avatar、mcp 子目录
- `prisma/` 数据库 schema 目录
- 根目录含容器化配置文件
- UI 组件库初始化配置文件（含设计令牌与主题配置）

### FR-002：开发环境配置文件

系统必须提供完整的开发环境配置：
- 环境变量模板文件（`.env.example`），列出所有必要的配置项及说明注释
- TypeScript 编译配置，覆盖路径别名设置
- 代码格式化与检查规则配置
- 包依赖清单，含所有核心依赖的版本锁定

### FR-003：数据库 Schema 骨架定义

系统必须包含初始数据库 schema，定义五张核心表的字段结构：

**AdminUser 管理员表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | 自增整数 | 主键 |
| username | 字符串，唯一 | 登录用户名 |
| passwordHash | 字符串 | 哈希后的密码 |
| createdAt | 时间戳 | 创建时间 |
| updatedAt | 时间戳 | 更新时间 |

**Config 系统配置表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | 自增整数 | 主键 |
| key | 字符串，唯一 | 配置键名（如 `llm_provider`、`system_prompt`） |
| value | 长文本 | 配置值（明文或加密存储） |
| description | 字符串，可空 | 配置说明 |
| updatedAt | 时间戳 | 最后更新时间 |

**AccessToken 访客入口表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | 自增整数 | 主键 |
| token | 字符串，唯一 | 随机访问令牌 |
| label | 字符串，可空 | 运营备注名称 |
| expiresAt | 时间戳，可空 | 到期时间，为空表示永久有效 |
| enabled | 布尔 | 是否启用，默认 true |
| createdAt | 时间戳 | 创建时间 |

**ChatSession 对话会话表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | 字符串（UUID） | 主键 |
| accessToken | 字符串 | 关联的访客令牌 |
| createdAt | 时间戳 | 会话创建时间 |
| updatedAt | 时间戳 | 最后活跃时间 |

**Message 消息表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | 自增整数 | 主键 |
| sessionId | 字符串 | 关联会话 ID（外键） |
| role | 枚举（user/assistant） | 消息来源角色 |
| content | 长文本 | 消息文本内容 |
| hasImage | 布尔 | 是否携带图像（Vision 输入） |
| createdAt | 时间戳 | 消息创建时间 |

### FR-004：Provider 接口骨架定义

系统必须定义三个核心 Provider 接口（仅类型定义，不需要完整实现），包含以下方法签名：

**LLMProvider**
```typescript
interface LLMProvider {
  readonly supportsVision: boolean
  readonly supportsNativeAudio: boolean

  // 非流式对话：返回完整回复文本
  chat(messages: ChatMessage[]): Promise<string>

  // 流式对话：通过 AsyncIterable 逐块返回文本
  chatStream(messages: ChatMessage[]): AsyncIterable<string>
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  imageBase64?: string  // Vision 输入，可选
}
```

**SpeechProvider**
```typescript
interface SpeechProvider {
  // 语音转文字：接收音频 Buffer，返回转写文本
  transcribe(audioBuffer: Buffer, mimeType: string): Promise<string>

  // 文字转语音：返回音频 Buffer 及对应 MIME 类型
  synthesize(text: string): Promise<{ audio: Buffer; mimeType: string }>
}
```

**AvatarProvider**（预留，后期实现）
```typescript
interface AvatarProvider {
  // 生成数字人视频：输入文本与可选音频 URL，返回视频 URL
  generateVideo(text: string, audioUrl?: string): Promise<string>

  // 查询生成状态
  getStatus(jobId: string): Promise<'pending' | 'processing' | 'done' | 'failed'>
}
```

每个接口文件需附带注释，说明新增服务商只需实现对应接口即可接入。

### FR-005：容器化配置

系统必须包含可运行的 Docker Compose 配置：
- Web 应用容器（含 Dockerfile，支持生产构建）
- MySQL 数据库容器（含数据卷持久化挂载）
- 容器间内部网络连通
- 通过 `.env` 文件注入环境变量

### FR-006：项目 README 文档

系统必须包含 README 文档，覆盖：
- 项目简介与核心功能概述
- 前置依赖清单（Node.js 版本、Docker 版本等）
- 本地开发启动步骤（目标：5 分钟内完成）
- Docker Compose 一键部署步骤
- 目录结构说明表
- 扩展新 Provider 的简要指引

### FR-007：基础页面占位

系统必须包含可访问的基础页面，验证路由与渲染正常：
- 对话页面（`/`）：显示平台名称占位内容
- 后台管理页面（`/admin`）：显示管理后台占位内容
- 404 页面：访问不存在路由时显示友好提示

### FR-008：健康检查接口

系统必须提供一个 API 健康检查端点，返回服务运行状态与数据库连通性，用于容器编排和运维监控。

### FR-009：环境变量清单

系统必须提供 `.env.example` 模板文件，列出以下所有必要配置项（含说明注释）：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `DATABASE_URL` | MySQL 连接字符串 | `mysql://user:pass@localhost:3306/senseworld` |
| `NEXTAUTH_SECRET` | Session 加密密钥 | 随机字符串，32 位以上 |
| `NEXTAUTH_URL` | 应用访问地址 | `http://localhost:3000` |
| `ANTHROPIC_API_KEY` | Claude API 密钥（可选，运营配置优先） | `sk-ant-...` |
| `OPENAI_API_KEY` | OpenAI API 密钥（可选，运营配置优先） | `sk-...` |
| `AZURE_SPEECH_KEY` | Azure 语音服务密钥（可选） | `xxxxxxxx` |
| `AZURE_SPEECH_REGION` | Azure 语音服务区域（可选） | `eastasia` |
| `MYSQL_ROOT_PASSWORD` | Docker Compose 数据库 root 密码 | `rootpassword` |
| `MYSQL_DATABASE` | Docker Compose 数据库名 | `senseworld` |
| `MYSQL_USER` | Docker Compose 数据库用户名 | `senseworld` |
| `MYSQL_PASSWORD` | Docker Compose 数据库用户密码 | `password` |

`.env.example` 中所有值均为示例占位，不包含真实密钥。

### FR-010：管理员初始化

系统必须提供数据库 seed 脚本，用于首次启动时创建初始管理员账号：
- seed 脚本读取环境变量 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 作为初始凭据
- 若 AdminUser 表已有记录，则跳过，避免重复创建
- 密码以不可逆哈希形式存储，明文不落库
- README 文档中说明执行 seed 的步骤（本地开发和 Docker 环境各一条命令）

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 开发者按照 README 步骤，从零到开发服务成功启动，全程不超过 5 分钟
- **SC-002**: 执行 `docker compose up` 后，全部容器在 2 分钟内达到健康运行状态
- **SC-003**: 健康检查接口在服务正常时，响应时间不超过 500 毫秒
- **SC-004**: 新开发者无需额外口头指导，仅通过 README 与代码即可独立完成第一个 Provider 扩展的代码框架

---

## Assumptions

- 开发者本地环境已安装 Node.js 20+ 和 Docker Desktop
- 数据库初始化（schema 同步）与 seed 脚本执行作为启动步骤的一部分，在文档中说明
- 初始管理员账号通过环境变量 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 在 seed 阶段创建，后台暂不提供修改密码界面（后续 Feature 补充）
- 本脚手架阶段不实现任何 AI / 语音 / 数字人功能，仅定义接口骨架
- 生产环境 API Key 不提交至代码仓库，通过环境变量注入
- 小程序/H5 多入口为后期功能，本阶段仅预留目录结构，不做实现
- MCP 客户端为预留功能，本阶段仅创建空目录和接口占位
- 初始 commit 基于项目已有文件，脚手架完成后在此基础上完善
