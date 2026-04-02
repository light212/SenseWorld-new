# 合约: MCP 监控指标 api

**版本**: 1.0.0
**路径**: `GET /api/admin/mcp/metrics`
**认证**: 管理员 session（admin_token cookie）

---

## 请求

### 获取指标

```http
get /api/admin/mcp/metrics
cookie: admin_token=<token>
accept: application/json | text/event-stream
```

### 获取 prometheus 格式

```http
get /api/admin/mcp/metrics
cookie: admin_token=<token>
accept: text/plain
```

---

## 响应

### 成功（200）

```json
{
  "connectionstotal": 10,
  "connectionsactive": 3,
  "connectionsfailed": 1,
  "toolcallstotal": 50,
  "toolcallssuccess": 45,
  "toolcallsfailed": 5,
  "avgtoolcalldurationms": {
    "query_knowledge": 120,
    "create_record": 500
 }
}
```

### prometheus 格式（200, text/plain）

```text
# help mcp_connections_total total mcp connection attempts
# type mcp_connections_total counter
mcp_connections_total 10

# help mcp_connections_active currently active connections
# type mcp_connections_active gauge
mcp_connections_active 3

# help mcp_tool_calls_total total tool calls
# type mcp_tool_calls_total counter
mcp_tool_calls_total 50

# help mcp_tool_calls_success successful tool calls
# type mcp_tool_calls_success counter
mcp_tool_calls_success 45

# help mcp_pool_size current pool size
# type mcp_pool_size gauge
mcp_pool_size 5

# help mcp_pool_in_use connections currently in use
# type mcp_pool_in_use gauge
mcp_pool_in_use 3
```

### 未认证失败（401）

```json
{
  "error": "unauthorized"
}
```

---

## 错误处理

| 错误码 | 说明 |
|--------|------|
| 401 | 未认证（无 admin_token 或无效） |
| 500 | 内部错误 |
