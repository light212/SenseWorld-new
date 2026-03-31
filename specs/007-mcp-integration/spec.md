# Feature Specification: MCP Server 集成（007）

**Feature Branch**: `007-mcp-integration`  
**Created**: 2025-07-21  
**Status**: Draft  
**Input**: 对接公司 MCP Server 知识库，增强 AI 回复质量

## User Scenarios & Testing *(mandatory)*

### User Story 1 - MCP 知识库增强 AI 回复 (Priority: P1)

运营人员在后台配置 MCP Server 地址后，用户发送的每一条消息在调用 LLM 之前，系统自动向 MCP Server 查询相关知识，将查询结果注入 AI 上下文，使 AI 回复包含公司私有知识库的内容。

**Why this priority**: 这是本 feature 的核心价值——让 AI 能够回答公司私有知识库中的问题，是整个 MCP 集成的根本目的。

**Independent Test**: 配置 MCP Server 地址 → 在对话界面发送问题 → AI 回复包含知识库内容（相比未配置时更准确）。

**Acceptance Scenarios**:

1. **Given** 运营后台已配置有效的 `MCP_SERVER_URL`，**When** 用户发送消息 `POST /api/chat`，**Then** 系统在调用 LLM 前先查询 MCP Server，将返回结果作为 system context 注入，AI 回复包含知识库相关信息。
2. **Given** MCP Server 查询超时或失败，**When** 用户发送消息，**Then** 系统静默降级（跳过 MCP 查询），继续正常调用 LLM，不影响对话体验。
3. **Given** `MCP_SERVER_URL` 未配置，**When** 用户发送消息，**Then** 跳过 MCP 查询，行为与未集成前完全一致。

---

### User Story 2 - 后台「测试连接」按钮 (Priority: P2)

运营人员在后台配置页填写 MCP Server 地址后，可点击「测试连接」按钮验证连通性，立即得到「连接成功」或具体错误信息的反馈。

**Why this priority**: 连接检测提升运营配置体验，减少配置错误导致的静默失败，但不影响 P1 核心价值的独立交付。

**Independent Test**: 在后台配置页输入 MCP Server 地址 → 点击「测试连接」→ 页面显示连接结果。

**Acceptance Scenarios**:

1. **Given** 填写了有效的 MCP Server URL，**When** 点击「测试连接」，**Then** 约 2-5 秒后显示「连接成功」。
2. **Given** 填写了无法访问的 URL，**When** 点击「测试连接」，**Then** 显示具体错误信息（如「连接超时」「地址无效」）。
3. **Given** URL 字段为空，**When** 点击「测试连接」，**Then** 按钮不可用。

---

### Edge Cases

- MCP Server 返回空结果：跳过注入，正常调用 LLM
- MCP Server 返回超大内容：截断至 2000 字符再注入
- 网络超时：5 秒超时后降级，不阻塞对话
- MCP Server 地址格式非法（非 http/https）：测试连接返回「地址格式无效」

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 在 `POST /api/chat` 处理流程中，若 `MCP_SERVER_URL` 已配置，则在调用 LLM 前向 MCP Server 发起查询请求。
- **FR-002**: MCP 查询结果 MUST 以 system message 形式注入到 LLM 上下文的最前面。
- **FR-003**: MCP 查询失败（超时、网络错误、HTTP 非 2xx）时 MUST 静默降级，不向用户暴露错误。
- **FR-004**: `MCPClient` MUST 实现 `lib/mcp/types.ts` 中定义的 `MCPClient` 接口。
- **FR-005**: 后台配置页 MUST 新增「测试连接」按钮，调用 `POST /api/admin/mcp/test` 端点。
- **FR-006**: `POST /api/admin/mcp/test` MUST 返回 `{ success: boolean, message: string }`，需管理员 session 认证。
- **FR-007**: MCP 查询超时 MUST 设置为 5 秒。
- **FR-008**: MCP 注入内容超过 2000 字符时 MUST 截断。

### Key Entities

- **MCPClient**: 实现 `lib/mcp/types.ts` 接口，封装 HTTP 连接、查询、超时逻辑；由 `MCPFactory` 按配置创建。
- **MCP_SERVER_URL**: 存储于 `Config` 表的运营配置键，值为 MCP Server HTTP 地址；未设置时跳过所有 MCP 逻辑。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 配置有效 MCP Server 后，AI 回复可引用知识库内容（通过对话验证）。
- **SC-002**: MCP Server 不可用时，对话正常进行，用户无感知（不显示任何错误提示）。
- **SC-003**: 「测试连接」在 5 秒内返回明确结果（成功或具体错误信息）。
- **SC-004**: `MCP_SERVER_URL` 未配置时，`/api/chat` 响应时间与未集成前无显著差异（无额外延迟）。

## Assumptions

- MCP Server 由公司内部维护，提供 HTTP API；本 feature 通过 HTTP POST 查询，无需 WebSocket。
- `@modelcontextprotocol/sdk` 是否已安装需 research 阶段确认；若未安装，改用原生 `fetch` 实现 HTTP 查询。
- MCP Server 查询接口接受 `{ query: string }` 并返回 `{ result: string }` 或类似结构，具体以 research 阶段确认为准。
- 后台管理页（`/admin/config`）已有配置 CRUD，本 feature 仅新增「测试连接」交互，不重构配置存储。
- 本期不实现 MCP Tool Call / function calling 流程，仅实现 RAG 式注入（查询结果作为 system context）。
- 无新增数据库表，`MCP_SERVER_URL` 存入现有 `Config` 表。
- 无新增 npm 依赖（若 SDK 未安装则用 fetch 代替）。
