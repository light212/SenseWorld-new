# Quickstart: 007-mcp-integration

## 前置条件

- 运营后台已配置 AI Provider（`AI_PROVIDER` + `AI_API_KEY` + `AI_MODEL`）
- 已生成一个有效 Access Token
- 有一个可访问的 MCP Server（HTTP POST 接口）

---

## US1 验证：MCP 知识库增强 AI 回复

1. 启动开发服务器：`pnpm dev`
2. 登录管理后台 `/admin`
3. 在「运营配置」页面添加配置项：
   - Key: `MCP_SERVER_URL`
   - Value: `http://your-mcp-server/query`
4. 访问 `/chat?token=<your_token>`
5. 发送一个知识库相关问题

**期望结果**：AI 回复包含 MCP Server 知识库中的相关内容，对比未配置时有明显差异。

**降级验证**：停止 MCP Server → 再次发送消息 → 对话正常进行，无错误提示。

---

## US2 验证：后台「测试连接」按钮

1. 登录管理后台 `/admin/config`
2. 在 MCP Server URL 配置项旁找到「测试连接」按钮
3. 场景 A：填写有效 URL → 点击「测试连接」→ 约 2-5 秒后显示「✓ 连接成功"
4. 场景 B：填写无效 URL（如 `http://localhost:9999`）→ 点击「测试连接」→ 显示「✗ 连接超时」或具体错误
5. 场景 C：URL 字段为空 → 按钮不可点击

**期望结果**：5 秒内返回明确的成功或失败反馈。

---

## 降级场景验证

| 场景 | 操作 | 期望结果 |
|------|------|----------|
| 未配置 MCP_SERVER_URL | 直接发送消息 | 正常 AI 回复，无任何 MCP 相关影响 |
| MCP Server 超时 | 配置无响应的 URL，发送消息 | 5 秒后降级，AI 正常回复（无 MCP 上下文）|
| MCP Server 返回空结果 | MCP Server 返回 `{}` | AI 正常回复，无注入内容 |
| URL 协议非 http/https | 测试连接时填写 `ftp://...` | 立即返回「地址格式无效」|

---

## MCP Server 接口约定

本 feature 预期 MCP Server 实现以下接口：

```
POST {MCP_SERVER_URL}
Content-Type: application/json

{ "query": "用户消息文本" }
```

**响应（任一格式均可）**:
```json
{ "result": "知识库相关内容" }
```
或
```json
{ "content": "知识库相关内容" }
```

若你的 MCP Server 使用不同格式，请在 `lib/mcp/http-client.ts` 中调整字段解析逻辑。
