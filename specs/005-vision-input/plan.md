# Implementation Plan: 005-vision-input

**Branch**: `005-vision-input` | **Date**: 2025-07-21 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/005-vision-input/spec.md`

## Summary

为 SenseWorld 添加摄像头截帧与 Vision AI 能力：前端 `CameraCapture` 组件通过 `getUserMedia` 获取摄像头流，发送消息时截帧压缩（≤512px JPEG），以纯 base64 附加到 `/api/chat` 请求的 `images[]` 字段；后端扩展 `AnthropicProvider` 和 `OpenAIProvider` 将图片转换为各 SDK 的 Vision 格式；通过 `supportsVision` 标志控制降级。

## Technical Context

**Language/Version**: TypeScript 5, Node.js 20 LTS  
**Primary Dependencies**: Next.js 14 App Router, React 18, Anthropic SDK, OpenAI SDK  
**Storage**: N/A（图片不持久化）  
**Testing**: 手动验证（`/app/test-vision/page.tsx` 临时测试页面）  
**Target Platform**: 现代浏览器（Chrome/Safari/Firefox 最新版）  
**Project Type**: Web service (Next.js full-stack)  
**Performance Goals**: 截帧操作 < 100ms；base64 ≤ 200KB  
**Constraints**: 长边 ≤ 512px；JPEG quality 0.8（超出重试 0.6）；图片不存数据库  
**Scale/Scope**: 单用户对话场景；每次发消息最多附加 1 张图

## Constitution Check

| 规则 | 状态 | 说明 |
|------|------|------|
| pnpm only（禁止 npm/yarn） | PASS | 不新增依赖，使用现有 SDK |
| Next.js 14 App Router | PASS | 新增 `app/test-vision/page.tsx` 遵循 App Router |
| Prisma 5 ORM | PASS | 不新增表，不写裸 SQL |
| `/api/health` 不影响 | PASS | 本 feature 不触碰 health 路由 |
| Node.js 20 LTS | PASS | 无 runtime 切换 |

**Gate**: PASS — 无宪法违反。

## Project Structure

### Documentation (this feature)

```text
specs/005-vision-input/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出
├── quickstart.md        # Phase 1 输出
├── contracts/
│   ├── chat-api.md                  # /api/chat 扩展合约
│   └── camera-capture-component.md  # CameraCapture 组件合约
└── tasks.md             # Phase 2 输出（由 /speckit.tasks 生成）
```

### Source Code (repository root)

```text
components/
└── camera-capture.tsx        # 新增：摄像头组件

app/
├── test-vision/
│   └── page.tsx              # 新增：独立测试页面
└── api/
    └── chat/
        └── route.ts          # 修改：解析 images[] 字段

lib/
└── ai/
    ├── types.ts              # 修改：ChatMessage.imageBase64?
    ├── anthropic-provider.ts # 修改：Vision content block
    └── openai-provider.ts    # 修改：Vision image_url + supportsVision=true
```

## Phase 0: Research

详见 [research.md](./research.md)。所有技术决策已确定，无 NEEDS CLARIFICATION 项。

关键决策摘要：
- getUserMedia + Canvas toDataURL（同步，无竞态）
- 长边 ≤ 512px，JPEG quality=0.8，超 200KB 降至 0.6 重试
- Anthropic：`content` 数组含 `image` block + `text` block
- OpenAI：`content` 数组含 `image_url`（data URI）+ `text` block，`detail: "low"`
- 历史消息中 `imageBase64` 不传给 AI
- `supportsVision` 改为 `true`（两个 provider 均支持）

## Phase 1: Design & Contracts

详见：
- [data-model.md](./data-model.md) — 接口变更（无新建表）
- [contracts/chat-api.md](./contracts/chat-api.md) — `/api/chat` 扩展
- [contracts/camera-capture-component.md](./contracts/camera-capture-component.md) — 组件接口
- [quickstart.md](./quickstart.md) — 本地验证步骤

## Phase 2: Tasks

由 `/speckit.tasks` 命令生成 → `specs/005-vision-input/tasks.md`
