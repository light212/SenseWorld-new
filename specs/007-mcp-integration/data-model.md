# Data Model: 007-mcp-integration

## 无新增数据库表

本 feature 不新增任何 Prisma schema 表。复用已有：

- `Config`（key, value）— 存储 `MCP_SERVER_URL`，只读于 API 路由

## 新增配置键

| 键 | 类型 | 说明 |
|----|------|------|
| `MCP_SERVER_URL` | string | MCP Server HTTP 地址，如 `http://mcp.internal/query`；未设置则跳过 MCP 查询 |

## 前端状态（非持久化）

```typescript
// 测试连接响应（POST /api/admin/mcp/test）
interface MCPTestResult {
  success: boolean
  message: string  // 成功："连接成功" | 失败：具体错误信息
}

// 测试按钮 UI 状态
type MCPTestState = 'idle' | 'loading' | 'success' | 'error'
```

## MCPClient 接口（已有，不变）

```typescript
// lib/mcp/types.ts（已存在）
interface MCPClient {
  connect(serverUrl: string): Promise<void>
  disconnect(): Promise<void>
  query(prompt: string): Promise<string>  // 返回空字符串表示无结果
  isConnected(): boolean
}
```

## HttpMCPClient 实现（新增）

```typescript
// lib/mcp/http-client.ts
class HttpMCPClient implements MCPClient {
  // 内部状态
  private serverUrl: string | null = null
  private connected: boolean = false
  
  // connect(): 仅存储 URL + 验证协议（http/https）
  // query(): POST {serverUrl} { query } → 解析 result/content 字段，超时 5s，截断 2000 字符
  // disconnect(): 重置状态
  // isConnected(): 返回 connected 标志
}
```

## MCPClientFactory（新增）

```typescript
// lib/mcp/factory.ts
class MCPClientFactory {
  static create(): MCPClient  // 返回 HttpMCPClient 实例
}
```

## API 新增端点数据结构

### POST /api/admin/mcp/test

**Request**:
```json
{ "url": "http://mcp.internal/query" }
```

**Response 200**:
```json
{ "success": true, "message": "连接成功" }
```

**Response 200（失败也返回 200，success: false）**:
```json
{ "success": false, "message": "连接超时（5秒）" }
```

**Response 401**: 未登录管理员
**Response 400**: `{ "error": "url is required" }`
