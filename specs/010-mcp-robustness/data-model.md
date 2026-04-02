# 数据模型: MCP 健壮性增强

**创建**: 2025-04-02

## 概述

本 feature 不新增数据库表，仅涉及内存数据结构和类型定义。

---

## 核心类型

### 1. MCPerrorcode

错误码枚举，用于分类和处理不同类型的错误。

```typescript
enum mcperrorcode {
  network_error     // 网络不可达、dns 解析失败
  timeout            // 连接或操作超时
  auth_failed        // 认证失败
  server_error      // 服务端错误（5xx）
  tool_not_found     // 工具不存在
  invalid_params     // 参数验证失败
  pool_exhausted     // 连接池耗尽
  unknown            // 未知错误
}
```

### 2. mcperror

错误类，包含错误码、消息、原因、可恢复标志。

```typescript
interface mcperror {
  code: mcperrorcode
  message: string
  cause?: error
  recoverable: boolean
}

// 可恢复性规则：
// - network_error: ✅ 可恢复
// - timeout: ✅ 可恢复
// - auth_failed: ❌ 不可恢复
// - server_error: ⚠️ 部分可恢复（5xx 可能恢复）
// - tool_not_found: ❌ 不可恢复
// - invalid_params: ❌ 不可恢复
// - pool_exhausted: ✅ 可恢复
```

### 3. poolentry

连接池条目，跟踪单个连接的状态。

```typescript
interface poolentry {
  client: mcpclient        // 客户端实例
  serverurl: string        // 服务器地址
  apikey?: string          // api key（用于重连）
  lastused: number         // 最后使用时间戳
  inuse: boolean           // 是否正在使用
  createdat: number        // 创建时间
}
```

### 4. poolstats

连接池统计信息。

```typescript
interface poolstats {
  total: number      // 总连接数
  inuse: number       // 使用中数量
  idle: number        // 空闲数量
  evictions: number   // 累计清理次数
}
```

### 5. mcpmetrics

运行时指标收集。

```typescript
interface mcpmetrics {
  // 连接指标
  connectionstotal: number
  connectionsactive: number
  connectionsfailed: number

  // 工具调用指标
  toolcallstotal: number
  toolcallssuccess: number
  toolcallsfailed: number
  toolcalldurationms: map<string, number[]>  // 按工具名记录最近 100 次耗时

  // 连接池指标
  poolsize: number
  poolinuse: number
  poolevictions: number
}
```

### 6. mcplogevent

结构化日志事件。

```typescript
interface mcplogevent {
  timestamp: string           // iso 8601 格式
  level: 'debug' | 'info' | 'warn' | 'error'
  component: 'mcp'
  event: string               // 事件类型
  serverurl?: string          // 服务器地址（脱敏）
  toolname?: string           // 工具名称
  durationms?: number         // 耗时（毫秒）
  error?: string              // 错误消息
  poolstats?: poolstats       // 连接池状态快照
}
```

---

## 状态转换

### 连接池状态机

```
          ┌                                  ┌
          │ acquire                         │ release
    ┌───┐ ─────────┐    ┌───┐ ───────────────┐
    │ idle │              │ ←──→ │ in use │ ←──→│
    └───┘ ───────────────┘         └───────┘
          │                                        │
          │ cleanup (idle > 60s)                 │
          ▼                                        ▼
    ┌───┐
    │ evicted │
    └───┘
```

### 错误处理状态机

```
    发生错误
        │
        ▼
    分类错误码
        │
        ├─── network_error / timeout / pool_exhausted
        │                        │
                        │                        ▼
                        │                  标记为可恢复，上层可重试
                        │
                        ├─── auth_failed / tool_not_found / invalid_params
                        │
                        └─── 标记为不可恢复，返回错误
```

---

## 配置参数

| 参数 | 默认值 | 存储位置 | 说明 |
|------|--------|----------|------|
| mcp_pool_max_size | 5 | config 表 | 最大连接数 |
| mcp_pool_max_idle_ms | 60000 | config 表 | 最大空闲时间（毫秒） |
| mcp_pool_cleanup_interval_ms | 30000 | config 表 | 清理间隔（毫秒） |
| mcp_timeout_connect_ms | 5000 | config 表 | 连接超时（毫秒） |
| mcp_timeout_tool_default_ms | 15000 | config 表 | 工具调用默认超时（毫秒） |
| mcp_timeout_tool_max_ms | 60000 | config 表 | 工具调用最大超时（毫秒） |
