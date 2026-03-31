# Tasks: MCP Server 集成（007）

**Branch**: `007-mcp-integration`
**Input**: `/specs/007-mcp-integration/` — plan.md, spec.md, data-model.md, contracts/
**Tests**: 手动验证（quickstart.md）

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件，无依赖）
- **[Story]**: 对应用户故事

---

## Phase 1: 基础设施（阻塞所有故事）

**⚠️ CRITICAL**: 以下任务必须先完成，所有 User Story 才能开始。

- [x] T001 新建 `lib/mcp/http-client.ts` — 实现 `HttpMCPClient`：`connect(url)` 验证协议 + 存储 URL；`query(prompt)` 发送 `POST {url} { query: prompt }`，5 秒超时，解析 `result`/`content` 字段，截断至 2000 字符；`disconnect()` 重置状态；`isConnected()` 返回布尔值（契约：`contracts/mcp-client-interface.md`）
- [x] T002 [P] 新建 `lib/mcp/factory.ts` — `MCPClientFactory.create()` 返回 `HttpMCPClient` 实例

---

## Phase 2: US1 — MCP 知识库增强 AI 回复

**依赖**: T001, T002

- [x] T003 [US1] 修改 `app/api/chat/route.ts` — 在步骤 7（create provider）和步骤 8（build chatMessages）之间注入 MCP 逻辑：`getConfig('MCP_SERVER_URL')` → 若有值则 `MCPClientFactory.create()` + `connect()` + `query(message)` + `disconnect()`；结果追加到 `effectiveSystemPrompt`；失败静默降级（try/catch，不影响对话）

**验收**（quickstart.md US1）：配置 MCP_SERVER_URL → 发送消息 → AI 回复包含知识库内容；停止 MCP Server → 对话正常，无错误提示。

---

## Phase 3: US2 — 后台「测试连接」按钮

**依赖**: T001（HttpMCPClient 已有 connect/query 逻辑可复用测试）

- [x] T004 [US2] 新建 `app/api/admin/mcp/test/route.ts` — `POST` handler：管理员 session 验证；读取 `body.url`；协议校验（非 http/https 直接返回 `success: false`）；调用 `HttpMCPClient.connect(url)` + `query('test')` + `disconnect()`，5 秒超时；返回 `{ success: boolean, message: string }`（契约：`contracts/api-mcp-test.md`）
- [x] T005 [P] [US2] 新建 `components/admin/McpTestButton.tsx` — Props: `currentUrl: string`；状态机：`idle → loading → success/error`；点击调用 `POST /api/admin/mcp/test`；显示结果（绿色「✓ 连接成功」/ 红色「✗ {message}」）；`currentUrl` 为空时禁用按钮
- [x] T006 [US2] 在 `app/admin/config/page.tsx` 或 `components/admin/ConfigForm.tsx` 中集成 `McpTestButton` — 读取当前 `MCP_SERVER_URL` 配置值，传入 `McpTestButton` 的 `currentUrl` prop

**验收**（quickstart.md US2）：后台配置页 MCP Server URL 旁显示「测试连接」按钮；有效 URL 显示成功；无效 URL 显示具体错误；空 URL 时按钮禁用。

---

## 实施顺序

```
T001 + T002（并行）
    ↓
T003          ← US1 MVP，可独立验证
    ↓（可与 T003 并行，T004 依赖 T001 即可）
T004 + T005（并行）
    ↓
T006          ← US2 完成，可独立验证
```

---

## 补充说明

- T003 修改现有文件，注意只在步骤 7-8 之间插入约 15 行，不改变 SSE 流逻辑
- T004 需确认管理员 session 验证方式（参考现有 `/app/api/admin/` 路由实现）
- T006 需先读 `components/admin/ConfigForm.tsx` 了解现有结构再集成
