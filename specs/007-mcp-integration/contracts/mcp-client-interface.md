# Contract: MCPClient Interface & HTTP Implementation

## 接口（已有，不变）

```typescript
// lib/mcp/types.ts
interface MCPClient {
  connect(serverUrl: string): Promise<void>
  disconnect(): Promise<void>
  query(prompt: string): Promise<string>
  isConnected(): boolean
}
```

## HttpMCPClient 行为规范

### connect(serverUrl)
- 验证协议为 `http://` 或 `https://`，否则 throw Error
- 存储 URL，设置 `connected = true`
- 不发起网络请求（连接在 query 时建立）

### query(prompt)
- 前置：若 `!connected` 则 throw Error
- 发送：`POST {serverUrl}`，body: `{ "query": prompt }`，timeout: 5000ms
- 解析响应：优先读 `result` 字段，其次读 `content` 字段
- 若两个字段均不存在或为空字符串：返回 `""`
- 截断：返回值超过 2000 字符时截断至 2000 字符
- 失败（超时、网络错误、HTTP 非 2xx）：throw Error（调用方负责 catch 降级）

### disconnect()
- 重置 `serverUrl = null`，`connected = false`

### isConnected()
- 返回 `connected` 布尔值

## chat route 注入规范

注入位置：`app/api/chat/route.ts` POST handler，步骤 7（create provider）之后、步骤 8（build chatMessages）之前。

```typescript
// 伪代码
const mcpUrl = await getConfig('MCP_SERVER_URL')
let mcpContext = ''
if (mcpUrl) {
  try {
    const client = MCPClientFactory.create()
    await client.connect(mcpUrl)
    mcpContext = await client.query(message)
    await client.disconnect()
  } catch {
    // 静默降级
  }
}

const effectiveSystemPrompt = mcpContext
  ? `${systemPrompt ?? ''}\n\n--- Knowledge Base Context ---\n${mcpContext}`
  : systemPrompt

// 然后用 effectiveSystemPrompt 构建 chatMessages
```

## McpTestButton 组件规范

- Props: `currentUrl: string`（从 ConfigForm 读取当前填写的 MCP_SERVER_URL 值）
- 状态: `MCPTestState = 'idle' | 'loading' | 'success' | 'error'`
- 点击时：若 `currentUrl` 为空则禁用；调用 `POST /api/admin/mcp/test { url: currentUrl }`
- 结果显示：成功显示绿色「✓ 连接成功」，失败显示红色「✗ {message}」
- Loading 时显示 spinner，禁用按钮
