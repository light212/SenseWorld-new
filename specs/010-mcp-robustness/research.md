# 技术调研: MCP 健壮性增强

**创建**: 2025-04-02

## 1. MCP 连接池最佳实践

**调研问题**: 如何实现高性能、线程安全的 MCP 连接池？

**调研方法**: 搜索 node最佳实践和官方 SDK 文限制

**调研结果**:

### 1.1 连接池设计模式

| 模式 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| 单例池 + 全局共享，易管理 | 单点故障风险 | 单 server 场景 |
| 按请求级池 | 隔离性好 | 管理复杂 | 多 server 场景 |
| 无池（每次新建） | 实现简单 | 性能差，资源浪费 | 低并发场景 |

**选择**: **单例池** - 当前项目只 MCP server 场景，使用单例池管理简单有效。

### 1.2 线程安全

node.js 单线程异步特性：
- 无需传统锁机制
- 但需注意异步操作顺序（如先检查再更新）
- 使用原子操作或队列管理状态

**方案**: 使用数组 + 状态标记管理连接，所有操作保持异步顺序执行。

### 1.3 连接池参数

| 参数 | 推荐值 | 依据 |
|------|--------|------|
| maxpoolsize | 5 | 默认 5 个连接可覆盖大部分并发场景 |
| maxidletimems | 60000 | 60 秒空闲后断开，平衡资源占用和复用效率 |
| cleanupintervalms | 30000 | 30 秒清理一次，避免频繁扫描 |

### 1.4 连接健康检查

**问题**: 如何判断连接是否仍然有效？

**方案**:
1. 调用前检查 `isconnected()` 状态
2. 调用失败时标记连接失效，从池中移除
3. 不主动发送心跳（增加复杂度）

---

## 2. 错误分类最佳实践

**调研问题**: 如何设计清晰的错误分类体系？

**参考**: node.js 常见错误类型、http 状态码、超时错误

### 2.1 错误码设计

```typescript
enum mcperrorcode {
  network_error     // 网络不可达、dns 解析失败
  timeout            // 连接或操作超时
  auth_failed        // 认证失败（401/403）
  server_error      // 服务端错误（5xx）
  tool_not_found     // 工具不存在
  invalid_params     // 参数验证失败
  pool_exhausted     // 连接池耗尽
  unknown            // 未知错误
}
```

### 2.2 锇恢复性判断

| 错误码 | 可恢复 | 理由 |
|--------|--------|------|
| network_error | ✅ | 网络可能恢复 |
| timeout | ✅ | 临时问题，可重试 |
| auth_failed | ❌ | 需要人工干预 |
| server_error | ⚠️ | 取决于具体错误（5xx 可能恢复） |
| tool_not_found | ❌ | 配置问题 |
| invalid_params | ❌ | 调用方问题 |
| pool_exhausted | ✅ | 等待后可重试 |

---

## 3. 结构化日志最佳实践

 **调研问题**: 如何设计便于日志聚合的结构化日志？

**参考**: JSON logging、pino、winston

### 3.1 日志字段设计

```typescript
interface mcplogevent {
  timestamp: string      // ISO 8601
  level: 'debug' | 'info' | 'warn' | 'error'
  component: 'mcp'
  event: string           // 事件类型
  serverurl?: string      // 服务器地址（脱敏）
  toolname?: string       // 工具名称
  durationms?: number     // 耗时
  error?: string          // 错误消息
  poolstats?: {           // 连接池状态
    total: number
    inuse: number
    idle: number
  }
}
```

### 3.2 事件类型

| 事件 | 级别 | 说明 |
|------|------|------|
| connect | info | 连接成功 |
| connect_failed | warn | 连接失败 |
| disconnect | info | 断开连接 |
| tool_call | info | 工具调用开始 |
| tool_result | info | 工具调用完成 |
| tool_error | warn | 工具调用失败 |
| pool_acquire | debug | 从池获取连接 |
| pool_release | debug | 释放连接到池 |
| pool_evict | info | 清理连接 |

---

## 4. 监控指标最佳实践

 **调研问题**: 如何设计轻量级监控指标？

**参考**: Prometheus 指标类型、OpenTelemetry

### 4.1 指标设计

| 指标名 | 类型 | 说明 |
|--------|------|------|
| mcp_connections_total | counter | 总连接次数 |
| mcp_connections_active | gauge | 当前活跃连接数 |
| mcp_connections_failed | counter | 失败连接次数 |
| mcp_tool_calls_total | counter | 工具调用总次数 |
| mcp_tool_calls_success | counter | 成功次数 |
| mcp_tool_calls_failed | counter | 失败次数 |
| mcp_tool_call_duration_ms | histogram | 工具调用耗时分布（按工具名） |
| mcp_pool_size | gauge | 连接池大小 |
| mcp_pool_in_use | gauge | 使用中连接数 |
| mcp_pool_evictions | counter | 连接清理次数 |

### 4.2 性能考虑

- **异步收集**: 指标更新不阻塞主流程
- **内存存储**: 不引入外部依赖，内存中保留最近 100 次调用耗时
- **轻量导出**: JSON 和 Prometheus 格式按

---

## 5. 超时控制最佳实践

 **调研问题**: 如何实现细粒度超时控制？

### 5.1 超时层级

| 操作 | 超时 | 理由 |
|------|------|------|
| 连接 | 5s | 网络连接应快速完成 |
| listtools | 10s | 元数据查询，不应太长 |
| tool call（默认） | 15s | 大部分工具执行较快 |
| tool call（最大） | 60s | 复杂工具需要更多时间 |

### 5.2 超时实现

- 使用 `Promise.race()` 或 `AbortController`
- 超时后取消底层请求
- 当前代码已使用 `withTimeout` 包装，无需改动

---

## 6. 官方 SDK 限制

**问题**: `@modelcontextprotocol/sdk` 是否提供连接池？

**调研结果**:
- 官方 sdk 不提供连接池
- 每次调用需要创建新客户端或复用传输层
- 需要自行实现连接池

**决策**: 在官方 sdk 之上封装连接池，不修改 sdk 本身。
