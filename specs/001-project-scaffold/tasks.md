# Tasks: 项目脚手架搭建

**Feature**: 001-project-scaffold
**Branch**: `001-project-scaffold`
**Input**: Design documents from `/specs/001-project-scaffold/`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖冲突）
- **[Story]**: 对应用户故事（US1/US2/US3）

---

## Phase 1: Setup（项目初始化）

**目标**: 初始化 Next.js 项目基础结构，安装核心依赖

- [x] T001 初始化 Next.js 14 App Router + TypeScript 项目（若根目录已有 package.json 则跳过，仅补全缺失配置）
- [x] T002 安装核心依赖：prisma、@prisma/client、jose、bcryptjs、@types/bcryptjs
- [x] T003 [P] 安装 UI 依赖：tailwindcss、postcss、autoprefixer，执行 `npx tailwindcss init -p`
- [x] T004 [P] 初始化 shadcn/ui：执行 `npx shadcn@latest init`，配置 `components.json`
- [x] T005 配置 `tsconfig.json` 路径别名：`@/*` 指向项目根目录
- [x] T006 [P] 配置 ESLint（`.eslintrc.json`）和 Prettier（`.prettierrc`）

---

## Phase 2: Foundational（基础设施，阻塞后续所有故事）

**目标**: 建立数据库 schema、Provider 接口骨架、环境变量模板，为所有 Feature 奠基

- [x] T007 创建完整目录结构：`app/(chat)/`、`app/admin/`、`app/api/chat/`、`app/api/speech/`、`app/api/avatar/`、`app/api/admin/`、`app/api/health/`、`components/chat/`、`components/video/`、`components/avatar/`、`components/admin/`、`lib/ai/`、`lib/speech/`、`lib/avatar/`、`lib/mcp/`、`prisma/`
- [x] T008 创建 `prisma/schema.prisma`：包含 AdminUser、Config、AccessToken、ChatSession、Message 五张表及 MessageRole 枚举（参照 data-model.md）
- [x] T009 创建 `.env.example`：包含 DATABASE_URL、NEXTAUTH_SECRET、NEXTAUTH_URL、ANTHROPIC_API_KEY、OPENAI_API_KEY、AZURE_SPEECH_KEY、AZURE_SPEECH_REGION、MYSQL_ROOT_PASSWORD、MYSQL_DATABASE、MYSQL_USER、MYSQL_PASSWORD、ADMIN_USERNAME、ADMIN_PASSWORD，所有值为占位示例
- [x] T010 [P] 创建 `lib/ai/types.ts`：定义 LLMProvider 接口、ChatMessage 类型
- [x] T011 [P] 创建 `lib/speech/types.ts`：定义 SpeechProvider 接口
- [x] T012 [P] 创建 `lib/avatar/types.ts`：定义 AvatarProvider 接口（标注预留）
- [x] T013 [P] 创建 `lib/ai/factory.ts`：LLMFactory 骨架（`create()` 返回 LLMProvider，暂返回 null 占位）
- [x] T014 [P] 创建 `lib/speech/factory.ts`：SpeechFactory 骨架
- [x] T015 [P] 创建 `lib/avatar/factory.ts`：AvatarFactory 骨架
- [x] T016 [P] 创建 `lib/mcp/index.ts`：MCPClient 占位文件（空导出，标注后期实现）
- [x] T017 创建 `lib/db.ts`：Prisma Client 单例（避免开发模式热更新时多实例）

---

## Phase 3: US1 — 开发者克隆并启动项目（P1）

**故事目标**: 开发者按 README 步骤，5 分钟内启动开发服务并访问首页

**独立验收**: 全新机器克隆仓库，按 README 步骤执行，服务成功启动，`/api/health` 返回 `{"status":"ok"}`

- [x] T018 [US1] 创建 `prisma/seed.ts`：读取 ADMIN_USERNAME/ADMIN_PASSWORD 环境变量，幂等创建 AdminUser（bcryptjs 哈希密码），AdminUser 表非空则跳过
- [x] T019 [US1] 在 `package.json` 中配置 prisma seed 命令：`"prisma": { "seed": "tsx prisma/seed.ts" }`
- [x] T020 [US1] 创建 `app/api/health/route.ts`：GET 端点，查询 Prisma `$queryRaw` 验证数据库连通，返回 `{status, database, timestamp}`，数据库异常时返回 degraded
- [x] T021 [US1] 创建 `app/page.tsx`：占位首页，显示"SenseWorld AI 多模态对话平台"及平台说明
- [ ] T022 [US1] 创建 `app/(chat)/layout.tsx`：对话页面根布局
- [x] T023 [US1] 更新 `app/layout.tsx`：配置全局字体、Tailwind 基础样式、metadata
- [x] T024 [US1] 创建 `README.md`：包含项目简介、前置依赖（Node.js 20+、Docker）、本地开发启动步骤（含 seed）、Docker Compose 部署步骤、目录结构说明、Provider 扩展指引

