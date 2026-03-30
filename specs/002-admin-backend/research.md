# Research: Admin Backend (002-admin-backend)

## 1. JWT 认证方案

**Decision**: 使用 `jose` 库（已安装 v6.x）实现 JWT 签发与验证，令牌存储在 HttpOnly Cookie 中。

**Rationale**: `jose` 是 Web Crypto API 原生实现，与 Next.js Edge Runtime 完全兼容，无需 Node.js crypto 模块。项目已安装此依赖。存储于 HttpOnly Cookie 可防止 XSS 读取令牌。

**Alternatives considered**:
- `next-auth`（已在 package.json 中）：过重，引入了 OAuth、Session 表等复杂性，本功能只需简单账号密码认证。
- `jsonwebtoken`：依赖 Node.js Buffer，不兼容 Edge Middleware，排除。

**Implementation details**:
- 算法：HS256，密钥来自环境变量 `JWT_SECRET`
- 有效期：8 小时（可通过环境变量 `JWT_EXPIRES_IN` 覆盖）
- Cookie 名称：`admin_token`，属性：`HttpOnly; Secure; SameSite=Lax; Path=/admin`

---

## 2. Next.js 中间件路由保护

**Decision**: 使用 Next.js `middleware.ts`（项目根目录）拦截 `/admin` 路由，验证 Cookie 中的 JWT。

**Rationale**: Middleware 在 Edge Runtime 运行，在页面渲染前即可完成重定向，无闪烁。`jose` 与 Edge Runtime 兼容，可在 middleware 中直接验证 JWT。

**Alternatives considered**:
- 在每个 Server Component 中验证：重复代码且不能阻止页面渲染开始。
- 使用 `next-auth` middleware：引入额外复杂性，与本项目简单账号密码需求不匹配。

**Matcher 配置**:
```
matcher: ['/admin/:path*']
```
排除 `/admin/login` 的方式：middleware 内部判断 pathname，若为 `/admin/login` 则跳过验证。

---

## 3. 运营配置读写方案

**Decision**: 配置存储在 MySQL `Config` 表（key-value），通过 `lib/config/index.ts` 提供 `getConfig(key)` 和 `setConfig(key, value)` 函数。读取时优先使用数据库值，回退到 `process.env`。

**Rationale**: `Config` 表已在 Prisma schema 中定义（001 Feature 完成）。Key-value 结构灵活，新增配置项无需迁移表结构。

**Config key 命名约定**（全大写下划线分隔）:

| Key | 说明 | 对应环境变量 |
|-----|------|-------------|
| `AI_PROVIDER` | AI 服务商类型 | `AI_PROVIDER` |
| `AI_API_KEY` | AI API Key | `AI_API_KEY` |
| `AI_MODEL` | AI 模型名称 | `AI_MODEL` |
| `SPEECH_PROVIDER` | 语音服务商类型 | `SPEECH_PROVIDER` |
| `SPEECH_API_KEY` | 语音 API Key | `SPEECH_API_KEY` |
| `AVATAR_PROVIDER` | Avatar 服务商（预留） | `AVATAR_PROVIDER` |
| `AVATAR_API_KEY` | Avatar API Key（预留） | `AVATAR_API_KEY` |
| `SYSTEM_PROMPT` | AI 系统提示词 | `SYSTEM_PROMPT` |

**实时生效机制**: 每次请求时调用 `getConfig()` 直接查询数据库，不在进程内存中缓存，确保配置变更立即对下一个请求生效。

**Alternatives considered**:
- 内存缓存 + TTL：需要额外的失效逻辑，单节点场景下收益低，排除。
- 独立配置文件：无法通过 UI 实时修改，排除。

---

## 4. API Key 脱敏显示

**Decision**: 在配置面板 API 路由返回配置值时，对包含 `_KEY` 后缀的字段做脱敏处理：保留前 4 位和后 4 位，中间替换为 `****`。

**Rationale**: 防止完整 API Key 在前端明文展示，降低 XSS 或截图泄露风险。

**规则**:
- 长度 <= 8：全部替换为 `********`
- 长度 > 8：`${first4}****${last4}`
- 空值/未配置：返回空字符串

---

## 5. 访客链接生成方案

**Decision**: 使用 `crypto.randomUUID()` 生成链接 token，存储于 `AccessToken` 表（已有字段：`token`, `label`, `expiresAt`, `enabled`）。前台访问链接格式：`/visit?token={uuid}`。

**Rationale**: `AccessToken` 表已在 schema 中定义，字段完全满足需求，无需迁移。`crypto.randomUUID()` 是 Node.js 内置方法，无需额外依赖。

**Alternatives considered**:
- nanoid：额外依赖，UUID 已满足唯一性要求。
- 短链：本期不需要，预留扩展可能。

---

## 6. 二维码生成方案

**Decision**: 使用前端库 `qrcode.react` 在客户端渲染二维码，无需服务端生成图片。

**Rationale**: 假设章节中已明确「二维码在前端生成，无需服务端生成图片」。`qrcode.react` 是 React 生态中广泛使用的方案，无服务端依赖。

**依赖**: 需新增 `qrcode.react` 到 package.json。

**Alternatives considered**:
- 服务端生成 PNG（`qrcode` npm 包）：增加服务端计算，且每次生成需要额外 API 调用。
- Canvas API 手动绘制：开发成本高。

---

## 7. 密码验证

**Decision**: 使用 `bcryptjs`（已安装）验证管理员密码，登录时调用 `bcrypt.compare(inputPassword, storedHash)`。

**Rationale**: `bcryptjs` 已在项目依赖中，001 Feature 的 seed 脚本使用它哈希初始密码。

---

## 8. 配置面板 UI 框架

**Decision**: 使用 Next.js App Router Server Components + Client Components 混合模式。配置面板页面（`/admin/config`）作为 Server Component 加载初始数据，表单交互部分为 Client Component，通过 fetch 调用内部 API Route。

**Rationale**: 与项目现有架构一致（Next.js 14 App Router）。Server Component 初始加载配置，无需额外 loading 状态。

---

## 解决的 NEEDS CLARIFICATION

所有技术细节已在上述各节明确，无遗留未解决项。
