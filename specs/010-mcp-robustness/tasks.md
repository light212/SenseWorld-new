# Tasks: MCP 健壮性全面改进 (010-mcp-robustness)

**Input**: Design documents from `/specs/010-mcp-robustness/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: 项目暂无自动化测试框架，使用 curl 手动验证。spec.md 未明确要求测试。

**Organization**: Tasks 按 user story 分组，支持独立实现和测试。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 对应 spec.md 中的 User Story (US1, US2, US3, US4, US5)
- 描述中包含确切文件路径

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: 错误分类 + 结构化日志 + 超时控制 -- 所有后续 User Story 的基础设施

**依赖**: 无 -- 可立即开始

**Independent Test**:
1. 创建 MCPError 实例，验证 code/recoverable 属性正确
2. 调用 MCPLogger.info()，验证控制台输出为 JSON 格式
3. 连接不存在的 MCP Server，验证抛出 NETWORK_ERROR 类型的 MCPError

- [x] T001 [US4] Create MCPErrorCode enum and MCPError class in `lib/mcp/error.ts`
- [x] T002 [P] [US5] Create MCPLogger structured logging module in `lib/mcp/logger.ts`
- [x] T003 [US3] Enhance `lib/mcp/http-client.ts` with MCPError, MCPLogger, and configurable timeouts (connect=5s, listTools=10s, callTool default=15s max=60s, read from getConfig())

**Checkpoint**: MCPError 可分类抛出，MCPLogger 输出 JSON 日志，http-client 支持细粒度超时

---

## Phase 2: User Story 2 - Connection Pool (Priority: P1)

**Goal**: 单例连接池管理 MCP 连接生命周期，支持 acquire/release 复用，自动清理空闲连接

**Independent Test**:
1. 连续调用 acquire() 两次（相同 serverUrl），验证第二次复用已有连接
2. 并发 5 个 acquire()，验证池大小不超过 maxPoolSize
3. 等待空闲连接超时，验证连接被自动断开

**FR Coverage**: FR-004, FR-005, FR-006, FR-007

- [x] T004 [US2] Create MCPConnectionPool singleton in `lib/mcp/pool.ts` -- PoolEntry/PoolStats interfaces, acquire/release/stats/destroy methods, maxPoolSize=5, maxIdleTimeMs=60000, auto-cleanup every 30s, log events via MCPLogger, throw MCPError(CONNECTION_POOL_EXHAUSTED) when full
- [x] T005 [US2] Update `lib/mcp/factory.ts` to integrate connection pool -- replace direct HttpMCPClient creation with pool.acquire(), export releaseClient() for callers
- [x] T006 [US2] Update `app/api/chat/route.ts` to use pool acquire/release pattern -- wrap MCP tool call section in try/finally with pool.release() in finally, do NOT change existing tool call logic

**Checkpoint**: 连接池可复用连接，chat 路由使用池获取/释放连接，空闲连接自动清理

---

## Phase 3: User Story 1 - Metrics API (Priority: P1)

**Goal**: 提供 MCP 运行时指标 API，支持 JSON 和 Prometheus 两种格式输出

**Independent Test**:
1. `curl -H "Cookie: admin_token=xxx" http://localhost:3000/api/admin/mcp/metrics` -- 返回 JSON
2. `curl -H "Accept: text/plain" -H "Cookie: admin_token=xxx" http://localhost:3000/api/admin/mcp/metrics` -- 返回 Prometheus 格式
3. 多次 chat 请求后查看指标，验证 toolCallsTotal 递增

**FR Coverage**: FR-008, FR-009, FR-010

- [x] T007 [US1] Create MCPMetricsCollector singleton in `lib/mcp/metrics.ts` -- track connections/tools/pool metrics, toJSON() and exportPrometheus() methods, toolCallDurationMs ring buffer (last 100 per tool)
- [x] T008 [US1] Integrate metrics recording into `lib/mcp/pool.ts` and `lib/mcp/http-client.ts` -- pool: record connect/eviction, update pool stats; client: record connect success/failure, callTool with durationMs
- [x] T009 [US1] Create GET endpoint `app/api/admin/mcp/metrics/route.ts` -- check Accept header for JSON (default) vs Prometheus (text/plain), return metrics data per contracts/mcp-metrics-api.md

**Checkpoint**: 指标 API 可返回 JSON 和 Prometheus 格式数据，反映实时连接和调用状态

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: 编译验证和项目状态更新

- [x] T010 Run `pnpm build` and fix any TypeScript compilation errors
- [ ] T011 Update `PLAN.md` -- change 010-mcp-robustness status to completed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies -- start immediately
- **Phase 2 (US2 Pool)**: Depends on Phase 1 (uses MCPError, MCPLogger, enhanced http-client)
- **Phase 3 (US1 Metrics)**: Depends on Phase 2 (collects metrics from pool and client)
- **Phase 4 (Polish)**: Depends on all prior phases

### User Story Dependencies

```
US4 (Error)  --|
US5 (Logger) --|-- Phase 1: Foundational
US3 (Timeout)--|
                |
                v
          US2 (Pool) ------ Phase 2
                |
                v
          US1 (Metrics) ---- Phase 3
```

### Parallel Opportunities

- Phase 1: T001 (error.ts) and T002 (logger.ts) can run in parallel [P]
- Phase 2: T004, T005, T006 must be sequential
- Phase 3: T007 can start independently; T008 depends on T007; T009 depends on T008

---

## Parallel Example: Phase 1

```text
# Launch error and logger modules in parallel:
Task T001: "Create MCPError in lib/mcp/error.ts"
Task T002: "Create MCPLogger in lib/mcp/logger.ts"

# Then apply both to http-client:
Task T003: "Enhance lib/mcp/http-client.ts with MCPError + MCPLogger + timeouts"
```

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2)

1. Complete Phase 1: Error + Logger + Timeout enhancement
2. Complete Phase 2: Connection Pool
3. **STOP and VALIDATE**: Test pool acquire/release with curl to /api/chat
4. Connection reuse and error handling confirmed

### Full Delivery

5. Complete Phase 3: Metrics API
6. Complete Phase 4: Build verification
7. All user stories delivered

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to spec.md user story for traceability
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- Do NOT change existing MCP tool call logic in chat/route.ts -- only connection management
- All new code in `lib/mcp/` directory per Constitution VI
- No new npm dependencies per Constitution VII and spec constraints
