# Feature Specification: MCP 健壮性全面改进（010）

**Feature ID**: `010-mcp-robustness`
**Feature Branch**: `010-mcp-robustness`
**Created**: 2025-04-02
**Status**: Draft
**Parent Feature**: 007-mcp-integration
**Input**: 增强 MCP 实现的健壮性，支持生产环境稳定运行

---

## 背景与问题

当前 MCP 实现（007-mcp-integration）已具备基本功能，但在生产环境使用中存在以下脆弱点：

| 问题 | 影响 | 严重程度 |
|------|------|----------|
| 超时控制粗糙 | 所有工具调用使用相同超时（15s），简单工具浪费等待时间，复杂工具可能超时 | 中 |
| 缺乏连接池 | 每次请求创建新连接，高并发时资源耗尽 | 高 |
| 错误处理简单 | 无法区分网络错误、超时、认证失败等，难以针对性处理 | 中 |
| 日志不够详细 | 问题排查困难，缺乏结构化日志 | 低 |
| 缺乏可观测性 | 无法监控连接状态、调用成功率等指标 | 中 |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 运维监控 MCP 状态 (Priority: P1)

**角色**: 运维人员

运维人员需要实时监控 MCP 连接状态、工具调用成功率和响应时间，以便及时发现和定位问题。

**Why this priority**: 生产环境可观测性是稳定运行的基础，没有监控就是盲人摸象。

**Independent Test**:
1. 访问后台 `/admin/mcp/metrics` API
2. 验证返回的监控指标数据完整

**Acceptance Scenarios**:

1. **Given** 系统运行中，**When** 调用 `GET /api/admin/mcp/metrics`，**Then** 返回 JSON 格式的监控数据，包含连接数、调用次数、成功率等。
2. **Given** 系统运行中，**When** 调用 `GET /api/admin/mcp/metrics` 并设置 `Accept: text/plain`，**Then** 返回 Prometheus 格式的指标数据。
3. **Given** 多次工具调用后，**When** 查看指标，**Then** 平均响应时间按工具名称分类统计。

---

### User Story 2 - 连接池自动管理 (Priority: P1)

**角色**: 系统

系统自动管理 MCP 连接池，复用空闲连接，避免频繁创建/销毁连接的开销。

**Why this priority**: 连接池是高并发场景下稳定性的关键。

**Independent Test**:
1. 并发发送多个对话请求
2. 验证连接被复用而非每次新建

**Acceptance Scenarios**:

1. **Given** 连接池为空，**When** 第一个请求到达，**Then** 创建新连接并放入池中。
2. **Given** 连接池中有空闲连接，**When** 新请求到达，**Then** 复用现有连接，不创建新连接。
3. **Given** 连接池已满（5个），**When** 所有连接都在使用中，**Then** 等待或清理最旧的空闲连接后创建新连接。
4. **Given** 连接空闲超过 60 秒，**When** 定时清理触发，**Then** 自动断开该连接。

---

### User Story 3 - 细粒度超时控制 (Priority: P2)

**角色**: 开发者

不同类型的 MCP 操作使用不同的超时时间，简单操作快速返回，复杂操作有足够执行时间。

**Why this priority**: 优化用户体验，避免不必要的等待。

**Independent Test**:
1. 调用简单工具，验证 10 秒内返回
2. 调用复杂工具，验证可执行更长时间

**Acceptance Scenarios**:

1. **Given** 工具未声明预期执行时间，**When** 调用工具，**Then** 使用默认超时 15 秒。
2. **Given** 工具声明需要 30 秒，**When** 调用工具，**Then** 超时时间设为 30 秒（最大 60 秒）。
3. **Given** 连接 MCP Server，**When** 5 秒内未响应，**Then** 视为连接超时。

---

### User Story 4 - 错误分类与友好处理 (Priority: P2)

**角色**: 用户/开发者

系统对 MCP 错误进行分类，提供清晰的错误信息，并自动判断是否可恢复。

**Why this priority**: 提升调试效率和用户体验。

**Independent Test**:
1. 模拟不同类型的错误
2. 验证错误分类和消息正确

**Acceptance Scenarios**:

1. **Given** MCP Server 网络不可达，**When** 连接失败，**Then** 返回 `NETWORK_ERROR` 错误码和友好消息。
2. **Given** MCP Server 认证失败，**When** 连接被拒绝，**Then** 返回 `AUTH_FAILED` 错误码。
3. **Given** 工具调用超时，**When** 错误发生，**Then** 返回 `TIMEOUT` 错误码，标记为可恢复。

---

### User Story 5 - 结构化日志记录 (Priority: P3)

**角色**: 运维人员

MCP 相关操作输出结构化 JSON 日志，便于日志聚合和分析。

**Why this priority**: 提升运维效率，但非核心功能。

