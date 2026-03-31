# Data Model: 008-avatar-digital-human

## 数据库变更

**无需新增 Prisma Model**。所有 Avatar 配置通过现有 `Config` 表（键值对）存储。

## 新增配置键

| 键名 | 说明 | 示例值 | 是否敏感 |
|------|------|--------|----------|
| `AVATAR_PROVIDER` | 数字人服务商 | `heygen` / `did` / 空（关闭） | 否 |
| `AVATAR_API_KEY` | 服务商 API Key | `Bearer xxx` | 是 |
| `AVATAR_ACTOR_ID` | 数字人形象 ID | HeyGen: avatar_id；D-ID: source_url 或 presenter_id | 否 |
| `AVATAR_MAX_CHARS` | 单次生成文本上限（字符数） | `300` | 否 |

这些键已由 `lib/config/index.ts` 的 `getConfig` / `setConfig` 机制统一管理，无需额外迁移。

## 类型变更

### `lib/types/chat.ts` — CapabilityFlags

```ts
export interface CapabilityFlags {
  supportsSTT: boolean
  supportsTTS: boolean
  supportsVision: boolean
  supportsAvatar: boolean  // 新增
}
```

### `lib/avatar/types.ts` — AvatarProvider 接口更新

原接口 `generateVideo()` 直接返回 URL 不适合异步任务模型。更新为：

```ts
export interface AvatarProvider {
  /**
   * 提交视频生成任务
   * @returns 任务 ID（用于后续查询状态）
   */
  submitVideo(text: string): Promise<string>

  /**
   * 查询视频生成状态及结果
   * @returns status 为 'done' 时包含 videoUrl
   */
  getVideoStatus(jobId: string): Promise<{
    status: 'pending' | 'processing' | 'done' | 'failed'
    videoUrl?: string
  }>
}
```

> 原 `generateVideo` 和 `getStatus` 方法替换为 `submitVideo` 和 `getVideoStatus`，语义更清晰。

## API 响应结构（新增路由）

### `POST /api/avatar` 请求体
```ts
{
  text: string       // AI 回复文本
  token: string      // 访客 token（query param）
}
```

### `POST /api/avatar` 响应
```ts
{
  jobId: string      // 服务商返回的任务 ID
}
```

### `GET /api/avatar/status?jobId=<id>&token=<token>` 响应
```ts
{
  status: 'pending' | 'processing' | 'done' | 'failed'
  videoUrl?: string  // status === 'done' 时存在
}
```

## 前端状态扩展

`app/(chat)/page.tsx` 新增以下 state：

```ts
const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null)
const [avatarLoading, setAvatarLoading] = useState(false)
const [avatarError, setAvatarError] = useState<string | null>(null)
```
