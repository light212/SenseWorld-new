# Tasks: Admin Backend

**Input**: Design documents from `/specs/002-admin-backend/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/admin-api.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- No test tasks (not requested in spec)

---

## Phase 1: Setup

**Purpose**: 安装新依赖，建立共享类型和工具函数基础。

- [x] T001 Add `react-qr-code` dependency: run `npm install react-qr-code` and update package.json
- [x] T002 [P] Create shared admin API response type in `lib/types/admin.ts` (AdminApiResponse, ConfigItem, AccessTokenItem)
- [x] T003 [P] Create `lib/config/index.ts` with `getConfig(key)`, `setConfig(key, value)`, `maskApiKey(value)` functions using Prisma + process.env fallback; 内部维护内存 Map 缓存，首次读取时从数据库加载，`setConfig` 写库后同步更新缓存，单节点环境配置读取为内存操作

---

## Phase 2: Foundational

**Purpose**: JWT 工具函数和 Next.js 中间件——所有用户故事的阻塞前置条件。

- [x] T004 Create `lib/auth/jwt.ts` with `signAdminJwt(payload)` and `verifyAdminJwt(token)` using `jose`, reading `JWT_SECRET` from env
- [x] T005 Create `middleware.ts` at project root: protect all `/admin/:path*` routes (except `/admin/login`), verify `admin_token` Cookie via `verifyAdminJwt`, redirect to `/admin/login` on failure
- [x] T006 Create `app/admin/layout.tsx` as minimal shell layout (no auth logic — middleware handles it)

---

## Phase 3: User Story 1 — 管理员登录与路由保护

**Story Goal**: 管理员可通过账号密码登录，/admin/* 路由受中间件保护，未登录自动跳转 /admin/login。

**Independent Test**: 访问 /admin/config 验证重定向到 /admin/login；用正确凭据登录验证进入后台；退出后验证再次重定向。

- [x] T007 [US1] Create `app/api/admin/auth/login/route.ts`: POST handler — validate body, query AdminUser by username, compare password with bcryptjs, sign JWT, set `admin_token` HttpOnly Cookie (SameSite=Lax, Path=/admin), return `{ok: true}` or 400/401
- [x] T008 [US1] Create `app/api/admin/auth/logout/route.ts`: POST handler — clear `admin_token` Cookie, return `{ok: true}`
- [x] T009 [US1] Create `app/admin/login/page.tsx`: Client Component with username/password form, calls POST /api/admin/auth/login, redirects to /admin/config on success, shows error message on failure
- [x] T010 [US1] Create `app/admin/page.tsx`: redirect to `/admin/config` using `next/navigation` redirect

---

## Phase 4: User Story 2 — 运营配置面板

**Story Goal**: 管理员可查看和修改所有第三方服务配置（AI/语音/Avatar/System Prompt），配置保存后立即生效。

**Independent Test**: 修改 AI_PROVIDER 并保存，GET /api/admin/config 验证返回新值；修改 AI_API_KEY 验证返回脱敏格式。

- [x] T011 [US2] Create `app/api/admin/config/route.ts`: GET handler — fetch all Config rows via Prisma, apply `maskApiKey` to `_KEY` suffix fields, return `{ok: true, data: [...]}`. PUT handler — receive `configs` array, upsert each key-value via `prisma.config.upsert`, return `{ok: true}`
- [x] T012 [P] [US2] Create `components/admin/ConfigForm.tsx`: Client Component — render editable fields for AI_PROVIDER, AI_API_KEY, AI_MODEL, SPEECH_PROVIDER, SPEECH_API_KEY, AVATAR_PROVIDER (disabled/placeholder), AVATAR_API_KEY (disabled/placeholder), SYSTEM_PROMPT (textarea); show masked values; submit calls PUT /api/admin/config; show save success/error feedback
- [x] T013 [US2] Create `app/admin/config/page.tsx`: Server Component — fetch GET /api/admin/config, pass data to `<ConfigForm>`, render page with title

---

## Phase 5: User Story 3 — 访客入口管理

**Story Goal**: 管理员可生成有期限/永久访客链接，获取二维码，启用/禁用链接。

**Independent Test**: 生成一条有期限链接验证返回 token 和 expiresAt；禁用后 PATCH 验证状态变更；通过访客链接访问验证行为。

- [x] T014 [US3] Create `app/api/admin/access-tokens/route.ts`: GET handler — list all AccessToken rows ordered by createdAt desc, return `{ok: true, data: [...]}`. POST handler — validate body (label?, expiresAt?, type: 'permanent'|'timed'), generate token via `crypto.randomUUID()`, create AccessToken row, return `{ok: true, data: {id, token, label, expiresAt, enabled, createdAt}}`
- [x] T015 [US3] Create `app/api/admin/access-tokens/[id]/route.ts`: PATCH handler — update `enabled` or `expiresAt` fields, return `{ok: true, data: {...}}` or 404. DELETE handler — delete AccessToken row, return `{ok: true}` or 404
- [x] T016 [P] [US3] Create `components/admin/QrCodeDisplay.tsx`: Client Component — accept `url: string` prop, render `<QRCodeSVG>` from `qrcode.react`, include download button that triggers SVG-to-PNG export
- [x] T017 [P] [US3] Create `components/admin/AccessTokenList.tsx`: Client Component — display table of access tokens (label, token URL, expiresAt, enabled toggle, delete button, QR code button); enabled toggle calls PATCH /api/admin/access-tokens/[id]; delete calls DELETE; QR button shows `<QrCodeDisplay>` in modal
- [x] T018 [US3] Create `app/admin/access-tokens/page.tsx`: Server Component — fetch GET /api/admin/access-tokens, render `<AccessTokenList>` with create-new-link form (label input, expiry type selector, expiry date picker)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 导航、错误处理、安全 headers、环境变量文档。

- [x] T019 Add admin navigation bar to `app/admin/layout.tsx`: links to /admin/config and /admin/access-tokens, logout button that calls POST /api/admin/auth/logout then redirects to /admin/login
- [x] T020 [P] Add `JWT_SECRET` to `.env.example` with placeholder comment; verify ADMIN_USERNAME and ADMIN_PASSWORD are documented
- [x] T021 [P] Update `README.md` with admin panel section: login URL, seed command, config keys table, access token usage
- [x] T022 Verify `prisma/seed.ts` creates AdminUser from ADMIN_USERNAME/ADMIN_PASSWORD env vars with bcrypt hash, skips if AdminUser table already has records

---

## Dependencies

```
Phase 1 (Setup)
  └── Phase 2 (Foundational: JWT + Middleware)
        ├── Phase 3 (US1: Login) — independent after Phase 2
        ├── Phase 4 (US2: Config) — independent after Phase 2 + T003
        └── Phase 5 (US3: Access Tokens) — independent after Phase 2
              └── Phase 6 (Polish)