**Independent Test**:
1. 执行 MCP 操作
2. 验证日志输出为 JSON 格式

**Acceptance Scenarios**:

1. **Given** MCP 连接成功，**When** 查看日志，**Then** 输出包含 `timestamp`、`level`、`component`、`event`、`serverUrl` 等字段。
2. **Given** 工具调用失败，**When** 查看日志，**Then** 输出包含 `error` 字段和错误详情。

---

### Edge Cases

- MCP Server 重启：连接池中的连接失效，下次使用时检测并重建
- 网络抖动：超时后标记为可恢复错误，上层可决定重试
- 连接池耗尽：返回明确错误信息，不阻塞整个系统
- 工具调用返回超大结果：截断至合理大小

---

## Requirements *(mandatory)*

### Functional Requirements

#### 阶段 1：核心增强

- **FR-001**: 系统 MUST 实现 `MCPError` 错误类，支持错误码分类（`NETWORK_ERROR`、`TIMEOUT`、`AUTH_FAILED`、`SERVER_ERROR`、`TOOL_NOT_FOUND`、`INVALID_PARAMS`、`CONNECTION_POOL_EXHAUSTED`）。
- **FR-002**: 系统 MUST 实现结构化日志模块 `MCPLogger`，输出 JSON 格式日志。
- **FR-003**: `http-client.ts` MUST 支持细粒度超时配置（连接 5s、工具列表 10s、工具调用默认 15s 最大 60s）。

#### 阶段 2：连接池

- **FR-004**: 系统 MUST 实现 `MCPConnectionPool` 连接池，最大 5 个连接。
- **FR-005**: 连接池 MUST 支持连接复用，空闲连接优先分配。
- **FR-006**: 连接池 MUST 自动清理空闲超过 60 秒的连接。
- **FR-007**: `/api/chat` MUST 使用连接池获取 MCP 连接，并在请求结束后释放。

#### 阶段 3：监控指标

- **FR-008**: 系统 MUST 实现 `MCPMetricsCollector` 指标收集器。
- **FR-009**: 指标 MUST 包含：连接总数、活跃连接数、失败连接数、工具调用总数、成功数、失败数、平均响应时间。
- **FR-010**: 系统 MUST 提供 `GET /api/admin/mcp/metrics` API，支持 JSON 和 Prometheus 两种格式。

### Non-Functional Requirements

- **NFR-001**: 连接池操作 MUST 线程安全（Node.js 单线程异步场景）。
- **NFR-002**: 日志输出 MUST 不阻塞主线程。
- **NFR-003**: 指标收集 MUST 对性能影响小于 1%。

---

## Key Entities

### MCPError

```typescript
class MCPError extends Error {
  code: MCPErrorCode
  message: string
  cause?: Error
  recoverable: boolean
}
```

### MCPConnectionPool

```typescript
class MCPConnectionPool {
  pool: PoolEntry[]
  maxPoolSize: number        // 5
  maxIdleTimeMs: number      // 60000

  acquire(serverUrl, apiKey): Promise<MCPClient>
  release(client): void
  stats(): PoolStats
  destroy(): void
}
```

### MCPMetricsCollector

```typescript
class MCPMetricsCollector {
  metrics: {
    connectionsTotal: number
    connectionsActive: number
    connectionsFailed: number
    toolCallsTotal: number
    toolCallsSuccess: number
    toolCallsFailed: number
    toolCallDurationMs: Map<string, number[]>
    poolSize: number
    poolInUse: number
    poolEvictions: number
  }

  recordConnect(success): void
  recordToolCall(toolName, durationMs, success): void
  toJSON(): object
  exportPrometheus(): string
}
```

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 并发 10 个请求时，连接复用率达到 80% 以上。
- **SC-002**: 监控指标 API 响应时间小于 50ms。
- **SC-003**: 结构化日志可通过 `jq` 解析。
- **SC-004**: 错误分类准确率达到 95% 以上（通过测试用例验证）。

---

## Assumptions

- MCP Server 由公司内部维护，稳定性由运维保障。
- 本 feature 不改变 MCP 协议层实现，仅增强客户端健壮性。
- 监控指标暂不集成外部 Prometheus，仅提供 API 端点。
- 日志输出到 stdout/stderr，由 Docker/K8s 收集。

---

## Dependencies

- 无新增 npm 依赖
- 依赖现有 `@modelcontextprotocol/sdk` v1.29.0
- 依赖现有 `Config` 表存储 MCP 配置

---

## Risks

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 连接池实现复杂导致 bug | 中 | 高 | 充分测试，灰度发布 |
| 指标收集影响性能 | 低 | 低 | 异步收集，定期采样 |
| 日志量增加 | 中 | 低 | 控制日志级别，生产环境 info |
