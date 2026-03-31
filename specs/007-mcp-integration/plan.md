# Implementation Plan: MCP Server 集成（007）

**Branch**: `007-mcp-integration` | **Date**: 2025-07-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-mcp-integration/spec.md`

## Summary

实现 MCP Server 知识库集成：`POST /api/chat` 在调用 LLM 前向 MCP Server 查询并注入 system context；后台新增「测试连接」按钮（`POST /api/admin/mcp/test`）。使用原生 fetch，无新 npm 依赖，无新 DB 表。

## Technical Context

**Language/Version**: TypeScript 5, Next.js 14 App Router
**Primary Dependencies**: React 18, Tailwind CSS（已有）；无新依赖
**Storage**: MySQL via Prisma（复用 Config 表，键：`MCP_SERVER_URL`）
**Testing**: 手动验证
**Target Platform**: Node.js 20 LTS，现代浏览器（管理后台）
**Project Type**: Web App（Next.js full-stack）
**Performance Goals**: MCP 查询超时 5 秒，超时后静默降级
**Constraints**: 无新 npm 依赖，无新 DB 表，失败不影响对话
**Scale/Scope**: 单 MCP Server 配置，运营管理员配置

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Provider-Plugin Architecture**: ✓ `MCPClient` 实现 `lib/mcp/types.ts` 接口
- **Operator-Configurable Runtime**: ✓ `MCP_SERVER_URL` 存入 Config 表，无需重启
- **No new npm packages**: ✓ 使用原生 fetch，不安装新依赖
- **No new DB tables**: ✓ 复用 Config 表
- **Security-First**: ✓ URL 协议白名单（http/https only）防 SSRF
- **pnpm only**: ✓ 无安装命令

## Project Structure

### Documentation (this feature)

```text
specs/007-mcp-integration/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-mcp-test.md
│   └── mcp-client-interface.md
└── tasks.md             # /speckit.tasks 生成
```

### Source Code (repository root)

```text
lib/
└── mcp/
    ├── types.ts          # EXISTING: MCPClient 接口
    ├── http-client.ts    # NEW: HttpMCPClient 实现
    └── factory.ts        # NEW: MCPClientFactory
app/
├── api/
│   ├── chat/
│   │   └── route.ts      # MODIFY: 步骤7-8之间注入 MCP context
│   └── admin/
│       └── mcp/
│           └── test/
│               └── route.ts  # NEW: POST /api/admin/mcp/test
components/
└── admin/
    └── McpTestButton.tsx # NEW: 测试连接按钮组件
```

**Structure Decision**: Next.js App Router，沿用现有 lib/mcp/ 目录。新增 2 个 lib 文件 + 1 个 API 路由 + 1 个 React 组件 + 修改 chat route。无新 npm 依赖，无新 DB 表。

## Complexity Tracking

> 无 Constitution 违规。本 feature 仅在现有架构上新增轻量 HTTP 客户端和一个后台按钮，复杂度极低。

## Feature Requirements (from spec)

- **FR-001**: `POST /api/chat` 若 `MCP_SERVER_URL` 已配置，调用 LLM 前先查询 MCP
- **FR-002**: MCP 结果追加到 systemPrompt，作为 system message 注入
- **FR-003**: MCP 失败静默降级
- **FR-004**: `HttpMCPClient` 实现 `MCPClient` 接口
- **FR-005**: 后台配置页新增「测试连接」按钮
- **FR-006**: `POST /api/admin/mcp/test` → `{ success, message }`，需管理员 session
- **FR-007**: MCP 查询超时 5 秒
- **FR-008**: 注入内容截断至 2000 字符

## Success Criteria

- **SC-001**: 配置有效 MCP Server 后 AI 回复可引用知识库内容
- **SC-002**: MCP 不可用时对话正常，用户无感知
- **SC-003**: 「测试连接」5 秒内返回明确结果
- **SC-004**: 未配置时 `/api/chat` 无额外延迟

## Assumptions

- MCP Server 提供 HTTP POST API，接受 `{ query: string }` 返回 `{ result: string }` 或 `{ content: string }`
- 管理员 session 认证已由现有 `/admin` 路由处理，`/api/admin/mcp/test` 复用同一机制
- 本期不实现 Tool Call，仅 RAG 式注入
