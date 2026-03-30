# Implementation Plan: Admin Backend

**Branch**: `002-admin-backend` | **Date**: 2025-01-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-admin-backend/spec.md`

## Summary

实现 SenseWorld 后台管理模块。技术方案：使用 `jose` 库实现 JWT 认证（HttpOnly Cookie），Next.js Edge Middleware 保护 `/admin/*` 路由；运营配置基于已有 `Config` 表实现 key-value 读写，数据库优先于环境变量，实时生效无缓存；访客入口管理基于已有 `AccessToken` 表实现链接生成与启用/禁用；前端使用 `qrcode.react` 渲染二维码。所有数据模型复用 001 已定义表结构，无需数据库迁移。

## Technical Context

**Language/Version**: TypeScript 5.x，Node.js 20 LTS
**Primary Dependencies**: Next.js 14, jose 6.x, bcryptjs, Prisma ORM 5.x, qrcode.react（新增）
**Storage**: MySQL 8.0，复用 AdminUser / Config / AccessToken 三张已有表
**Testing**: 手动验证（curl + 浏览器），与 001 保持一致
**Target Platform**: Linux 服务器（Docker Compose）；本地开发支持 macOS
**Project Type**: Web 应用（全栈，Next.js App Router monorepo）
**Performance Goals**: 配置读写响应 < 500ms；中间件鉴权开销 < 10ms
**Constraints**: 无第三方 OAuth；不引入 next-auth 的 Session 机制；无内存配置缓存
**Scale/Scope**: 单节点，管理员 1-3 人，访客链接数量 < 1000

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 检查项 | 状态 |
|------|--------|------|
| I. Provider-Plugin 架构 | 本 Feature 不涉及 LLM/Speech/Avatar 实例化，合规 | PASS |
| II. 运营可配置运行时 | Config 表读写实现运营配置，数据库优先于环境变量，实时生效 | PASS |
| III. 禁止 Emoji | 所有代码、注释、文档、UI 文案不含 emoji | PASS |
| IV. Spec 驱动开发 | spec.md 已完整审批，plan 在实现前完成 | PASS |
| V. 安全优先密钥管理 | JWT 密钥来自环境变量；API Key 脱敏展示；密码 bcrypt 哈希存储 | PASS |

**Constitution Check Result**: 全部通过，无违规项。

## Project Structure

### Documentation (this feature)

```text
specs/002-admin-backend/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出
├── quickstart.md        # Phase 1 输出
├── contracts/
│   └── admin-api.md     # Phase 1 输出
└── tasks.md             # /speckit.tasks 输出
```

### Implementation Structure

```text
/
├── app/
│   ├── admin/
│   │   ├── layout.tsx               # Admin 布局（检查登录态）
│   │   ├── page.tsx                 # 后台首页（重定向到 /admin/config）
│   │   ├── login/
│   │   │   └── page.tsx             # 登录页（Client Component）
│   │   ├── config/
│   │   │   └── page.tsx             # 运营配置面板
│   │   └── access-tokens/
│   │       └── page.tsx             # 访客入口管理
│   └── api/
│       └── admin/
│           ├── auth/
│           │   ├── login/route.ts   # POST 登录
│           │   └── logout/route.ts  # POST 退出
│           ├── config/route.ts      # GET/PUT 配置
│           └── access-tokens/
│               ├── route.ts         # GET/POST 访客链接
│               └── [id]/route.ts    # PATCH/DELETE 单条链接
├── lib/
│   ├── auth/
│   │   ├── jwt.ts                  # JWT 签发与验证（jose）
│   │   └── middleware.ts            # 中间件鉴权逻辑
│   └── config/
│       └── index.ts                # getConfig / setConfig / maskApiKey
├── components/
│   └── admin/
│       ├── ConfigForm.tsx           # 配置表单（Client Component）
│       ├── AccessTokenList.tsx      # 访客链接列表（Client Component）
│       └── QrCodeDisplay.tsx        # 二维码展示（Client Component）
└── middleware.ts                    # Next.js Edge Middleware（路由保护）
```

## Complexity Tracking

无 Constitution 违规项，无需说明。
