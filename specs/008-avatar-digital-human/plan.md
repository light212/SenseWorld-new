# Implementation Plan: 008-avatar-digital-human

**Branch**: `008-avatar-digital-human` | **Date**: 2025-01-31 | **Spec**: [spec.md](./spec.md)

## Summary

在现有 AI 对话系统上叠加数字人视频回复能力。项目已预留 `AvatarProvider` 接口骨架和工厂类，本期完成接口实现（HeyGen + D-ID）、后端路由、前端视频播放组件，以及后台配置扩展。无需数据库迁移，复用现有 `Config` 键值存储。

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 20  
**Primary Dependencies**: Next.js 14 App Router, Prisma, fetch (原生，无需新增包)  
**Storage**: MySQL via Prisma（Config 表，无 schema 变更）  
**Testing**: 手动集成测试（现有项目无自动化测试框架）  
**Target Platform**: Web (服务端 Node.js + 浏览器客户端)  
**Performance Goals**: 视频在 AI 文字回复后 60 秒内就绪（正常网络 + ≤300 字）  
**Constraints**: 前端轮询最多 30 次 × 2s；视频 URL 来自服务商 CDN，不本地存储  
**Scale/Scope**: 单租户，运营统一配置，所有访客共享同一数字人形象

## Constitution Check

- [x] `/api/health` 不受影响
- [x] 无直接 DB 查询（复用 `getConfig` / `setConfig`）
- [x] 新路由 `/api/avatar` 和 `/api/avatar/status` 遵循现有认证模式（`validateToken`）
- [x] 无需数据库迁移
- [x] `supportsTTS` 在 Avatar 开启时返回 false，符合 spec 假设

## Project Structure

### Documentation (this feature)

```text
specs/008-avatar-digital-human/
├── plan.md           ✅ 本文件
├── spec.md           ✅
├── research.md       ✅
├── data-model.md     ✅
├── quickstart.md     ✅
├── contracts/
│   └── avatar-api.md ✅
└── tasks.md          （/speckit.tasks 生成）
```

### Code Changes

```text
lib/avatar/
├── types.ts              更新接口
├── factory.ts            注册 heygen / did
├── heygen-provider.ts    新建
└── did-provider.ts       新建

app/api/
├── avatar/route.ts              新建
├── avatar/status/route.ts       新建
└── capabilities/route.ts        更新

lib/types/chat.ts                更新 CapabilityFlags
components/admin/ConfigForm.tsx  更新配置字段
components/chat/avatar-player.tsx 新建
app/(chat)/page.tsx              接入 Avatar
```

## Phase 0 — Research ✅

完成。见 [research.md](./research.md)。

**关键结论**：
- 使用 HeyGen Video Generation API（非实时）和 D-ID Talks API
- 视频生成异步，前端轮询 `/api/avatar/status`
- 无需新增 npm 包，无需数据库迁移
- `generateVideo` → 拆分为 `submitVideo` + `getVideoStatus`

## Phase 1 — Design ✅

完成。见 [data-model.md](./data-model.md)、[contracts/avatar-api.md](./contracts/avatar-api.md)、[quickstart.md](./quickstart.md)。

## Phase 2 — Tasks

由 `/speckit.tasks` 命令生成，见 `tasks.md`。

### 实现顺序

1. **更新 `lib/avatar/types.ts`** — 替换接口方法签名
2. **新建 `lib/avatar/heygen-provider.ts`** — HeyGen REST 实现
3. **新建 `lib/avatar/did-provider.ts`** — D-ID REST 实现
4. **更新 `lib/avatar/factory.ts`** — 注册两个 Provider
5. **新建 `app/api/avatar/route.ts`** — POST，提交任务
6. **新建 `app/api/avatar/status/route.ts`** — GET，查询状态
7. **更新 `app/api/capabilities/route.ts`** — 新增 supportsAvatar，调整 supportsTTS
8. **更新 `lib/types/chat.ts`** — 新增 supportsAvatar
9. **更新 `components/admin/ConfigForm.tsx`** — 补充 AVATAR_ACTOR_ID / AVATAR_MAX_CHARS
10. **新建 `components/chat/avatar-player.tsx`** — 视频播放 UI 组件
11. **更新 `app/(chat)/page.tsx`** — 接入 Avatar 能力

### 依赖关系

```
步骤 1 → 2, 3
步骤 2, 3 → 4
步骤 4 → 5, 6
步骤 5, 6, 7, 8 → 11
步骤 9 独立
步骤 10 → 11
```

## 风险与缓解

| 风险 | 可能性 | 缓解措施 |
|------|--------|----------|
| HeyGen/D-ID 生成耗时超 60s | 低-中 | 前端显示加载状态，超时后降级提示，不阻塞对话 |
| 服务商 API 变更 | 低 | Provider 封装隔离，变更只影响单个文件 |
| 移动端视频自动播放被拦截 | 高 | `muted + autoPlay + playsInline`，提供取消静音按钮 |
| 并发消息导致视频乱序 | 中 | 新消息发送时取消前一次轮询，以最新 jobId 为准 |
