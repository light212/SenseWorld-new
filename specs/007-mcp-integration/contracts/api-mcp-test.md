# API Contract: POST /api/admin/mcp/test

## 说明

新增管理员端点，测试 MCP Server 连通性。需管理员 session 认证。

## Request

```
POST /api/admin/mcp/test
Content-Type: application/json
```

```json
{ "url": "http://mcp.internal/query" }
```

**字段说明**:
- `url`（必填）: 要测试的 MCP Server 地址，必须以 `http://` 或 `https://` 开头

## Response

### 200 OK（连接成功）

```json
{ "success": true, "message": "连接成功" }
```

### 200 OK（连接失败，也返回 200）

```json
{ "success": false, "message": "连接超时（5秒）" }
```

```json
{ "success": false, "message": "地址格式无效，仅支持 http/https" }
```

```json
{ "success": false, "message": "HTTP 503: Service Unavailable" }
```

### 400 Bad Request

```json
{ "error": "url is required" }
```

### 401 Unauthorized

```json
{ "error": "unauthorized" }
```

## 行为规范

- 超时：5 秒
- URL 协议校验：非 http/https 直接返回 `success: false`，不发起网络请求（SSRF 防护）
- 网络错误（ECONNREFUSED 等）：返回 `success: false` + 具体错误信息
- 认证：复用现有管理员 session 机制