```

- US2 依赖 T003 (lib/config/index.ts) — 配置读写工具函数
- US1/US2/US3 均依赖 T004+T005 (JWT + Middleware)
- US3 依赖 T001 (qrcode.react 安装)
- US2 和 US3 可在 US1 完成后并行开发

---

## Parallel Execution Examples

**完成 Phase 2 后，以下可并行**:
- T007 + T008 (US1 两个 API route 文件不同)
- T011 + T012 (US2 API route 与 ConfigForm 组件)
- T014 + T015 + T016 + T017 (US3 多个独立文件)
- T020 + T021 (文档任务完全独立)

---

## Implementation Strategy

### MVP Scope (User Story 1 only)

1. 完成 Phase 1 + Phase 2 (T001-T006)
2. 完成 Phase 3 (T007-T010)
3. 验证：访问 /admin/config → 重定向到 /admin/login → 登录成功 → 进入后台
4. 此时已有可演示的完整认证流程

### Incremental Delivery

1. Phase 1+2 完成 → 中间件保护生效
2. Phase 3 完成 → MVP：管理员可登录
3. Phase 4 完成 → 可配置 AI/语音服务
4. Phase 5 完成 → 可管理访客入口
5. Phase 6 完成 → 生产就绪

### Parallel Team Strategy

完成 Phase 1+2 后：
- 开发者 A：Phase 3 (US1 登录)
- 开发者 B：Phase 4 (US2 配置面板)
- 开发者 C：Phase 5 (US3 访客入口)

---

## Notes

- [P] tasks = 不同文件，无依赖，可并行
- [Story] label 对应 spec.md 中的用户故事编号
- 每个 User Story Phase 完成后可独立验证，无需等待其他 Story
- 所有数据模型复用 001 已有表，无 Prisma migration
- API Key 脱敏规则：`_KEY` 后缀字段，长度 <= 8 返回 `********`，长度 > 8 返回 `{first4}****{last4}`
- Avatar 相关字段在配置面板中显示但禁用（预留）
