# Research: 007-mcp-integration

## R1: @modelcontextprotocol/sdk 可用性

**Decision**: 不使用 `@modelcontextprotocol/sdk`，改用原生 `fetch` 实现 HTTP 查询。
**Rationale**: SDK 未安装于项目，安装会引入新依赖（违反 Constitution VIII 精神及 spec 约束）。MCP Server 的 HTTP 查询接口简单（POST + JSON），fetch 完全满足需求，无需 SDK 抽象层。
**Alternatives considered**: 安装 `@modelcontextprotocol/sdk` — 排除，因引入新依赖且 SDK 主要面向 stdio/process 传输，HTTP 模式实际上也是封装 fetch。

---

## R2: MCP Server HTTP 接口约定

**Decision**: 实现时采用通用 HTTP POST 方式，接口格式以 `MCP_SERVER_URL` 配置的实际服务为准。为解耦，`MCPClient.query()` 内部发送：
```json
POST {MCP_SERVER_URL}
Content-Type: application/json
{ "query": "<user message>" }
```
响应预期：`{ "result": "<context string>" }` 或 `{ "content": "<context string>" }`；实现时两个字段都尝试读取，均无则视为空结果静默跳过。
**Rationale**: spec 明确「具体以 research 阶段确认为准」，公司内部 MCP Server 格式未知，选择最通用的约定并在 quickstart.md 中说明可配置性。

---

## R3: MCP 上下文注入位置

**Decision**: 在 `app/api/chat/route.ts` POST handler 的步骤 7（LLMFactory.create）和步骤 8（构建 chatMessages 数组）之间注入。
**Rationale**: 这是最干净的注入点——provider 已创建，chatMessages 尚未组装。MCP 结果追加到 `systemPrompt` 字符串末尾，作为同一条 system message 传入，避免增加额外的 message 对象（对所有 provider 兼容性更好）。
**Injection format**:
```
[system prompt 原文]

--- Knowledge Base Context ---
{mcpResult}
```

---

## R4: RAG 注入最佳实践

**Decision**: 注入到 system message（非 user message prepend）。
**Rationale**: system message 语义上表示「背景知识/行为指令」，与 RAG 用途吻合；user message 修改会破坏对话历史的真实性。截断限制 2000 字符，避免超出 context window。

---

## R5: SSRF 防护

**Decision**: 在 `MCPClient` 实现中对 `MCP_SERVER_URL` 进行基础验证：仅允许 `http://` 和 `https://` 协议，拒绝 `file://`、`ftp://` 等；在「测试连接」端点同样校验。
**Rationale**: `MCP_SERVER_URL` 由运营人员（管理员）在后台配置，非公开用户输入，SSRF 风险相对低，但基础协议白名单是最小代价的防护，建议实施。
**Alternatives considered**: IP 范围黑名单（169.254.x.x 等）— 不实施，运营后台已有管理员认证，过度防护增加复杂度。

---

## R6: 现有代码模式

- Factory + Interface 模式：`LLMFactory` / `SpeechFactory` — `MCPClientFactory` 沿用相同模式
- 配置读取：`getConfig('KEY')` 从 `Config` 表或环境变量读取
- 管理员认证：已有 session 机制，`/api/admin/mcp/test` 复用
- 无新 npm 依赖，无新 DB 表
