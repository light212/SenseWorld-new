# API Contract: GET /api/capabilities

## 说明

新增端点，返回当前运营配置下各 provider 的能力标志，供前端动态显示/隐藏 UI 控件。

## Request

```
GET /api/capabilities?token={accessToken}
```

无请求体。

## Response

### 200 OK

```json
{
  "supportsSTT": true,
  "supportsTTS": true,
  "supportsVision": false
}
```

**字段说明**：
- `supportsSTT`: `SPEECH_PROVIDER` 配置存在且有效时为 `true`
- `supportsTTS`: `SPEECH_PROVIDER` 配置存在且有效时为 `true`（与 STT 共用同一 provider）
- `supportsVision`: 当前 LLM provider 的 `supportsVision` 标志值

**实现逻辑**：
1. 验证 token（使用 `lib/auth/token.ts`）
2. 读取 `AI_PROVIDER`、`AI_API_KEY`、`AI_MODEL`、`SPEECH_PROVIDER`
3. 尝试实例化 LLMProvider，读取 `supportsVision`；失败时 `supportsVision = false`
4. `supportsSTT` = `supportsTTS` = `!!SPEECH_PROVIDER`

### 401 Unauthorized

```json
{ "error": "unauthorized" }
```

## 错误响应

| Status | Body | 说明 |
|--------|------|------|
| 401 | `{"error": "unauthorized"}` | token 无效或已过期 |
