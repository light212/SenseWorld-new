# Implementation Plan: MCP 健壮性全面改进

**Branch**: `010-mcp-robustness` | **Date**: 2025-04-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-mcp-robustness/spec.md`

## Summary

增强现有 MCP 客户端实现（`lib/mcp/http-client.ts`）的生产健壮性，通过添加错误分类体系（`MCPError`）、连接池管理（`MCPConnectionPool`）、结构化日志（`MCPLogger`）、细粒度超时控制和监控指标收集（`MCPMetricsCollector`），使系统能在高并发和异常场景下稳定运行。技术方案基于单例连接池模式，在现有 `@modelcontextprotocol/sdk` 之上封装，不引入新依赖。

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS
**Primary Dependencies**: Next.js 14 App Router, `@modelcontextprotocol/sdk` v1.29.0（现有）, Prisma 5.x
**Storage**: MySQL 8.0 via Prisma -- Config 表存储超时/连接池参数（新增 key-value 条目），无新增表
**Testing**: 手动测试 + curl 验证（项目暂无自动化测试框架）
**Target Platform**: Linux server (Docker Compose)
**Project Type**: Web service（Next.js API Routes）
**Performance Goals**: 连接复用率 >= 80%（10 并发），指标 API < 50ms 响应
**Constraints**: 无新增 npm 依赖，不改变 MCP 协议层，指标收集性能影响 < 1%
**Scale/Scope**: 单 MCP Server 场景，连接池最大 5 连接

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Provider-Plugin Architecture | PASS | MCP 遵循 `MCPClient` 接口，增强不改变接口签名 |
| II. Operator-Configurable Runtime | PASS | 超时/连接池参数存 Config 表，运营可调 |
| III. No Emoji Policy | PASS | 所有文档和代码无 emoji |
| IV. Spec-Driven Development | PASS | spec.md 已批准，当前执行 plan 阶段 |
| V. Security-First Secrets Handling | PASS | API Key 从 Config 表读取，不硬编码 |
| VI. Directory Structure Consistency | PASS | 所有代码在 `lib/mcp/` 目录下 |
| VII. Package Manager Uniformity | PASS | 无新增依赖，使用 pnpm |

## Project Structure

### Documentation (this feature)

```text
specs/010-mcp-robustness/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── mcp-metrics-api.md
└── tasks.md             # Phase 2 output (speckit.tasks)
```

### Source Code (repository root)

```text
lib/mcp/
├── types.ts              # 现有 -- MCPClient 接口、MCPTool、MCPToolResult
├── http-client.ts        # 现有 -- HttpMCPClient 实现（将增强超时和错误处理）
├── factory.ts            # 现有 -- MCPClientFactory（将集成连接池）
├── error.ts              # 新增 -- MCPError 错误类 + MCPErrorCode 枚举
├── logger.ts             # 新增 -- MCPLogger 结构化日志模块
├── pool.ts               # 新增 -- MCPConnectionPool 连接池
└── metrics.ts            # 新增 -- MCPMetricsCollector 指标收集器

app/api/admin/mcp/
├── test/route.ts         # 现有 -- 测试连接（将集成错误分类）
└── metrics/route.ts      # 新增 -- 监控指标 API 端点

app/api/chat/route.ts     # 现有 -- 将改用连接池获取 MCP 连接
```

**Structure Decision**: 单项目结构，所有 MCP 增强代码放在 `lib/mcp/` 目录下，遵循 Constitution VI。新增 1 个 API 路由 `app/api/admin/mcp/metrics/route.ts`。

## Implementation Phases

### Phase 1: 核心增强（FR-001, FR-002, FR-003）

**新建文件**:
- `lib/mcp/error.ts` -- `MCPErrorCode` 枚举 + `MCPError` 类，支持可恢复性判断
- `lib/mcp/logger.ts` -- `MCPLogger` 模块，输出 JSON 格式结构化日志

**修改文件**:
- `lib/mcp/http-client.ts` -- 用 `MCPError` 替换裸 `Error`，超时配置改为可配置（连接 5s、listTools 10s、callTool 默认 15s 最大 60s），集成 `MCPLogger`

### Phase 2: 连接池（FR-004, FR-005, FR-006, FR-007）

**新建文件**:
- `lib/mcp/pool.ts` -- `MCPConnectionPool` 单例类（maxPoolSize=5, maxIdleTimeMs=60000）

**修改文件**:
- `lib/mcp/factory.ts` -- 集成连接池，`create()` 改为从池获取连接
- `app/api/chat/route.ts` -- MCP 工具调用改用连接池 acquire/release 模式

### Phase 3: 监控指标（FR-008, FR-009, FR-010）

**新建文件**:
- `lib/mcp/metrics.ts` -- `MCPMetricsCollector` 单例，记录连接/调用指标，支持 JSON 和 Prometheus 导出
- `app/api/admin/mcp/metrics/route.ts` -- GET 端点，按 Accept header 返回 JSON 或 Prometheus 格式

**修改文件**:
- `lib/mcp/pool.ts` -- 连接池操作时记录指标
- `lib/mcp/http-client.ts` -- 工具调用时记录指标

## Complexity Tracking

无 Constitution 违规需要追踪。
