# Research: 项目脚手架搭建

**Feature**: 001-project-scaffold
**Date**: 2025-01-30

## 决策记录

### 1. Next.js App Router vs Pages Router

- **Decision**: App Router（Next.js 14 默认）
- **Rationale**: App Router 支持 React Server Components、内置 layout 嵌套、更好的 streaming 支持（后续 SSE 对话流需要）；Pages Router 已进入维护模式
- **Alternatives considered**: Pages Router — 不选，因为缺乏 RSC 和原生 streaming 支持

### 2. ORM 选择

- **Decision**: Prisma ORM
- **Rationale**: 类型安全的查询构建器，schema 即文档，migration 工具完善，与 TypeScript 生态集成最佳；CLAUDE.md 已明确要求
- **Alternatives considered**: Drizzle ORM（更轻量，但社区成熟度低）；TypeORM（装饰器风格，与 Next.js RSC 有兼容问题）

### 3. 密码哈希方案

- **Decision**: bcryptjs（纯 JS 实现，无原生依赖）
- **Rationale**: 在 Docker/Linux 环境下无需编译原生模块，部署更稳定；bcrypt 算法本身安全性充分验证
- **Alternatives considered**: argon2（更安全，但需要原生模块，Docker 构建复杂）；crypto.pbkdf2（内置，但 bcrypt 对暴力破解防御更强）

### 4. shadcn/ui 集成方式

- **Decision**: 使用 `npx shadcn@latest init` 初始化，按需添加组件
- **Rationale**: shadcn/ui 将组件源码直接复制到项目，完全可自定义；不引入第三方组件运行时依赖
- **Alternatives considered**: 完整安装所有组件 — 不选，避免引入未使用代码

### 5. Docker Compose 开发与生产配置

- **Decision**: 单一 `docker-compose.yml`，Dockerfile 使用多阶段构建
- **Rationale**: 项目初期内网部署，简化配置；多阶段构建在同一 Dockerfile 中区分开发依赖和生产产物
- **Alternatives considered**: `docker-compose.override.yml` 分离开发/生产 — 后期迁移公有云时可升级，当前阶段过度复杂

### 6. Session 认证方案

- **Decision**: NextAuth.js v4（Credentials Provider）
- **Rationale**: 与 Next.js 深度集成，内置 session 管理；Credentials Provider 支持自定义用户名密码验证，适合内部系统
- **Alternatives considered**: 自实现 JWT session — 增加安全风险，不选；NextAuth v5（beta）— 尚不稳定，不选

### 7. TypeScript 路径别名

- **Decision**: 配置 `@/*` 指向项目根目录（Next.js 默认约定）
- **Rationale**: 避免相对路径地狱（`../../../lib/ai`），与 shadcn/ui 默认配置兼容
- **Alternatives considered**: 无

### 8. 健康检查端点响应格式

- **Decision**: JSON 格式，包含 `status`、`database`、`timestamp` 字段
- **Rationale**: 便于 Docker healthcheck 和运维监控脚本解析
- **Alternatives considered**: 纯文本 `OK` — 不足以表达数据库状态

## 无 NEEDS CLARIFICATION 项

所有技术决策均已基于 CLAUDE.md 中的技术栈要求和 PLAN.md 中的 Feature 说明确定，无需外部澄清。
