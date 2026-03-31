# API Contracts: 008-avatar-digital-human

## POST /api/avatar

提交数字人视频生成任务。

### 认证
查询参数 `token=<访客token>`，复用现有 `validateToken()` 机制。

### 请求
```http
POST /api/avatar?token=<token>
Content-Type: application/json

{
  "text": "AI 回复的完整文字内容"
}
```

### 响应 200
```json
{
  "jobId": "<服务商返回的任务ID>"
}
```

### 响应 400
```json
{ "error": "text is required" }
```

### 响应 401
```json
{ "error": "unauthorized" }
```

### 响应 503
```json
{ "error": "avatar service unavailable" }
```
服务商未配置或调用失败时返回。

### 行为说明
- 后端从 `Config` 读取 `AVATAR_PROVIDER`、`AVATAR_API_KEY`、`AVATAR_ACTOR_ID`、`AVATAR_MAX_CHARS`
- 若 `AVATAR_PROVIDER` 为空，返回 503
- 截断 `text` 至 `AVATAR_MAX_CHARS`（默认 300）字符后再提交给服务商
- 调用 `AvatarFactory.create(provider, apiKey).submitVideo(truncatedText)`
- 返回 `jobId`，不等待视频生成完成

---

## GET /api/avatar/status

查询视频生成状态。

### 认证
查询参数 `token=<访客token>`

### 请求
```http
GET /api/avatar/status?jobId=<jobId>&token=<token>
```

### 响应 200 — 生成中
```json
{
  "status": "pending"
}
```
或
```json
{
  "status": "processing"
}
```

### 响应 200 — 完成
```json
{
  "status": "done",
  "videoUrl": "https://cdn.heygen.com/videos/xxx.mp4"
}
```

### 响应 200 — 失败
```json
{
  "status": "failed"
}
```

### 响应 400
```json
{ "error": "jobId is required" }
```

### 响应 401
```json
{ "error": "unauthorized" }
```

### 行为说明
- 后端调用 `AvatarFactory.create(provider, apiKey).getVideoStatus(jobId)`
- 原样透传服务商状态，不做缓存

---

## GET /api/capabilities（更新）

### 响应变更
在现有响应基础上新增 `supportsAvatar` 字段：

```json
{
  "supportsSTT": true,
  "supportsTTS": false,
  "supportsVision": true,
  "supportsAvatar": true
}
```

### 逻辑说明
- `supportsAvatar`: `AVATAR_PROVIDER` 已配置且非空
- `supportsTTS`: 若 `supportsAvatar === true`，则强制返回 `false`（避免 TTS 与数字人音频叠加）

---

## AvatarProvider 接口契约

```ts
// lib/avatar/types.ts
export interface AvatarProvider {
  submitVideo(text: string): Promise<string>  // 返回 jobId
  getVideoStatus(jobId: string): Promise<{
    status: 'pending' | 'processing' | 'done' | 'failed'
    videoUrl?: string
  }>
}
```

## HeyGenProvider 实现要点

```ts
// lib/avatar/heygen-provider.ts
class HeyGenProvider implements AvatarProvider {
  // submitVideo:
  //   POST https://api.heygen.com/v2/video/generate
  //   Header: X-Api-Key: <apiKey>
  //   Body: { video_inputs: [{ character: { type:'avatar', avatar_id: actorId }, voice: { type:'text', input_text: text } }], dimension: { width:1280, height:720 } }
  //   Returns: response.data.video_id

  // getVideoStatus:
  //   GET https://api.heygen.com/v1/video_status.get?video_id=<jobId>
  //   Header: X-Api-Key: <apiKey>
  //   Maps: status 'completed' → 'done', 'failed' → 'failed', 'processing'/'pending' → respective
  //   Returns: { status, videoUrl: data.video_url }
}
```

## DIDProvider 实现要点

```ts
// lib/avatar/did-provider.ts
class DIDProvider implements AvatarProvider {
  // submitVideo:
  //   POST https://api.d-id.com/talks
  //   Header: Authorization: Basic <base64(apiKey:)>
  //   Body: { source_url: actorId, script: { type:'text', input: text } }
  //   Returns: response.id

  // getVideoStatus:
  //   GET https://api.d-id.com/talks/<jobId>
  //   Header: Authorization: Basic <base64(apiKey:)>
  //   Maps: status 'done' → 'done', 'error' → 'failed', others → 'processing'
  //   Returns: { status, videoUrl: result_url }
}
```

## 前端轮询契约

```ts
// app/(chat)/page.tsx 中的轮询逻辑
// 使用 ref 持有取消标志，发送新消息时置 true 终止旧轮询
const avatarPollCancelRef = useRef(false)

async function pollAvatarStatus(jobId: string) {
  avatarPollCancelRef.current = false  // 重置取消标志
  const INTERVAL = 2000  // 2 秒轮询一次
  const MAX_ATTEMPTS = 30  // 最多 60 秒
  let attempts = 0
  while (attempts < MAX_ATTEMPTS) {
    if (avatarPollCancelRef.current) return  // 已被新消息取消
    const res = await fetch(`/api/avatar/status?jobId=${jobId}&token=${token}`)
    const data = await res.json()
    if (data.status === 'done') {
      setAvatarVideoUrl(data.videoUrl)
      setAvatarLoading(false)
      return
    }
    if (data.status === 'failed') {
      setAvatarError('数字人暂时不可用')
      setAvatarLoading(false)
      return
    }
    attempts++
    await new Promise(r => setTimeout(r, INTERVAL))
  }
  setAvatarError('数字人生成超时')
  setAvatarLoading(false)
}

// 发送新消息前调用：
avatarPollCancelRef.current = true
setAvatarLoading(false)
setAvatarVideoUrl(null)
```
