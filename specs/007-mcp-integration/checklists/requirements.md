# Requirements Quality Checklist: MCP Server 集成（007）

**Purpose**: 验证 spec.md 中需求的完整性、清晰度、一致性和可测量性
**Created**: 2025-07-21
**Feature**: [spec.md](../spec.md)

---

## Requirement Completeness（需求完整性）

- [ ] CHK001 - spec 是否定义了 MCP 查询的具体 HTTP 方法和请求体格式（如 `POST { query: string }`）？目前仅在 Assumptions 中提及，未作为正式需求。[Completeness, Gap]
- [ ] CHK002 - MCP Server 的响应体结构（如 `{ result: string }`）是否在 FR 中明确定义，而非仅作为假设？[Completeness, Spec §Assumptions]
- [ ] CHK003 - FR-002 规定注入 system message，但未定义注入位置（历史消息之前/之后？system prompt 之前/之后？）是否需要补充？[Completeness, Spec §FR-002]
- [ ] CHK004 - 是否定义了 MCP 查询的认证/鉴权需求（MCP Server 是否需要 API Key 或其他凭证）？[Completeness, Gap]
- [ ] CHK005 - 是否定义了 MCPFactory 的接口（类似 LLMFactory/SpeechFactory），或仅需要 MCPClient 实现？[Completeness, Gap]
- [ ] CHK006 - 后台配置页「测试连接」按钮的 UI 位置和触发方式是否有需求说明（在哪个字段旁边、按钮文案）？[Completeness, Spec §US2]
- [ ] CHK007 - 是否定义了管理员 session 认证失败时 `POST /api/admin/mcp/test` 的响应格式（目前 FR-006 仅提到需认证，未定义 401 响应结构）？[Completeness, Spec §FR-006]

---

## Requirement Clarity（需求清晰度）

- [ ] CHK008 - FR-008 中「2000 字符」是字节、字符还是 token？不同度量对 LLM 的影响差异显著，是否需要明确单位？[Clarity, Spec §FR-008]
- [ ] CHK009 - FR-002「注入到 LLM 上下文的最前面」中「最前面」是否指 messages 数组第一条，还是 system prompt 的开头？[Clarity, Spec §FR-002]
- [ ] CHK010 - US1 中「AI 回复包含知识库相关信息」是否可被客观验证？该 SC-001 的验收方式是否足够具体？[Clarity, Spec §SC-001]
- [ ] CHK011 - FR-003「静默降级」是否包含内部日志记录？spec 未明确 MCP 失败是否需要写服务器日志。[Clarity, Spec §FR-003]
- [ ] CHK012 - `MCP_SERVER_URL` 配置键名是否已确定（spec 同时出现 `MCP_SERVER_URL`，需确认大小写和下划线规范与现有 Config 表一致）？[Clarity, Spec §Key Entities]

---

## Requirement Consistency（需求一致性）

- [ ] CHK013 - FR-007（5 秒超时）与 SC-003（测试连接 5 秒内返回结果）使用同一超时值，是否有意为之？若测试连接也经过相同 MCPClient，两者一致；否则需分别定义。[Consistency, Spec §FR-007, §SC-003]
- [ ] CHK014 - Assumptions 中「无新 npm 依赖」与「`@modelcontextprotocol/sdk` 待 research 确认」是否存在潜在冲突？若 SDK 未安装且必须安装，该假设将失效。[Consistency, Spec §Assumptions]
- [ ] CHK015 - FR-004 要求实现 `lib/mcp/types.ts` 的 `MCPClient` 接口，但接口中有 `connect()` / `disconnect()` 方法，而 FR-001 描述的是单次 HTTP 查询——长连接与无状态 HTTP 模型是否一致？[Consistency, Spec §FR-001, §FR-004]

---

## Acceptance Criteria Quality（验收标准质量）

- [ ] CHK016 - SC-001「AI 回复可引用知识库内容」能否被客观验证？是否需要定义具体的测试 query 和预期 keyword？[Measurability, Spec §SC-001]
- [ ] CHK017 - SC-004「无显著差异」是否需要量化（如「额外延迟 < 100ms」）？[Measurability, Spec §SC-004]
- [ ] CHK018 - US2 验收场景 1「约 2-5 秒后显示连接成功」与 FR-007「5 秒超时」是否对齐？成功连接的响应时间上限应与超时值一致。[Measurability, Consistency, Spec §US2, §FR-007]

---

## Scenario Coverage（场景覆盖）

- [ ] CHK019 - 是否定义了 MCP Server 返回 HTTP 2xx 但响应体格式不符预期时的处理需求？[Coverage, Exception Flow, Gap]
- [ ] CHK020 - 是否定义了并发请求场景下 MCPClient 的行为（是否需要连接池或单例）？[Coverage, Gap]
- [ ] CHK021 - 是否定义了 MCP Server 地址变更后（运营修改配置）下一次请求的生效时机？[Coverage, Gap]
- [ ] CHK022 - 是否定义了「测试连接」按钮的 loading / disabled 状态需求，防止重复点击？[Coverage, Spec §US2]

---

## Edge Case Coverage（边界条件覆盖）

- [ ] CHK023 - Edge Cases 中「截断至 2000 字符」后注入的内容是否需要附加截断说明（如「…[内容已截断]」）告知 LLM？spec 未定义截断后的格式。[Edge Case, Gap]
- [ ] CHK024 - 是否定义了 MCP Server 返回空字符串（非 null，但 result 为 `""`）时的处理？[Edge Case, Gap]
- [ ] CHK025 - 是否定义了 `MCP_SERVER_URL` 配置值存在但为空字符串时的行为（与「未配置」是否等价）？[Edge Case, Gap]

---

## Non-Functional Requirements（非功能性需求）

- [ ] CHK026 - 是否定义了 MCP 查询对 `/api/chat` 整体响应时间的影响上限（除 SC-004 外，是否有具体的 P95 延迟目标）？[Non-Functional, Gap]
- [ ] CHK027 - 是否定义了安全需求：`MCP_SERVER_URL` 是否需要限制为内网地址，防止 SSRF（Server-Side Request Forgery）攻击？[Non-Functional, Security, Gap]
- [ ] CHK028 - 是否定义了 MCP 查询内容的日志脱敏需求（用户对话内容作为 query 传入 MCP，是否需要避免记录到日志）？[Non-Functional, Security, Gap]

---

## Dependencies & Assumptions（依赖与假设）

- [ ] CHK029 - Assumptions 中「MCP Server 提供 HTTP API」是否已与 MCP Server 维护方确认，还是仅为推测？[Assumption, Spec §Assumptions]
- [ ] CHK030 - 「本期不实现 Tool Call」的范围限制是否已与产品/技术负责人对齐并记录在案？[Assumption, Scope]
- [ ] CHK031 - 现有 `lib/mcp/types.ts` 中 `MCPClient` 接口是否与本 spec 的 FR（HTTP 查询）兼容，还是需要修改接口？[Dependency, Spec §FR-004]

---

## Notes

- `[x]` 标记已通过项
- 发现问题时在 item 后添加备注
- CHK015 和 CHK031 关联度高，建议优先确认接口设计
- CHK027（SSRF）为安全风险项，建议在 plan 阶段明确处理方式
