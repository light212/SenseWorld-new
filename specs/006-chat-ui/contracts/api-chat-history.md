# API Contract: GET /api/chat

## 说明

在现有 `POST /api/chat` 基础上新增 GET 方法，用于加载历史消息。向下兼容，不影响 POST 行为。

## Request

```
GET /api/chat?token={accessToken}&sessionId={sessionId}
```

**参数**：
- `token`（必填）：访客 access token
- `sessionId`（可选）：若不传则返回空消息列表并创建新 session

## Response

### 200 OK

```json
{
  "sessionId": "clxxxxx",
  "messages": [
    {
      "id": "msg_001",
      "role": "user",
      "content": "你好",
      "createdAt": "2025-07-21T10:00:00.000Z"
    },
    {
      "id": "msg_002",
      "role": "assistant",
      "content": "你好！有什么我可以帮助你的吗？",
      "createdAt": "2025-07-21T10:00:01.500Z"
    }
  ]
}
```

**注意**：历史消息仅含文字内容，不含图片（图片不持久化）。

### 错误响应

| Status | Body | 说明 |
|--------|------|------|
| 401 | `{"error": "unauthorized"}` | token 无效 |
| 404 | `{"error": "session not found"}` | sessionId 传了但不存在 |
