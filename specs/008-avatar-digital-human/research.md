# Research: 008-avatar-digital-human

## 现有代码骨架分析

项目在 Feature 007 阶段已预留了完整的 Avatar 接口骨架：

### `lib/avatar/types.ts`
```ts
export interface AvatarProvider {
  generateVideo(text: string, audioUrl?: string): Promise<string>
  getStatus(jobId: string): Promise<'pending' | 'processing' | 'done' | 'failed'>
}
```

### `lib/avatar/factory.ts`
- `AvatarFactory.create(provider, apiKey)` 骨架已存在，case 注释已预留 heygen / did
- 需要取消注释并实现对应 Provider 类

### `components/admin/ConfigForm.tsx`
- `AVATAR_PROVIDER` 和 `AVATAR_API_KEY` 字段已在表单中，标注「预留」
- 需补充：Avatar 形象 ID（`AVATAR_ACTOR_ID`）、文本长度上限（`AVATAR_MAX_CHARS`）两个字段
- 去掉「预留」标注

### `app/api/capabilities/route.ts`
- 返回 `{ supportsSTT, supportsTTS, supportsVision }`
- 需新增 `supportsAvatar: boolean`
- 根据 spec 假设：`AVATAR_PROVIDER` 已配置时 `supportsTTS` 应返回 `false`

### `app/(chat)/page.tsx`
- 已有 `capabilities` state，根据 flag 条件渲染 Camera、VoiceRecorder
- 需新增 Avatar 视频播放区域，条件：`capabilities.supportsAvatar`

### `lib/types/chat.ts`
- `CapabilityFlags` 需新增 `supportsAvatar: boolean`

### Prisma schema
- 无需新增表：`Config` 表通用存储所有配置键值对，Avatar 配置复用现有机制

---

## HeyGen Streaming Avatar API 分析

### 两种模式
| 模式 | 说明 | 适用场景 |
|------|------|----------|
| Video Generation (非实时) | 提交文本 → 轮询/Webhook → 取得 MP4 URL | 本期实现 |
| Streaming Avatar (WebRTC) | 实时流式，需 WebRTC SDK | 超出本期范围 |

### Video Generation 流程
1. `POST https://api.heygen.com/v2/video/generate` → 返回 `video_id`
2. `GET https://api.heygen.com/v1/video_status.get?video_id=<id>` → 轮询状态
3. 状态 `completed` 时响应包含 `video_url`（CDN MP4 链接）

### 关键请求结构
```json
{
  "video_inputs": [{
    "character": {
      "type": "avatar",
      "avatar_id": "<AVATAR_ACTOR_ID>",
      "avatar_style": "normal"
    },
    "voice": {
      "type": "text",
      "input_text": "<text>",
      "voice_id": "<optional voice_id>"
    }
  }],
  "dimension": { "width": 1280, "height": 720 }
}
```

### 认证
`X-Api-Key: <HEYGEN_API_KEY>` header

### 典型生成时间
- ≤100 字：10-20 秒
- ≤300 字：20-40 秒

### 错误码
| Code | 含义 |
|------|------|
| 401 | API Key 无效 |
| 429 | 配额超限 |
| 500 | 服务内部错误 |

---

## D-ID API 分析

### Talk 流程
1. `POST https://api.d-id.com/talks` → 返回 `id`
2. `GET https://api.d-id.com/talks/<id>` → 轮询 `status`
3. 状态 `done` 时响应包含 `result_url`（MP4）

### 关键请求结构
```json
{
  "source_url": "<avatar_image_or_presenter_url>",
  "script": {
    "type": "text",
    "input": "<text>"
  }
}
```

### 认证
`Authorization: Basic <base64(api_key:)>` header

### 说明
- `source_url` 可以是公开图片 URL（人脸图），也可以是 D-ID 平台预设的 presenter ID
- `AVATAR_ACTOR_ID` 在 D-ID 中存储 source_url 或 presenter ID

---

## 架构决策

### ADR-1: 视频生成模式选择非实时 (Poll)
**决策**：使用 Poll 模式（非 WebRTC 实时流）  
**理由**：
- WebRTC 实时流需浏览器 SDK、信令服务器，复杂度高
- 非实时 MP4 URL 可直接用 `<video>` 标签播放，前端无额外依赖
- 本期 spec 未要求实时，生成时间 10-40 秒在用户可接受范围内（文字先行展示）

### ADR-2: 轮询在后端进行
**决策**：`/api/avatar` 路由负责提交任务 + 轮询状态，完成后返回 video URL  
**理由**：
- 前端无需持有服务商 API Key
- 轮询逻辑统一在服务端，前端只发一次请求等响应（或前端轮询 `/api/avatar/status`）
- 选择**前端轮询** `/api/avatar/status/:jobId`，避免服务端长连接占用 Vercel 函数超时

### ADR-3: AvatarProvider 接口调整
**决策**：在现有接口基础上，`generateVideo()` 返回 `{ jobId: string }` 而非直接返回 URL，新增 `getVideoUrl(jobId)` 返回最终 URL  
**理由**：HeyGen/D-ID 均为异步任务，URL 在任务完成前不可用；分离提交与查询更符合异步模式  
**实现**：更新 `lib/avatar/types.ts`

### ADR-4: 音频处理
**决策**：数字人功能开启时，`/api/capabilities` 返回 `supportsTTS: false`，禁用 TTS  
**理由**：数字人视频内置音频，与 TTS 同时播放会产生双重声音  
**实现**：在 capabilities route 中检查 `AVATAR_PROVIDER` 配置

### ADR-5: 文本截断在后端
**决策**：`/api/avatar` 路由在调用 Provider 前截断文本，前端不感知  
**配置键**：`AVATAR_MAX_CHARS`，默认 300

---

## 依赖分析

- 无需新增 npm 包（HeyGen/D-ID 均为纯 REST API，用 `fetch` 即可）
- 无需新增 Prisma Model（Config 表复用）
- 无需数据库迁移
