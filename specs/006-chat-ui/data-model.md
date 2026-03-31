# Data Model: 006-chat-ui

## 无新增数据库表

本 feature 不新增任何 Prisma schema 表。复用已有：

- `ChatSession`（id, accessTokenId, createdAt）
- `Message`（id, sessionId, role, content, createdAt）
- `Config`（key, value）— 运营配置，只读
- `AccessToken`（id, token, expiresAt）— token 验证，只读

## 前端状态模型（非持久化）

```typescript
// 前端消息显示用（从 API 响应映射）
interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string        // 纯文字，图片不显示在历史中
  createdAt: string      // ISO 8601
  streaming?: boolean    // 当前是否正在流式输出
}

// Provider 能力标志（从 /api/capabilities 读取）
interface CapabilityFlags {
  supportsSTT: boolean
  supportsTTS: boolean
  supportsVision: boolean
}

// 录音状态机
type RecordingState = 'idle' | 'recording' | 'processing'

// 对话页面主状态
interface ChatState {
  sessionId: string | null
  messages: DisplayMessage[]
  capabilities: CapabilityFlags
  inputText: string
  recordingState: RecordingState
  cameraActive: boolean
  loading: boolean        // AI 回复流式中
  error: string | null
}
```

## API 新增端点数据结构

### GET /api/capabilities

**Request**: `?token=<accessToken>`

**Response 200**:
```json
{
  "supportsSTT": true,
  "supportsTTS": true,
  "supportsVision": true
}
```

**Response 401**: `{ "error": "unauthorized" }`

### GET /api/chat

**Request**: `?sessionId=<id>&token=<accessToken>`

**Response 200**:
```json
{
  "sessionId": "clxxxxx",
  "messages": [
    { "id": "msg1", "role": "user", "content": "你好", "createdAt": "2025-07-21T10:00:00Z" },
    { "id": "msg2", "role": "assistant", "content": "你好！", "createdAt": "2025-07-21T10:00:01Z" }
  ]
}
```

**Response 401**: `{ "error": "unauthorized" }`
**Response 404**: `{ "error": "session not found" }`（sessionId 传了但不存在）
