# API Contract: /api/chat (Vision 扩展)

## POST /api/chat

### 变更说明

在现有 `/api/chat` 基础上新增可选 `images` 字段，向下兼容（不传 `images` 行为与现有完全相同）。

### Request

```
POST /api/chat?token={accessToken}
Content-Type: application/json
```

```jsonc
{
  "sessionId": "clxxxxx",       // 可选，不传则创建新会话
  "message": "你看到了什么？",    // 必填，用户文字消息
  "images": ["<base64string>"]   // 可选，纯 base64 JPEG（不含 data URI 前缀），当前取 [0]
}
```

**字段约束**：
- `images[n]`：纯 base64 字符串，不含 `data:image/jpeg;base64,` 前缀
- `images` 数组长度当前仅取第一个元素（多图为预留接口）
- 若 `provider.supportsVision === false`，后端忽略 `images` 字段

### Response（不变）

```
Content-Type: text/event-stream
X-Session-Id: {sessionId}
```

```
data: {"text": "chunk text"}\n\n
data: [DONE]\n\n
```

错误事件（不变）：
```
data: {"error": "LLM provider error: ..."}\n\n
data: [DONE]\n\n
```

### 错误响应（不变）

| Status | Body | 说明 |
|--------|------|------|
| 400 | `{"error": "message is required"}` | message 为空 |
| 401 | `{"error": "unauthorized"}` | token 无效 |
| 404 | `{"error": "session not found"}` | sessionId 不存在 |
| 503 | `{"error": "AI provider not configured"}` | 运营配置缺失 |