---

## Phase 4: US2 — 运维 Docker Compose 部署（P2）

**故事目标**: `docker compose up` 全部容器 2 分钟内健康运行

**独立验收**: 全新 Linux 服务器执行 `docker compose up -d`，Web 和 MySQL 容器均 healthy

- [x] T025 [US2] 创建 `Dockerfile`：多阶段构建（deps → builder → runner），生产镜像基于 `node:20-alpine`
- [x] T026 [US2] 创建 `docker-compose.yml`：包含 app 服务（依赖 mysql）和 mysql 服务（mysql:8.0，数据卷持久化），配置 healthcheck
- [x] T027 [US2] 创建 `docker-entrypoint.sh`：容器启动时执行 `prisma migrate deploy` 和 `prisma db seed`，再启动 Next.js
- [x] T028 [US2] 创建 `.dockerignore`：排除 node_modules、.next、.env、.git 等
- [x] T029 [US2] 在 `docker-compose.yml` 中配置 app 服务 healthcheck：curl `/api/health`

---

## Phase 5: US3 — 开发者理解架构与扩展点（P3）

**故事目标**: 新开发者仅读 README 和代码即可完成 Provider 扩展

**独立验收**: 参照 `lib/ai/factory.ts` 注释和接口定义，能够新建一个实现 LLMProvider 的文件

- [x] T030 [P] [US3] 在 `lib/ai/types.ts` 每个接口方法上添加 JSDoc 注释，说明参数、返回值和扩展方式
- [x] T031 [P] [US3] 在 `lib/speech/types.ts` 添加 JSDoc 注释
- [x] T032 [P] [US3] 在 `lib/avatar/types.ts` 添加 JSDoc 注释（含预留说明）
- [x] T033 [US3] 在 `lib/ai/factory.ts` 中添加注释块，说明注册新 Provider 的步骤（3 步）
- [x] T034 [US3] 更新 `README.md` 扩展新 Provider 章节：补充完整示例代码片段（参照 quickstart.md）

---

## Phase 6: Polish（收尾与横切关注点）

- [x] T035 创建 `app/not-found.tsx`：友好 404 页面
- [x] T036 创建 `app/admin/page.tsx`：后台管理占位页（显示"SenseWorld 管理后台"，提示后续功能开发中）
- [x] T037 创建 `app/admin/layout.tsx`：后台布局骨架
- [x] T038 在 `package.json` scripts 中确认：`dev`、`build`、`start`、`lint`、`db:migrate`（`prisma migrate dev`）、`db:seed`（`prisma db seed`）
- [x] T039 确认 `.env.example` 包含 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 占位值
- [x] T040 验收检查：启动开发服务，访问 `/`、`/admin`、`/api/health`、不存在路由各返回正确响应

---

## 依赖关系图

```
Phase 1 (Setup)
    |
Phase 2 (Foundational)  <-- 所有 Phase 3/4/5 必须等待此阶段完成
    |
    +---> Phase 3 (US1) ---> Phase 4 (US2)
    |                              |
    +---> Phase 5 (US3) <----------+（可并行）
    |
Phase 6 (Polish)
```

**关键路径**: Phase 1 -> Phase 2 -> Phase 3 (US1) -> Phase 6

---

## 并行执行示例

### Phase 2 内部可并行

- 开发者 A: T008（Prisma schema）+ T017（db.ts）
- 开发者 B: T010 + T011 + T012（三个 Provider types）
- 开发者 C: T013 + T014 + T015（三个 Factory 骨架）

### Phase 3+4+5 完成 Phase 2 后可并行

- 开发者 A: Phase 3 (US1)
- 开发者 B: Phase 4 (US2) — 等待 T017 完成
- 开发者 C: Phase 5 (US3) T030-T032

---

## 实现策略

### MVP 范围（仅 US1）

完成 Phase 1 + Phase 2 + Phase 3 即为最小可验证产物：
- 开发服务可启动
- 数据库连接正常
- `/api/health` 返回 ok
- 首页可访问

### 增量交付

1. Phase 1 + 2 -> 基础设施就绪
2. Phase 3 (US1) -> MVP，开发环境可用
3. Phase 4 (US2) -> Docker 部署就绪
4. Phase 5 (US3) -> 文档与架构完善
5. Phase 6 -> 收尾

---

## 统计

| 阶段 | 任务数 | 可并行任务 |
|------|--------|----------|
| Phase 1 Setup | 6 | T003、T004、T006 |
| Phase 2 Foundational | 11 | T010-T016 |
| Phase 3 US1 (P1) | 7 | - |
| Phase 4 US2 (P2) | 5 | - |
| Phase 5 US3 (P3) | 5 | T030-T032 |
| Phase 6 Polish | 6 | - |
| **合计** | **40** | **10** |
