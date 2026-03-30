# Feature Specification: Admin Backend

**Feature Branch**: `002-admin-backend`
**Created**: 2025-01-30
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 管理员登录与路由保护 (Priority: P1)

运营人员通过账号和密码登录后台管理系统，登录成功后获得访问后台所有功能的权限。未登录时访问任何 /admin 路由，系统自动跳转到登录页面。

**Why this priority**: 所有后台功能的安全前提。没有身份验证，配置和入口管理等敏感功能将完全暴露。

**Independent Test**: 访问 /admin 任意页面验证重定向行为；用正确账号密码登录验证进入后台；用错误凭据验证拒绝访问。

**Acceptance Scenarios**:

1. **Given** 未登录状态，**When** 访问 /admin/config，**Then** 被重定向到 /admin/login
2. **Given** 登录页，**When** 输入正确账号密码并提交，**Then** 成功进入后台管理首页，会话在有效期内持续有效
3. **Given** 登录页，**When** 输入错误的账号或密码，**Then** 显示错误提示，不允许进入后台
4. **Given** 已登录用户，**When** 点击退出登录，**Then** 会话销毁，后续访问 /admin 路由均重定向到登录页

---

### User Story 2 - 运营配置面板 (Priority: P2)

已登录的运营人员可在配置面板中查看和修改所有第三方服务的配置，包括 AI 模型选择与 API Key、语音服务选择与 API Key、Avatar 服务选择与 API Key（预留）、以及 System Prompt。所有配置保存后立即生效，无需重启服务。

**Why this priority**: 配置面板是系统可运行的核心，决定了 AI 对话、语音、数字人等所有能力的行为。

**Independent Test**: 修改 AI 模型配置并保存，随后触发一次 AI 对话，验证新模型被实际使用。

**Acceptance Scenarios**:

1. **Given** 配置面板，**When** 运营人员修改 AI 模型类型和 API Key 后保存，**Then** 系统显示保存成功，新配置立即生效无需重启
2. **Given** 配置面板，**When** 运营人员修改 System Prompt 后保存，**Then** 后续所有 AI 对话使用新的 System Prompt
3. **Given** 配置面板，**When** 运营人员填写了语音服务类型和 API Key 后保存，**Then** 语音功能使用新配置
4. **Given** 数据库中存有配置，**When** 系统读取配置，**Then** 数据库中的配置优先级高于环境变量中的同名配置
5. **Given** API Key 字段，**When** 页面加载时，**Then** 已保存的 Key 以脱敏形式显示（如 `sk-****abcd`），不明文展示完整值

---

### User Story 3 - 访客入口管理 (Priority: P3)

运营人员可以生成访客访问链接，设置链接有效期（固定期限或永久），并获取对应二维码。可以启用或禁用已生成的链接，禁用后该链接立即失效。

**Why this priority**: 访客入口控制访问权限，是对外开放系统的必要功能，但可在配置面板就绪后独立开发。

**Independent Test**: 生成一条有期限的访客链接，通过链接访问验证可以进入；禁用该链接后再次访问验证被拒绝。

**Acceptance Scenarios**:

1. **Given** 访客入口管理页，**When** 运营人员点击「生成链接」并选择有期限，**Then** 系统生成唯一链接并展示对应二维码
2. **Given** 访客入口管理页，**When** 运营人员点击「生成链接」并选择永久，**Then** 系统生成无有效期限制的永久链接
3. **Given** 有效访客链接，**When** 访客通过链接访问系统，**Then** 能正常使用前台功能
4. **Given** 未过期但被禁用的链接，**When** 访客尝试访问，**Then** 系统拒绝访问并提示链接已失效
5. **Given** 已过期的链接，**When** 访客尝试访问，**Then** 系统拒绝访问并提示链接已到期
6. **Given** 入口管理列表，**When** 运营人员切换某条链接的启用/禁用状态，**Then** 状态立即生效

---

## Functional Requirements

### FR-001: 管理员身份验证
- 系统支持通过账号和密码进行管理员登录
- 登录成功后签发 JWT token，有效期 8 小时
-登录成功后颁发有时效的身份令牌（JWT），存储于 HttpOnly Cookie
- 令牌过期后自动要求重新登录
- 不依赖第三方 OAuth 服务

### FR-002: 路由中间件保护
- 所有 /admin/* 路由均受中间件保护
- 未携带有效令牌的请求重定向到 /admin/login
- /admin/login 本身不受保护，允许未登录访问

### FR-003: 运营配置存储与读取
- 配置项存储在数据库 Config 表中（key-value 结构）
- 系统读取配置时，数据库中的值优先级高于同名环境变量
- 配置变更保存后立即对后续请求生效，无需重启服务
- 支持的配置项 key 名称如下：

| Key | 说明 | 可选值 |
|-----|------|--------|
| `llm.provider` | AI 服务商 | `claude` \| `openai` \| `gemini` |
| `llm.apiKey` | AI API Key | 字符串 |
| `llm.model` | 模型版本 | 如 `claude-sonnet-4-6`、`gpt-4o` |
| `speech.provider` | 语音服务商 | `openai` \| `azure` |
| `speech.apiKey` | 语音 API Key | 字符串 |
| `speech.region` | Azure 区域 | 字符串（Azure 专用） |
| `speech.ttsVoice` | TTS 音色 | 如 `alloy`、`zh-CN-XiaoxiaoNeural` |
| `avatar.provider` | 数字人服务商（预留） | `heygen` \| `did` |
| `avatar.apiKey` | 数字人 API Key（预留） | 字符串 |
| `system.prompt` | AI 系统提示词 / 人设 | 长文本 |

### FR-004: API Key 安全显示
- 配置面板中已保存的 API Key 以脱敏形式展示
- 用户可通过点击「修改」操作覆盖写入新值

### FR-005: 访客链接管理
- 系统可生成带唯一标识的访客访问链接
- 链接支持两种有效期类型：固定到期时间、永久有效
- 每条链接有独立的启用/禁用状态
- 禁用状态的链接访问请求被拒绝，返回明确提示
- 已过期的链接访问请求被拒绝，返回明确提示

### FR-006: 二维码生成
- 每条访客链接对应一个可展示的二维码
- 二维码在链接生成时即可展示，支持下载

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 运营人员可在 1 分钟内完成登录并进入配置面板
- **SC-002**: 配置变更保存后，下一个进入系统的用户请求即使用新配置，无感知延迟
- **SC-003**: 访客链接生成后，二维码立即可展示，无需额外操作
- **SC-004**: 禁用访客链接后，该链接在 1 秒内对所有新请求失效
- **SC-005**: 所有 /admin 路由在未登录状态下 100% 重定向到登录页，无例外

---

## Assumptions

- 管理员账号数量极少（1-3 人），初始账号通过环境变量或初始化脚本配置，无需在后台提供账号管理 UI
- Avatar 服务配置项在本期作为预留字段展示，无需实际集成验证
- 访客链接指向前台对话入口页面，链接校验逻辑由前台中间件负责
- 二维码在前端生成（客户端渲染），无需服务端生成图片
- 配置面板不需要分组权限，所有管理员拥有相同的完整配置权限
- 系统部署在单节点环境，配置生效无需跨节点同步缓存失效
