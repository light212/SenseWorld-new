# API Contract: POST /api/speech/tts

## Overview

文字转语音端点。接收文本，返回音频二进制流。

## Request

```
POST /api/speech/tts?token={access_token}
Content-Type: application/json
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | 访问令牌（与 `/api/chat` 相同机制） |

### Body (JSON)

```json
{
  "text": "需要合成的文本内容"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | 需要合成为语音的文本；不得为空字符串 |

## Response

### 200 OK

音频二进制流，Content-Type 取决于服务商：

| Provider | Content-Type | Format |
|----------|-------------|--------|
| openai | `audio/mpeg` | MP3 |
| azure | `audio/wav` | WAV (riff-16khz-16bit-mono-pcm) |

响应头：
```
Content-Type: audio/mpeg
Content-Disposition: inline
```

### Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "text is required" }` | `text` 字段为空或缺失 |
| 401 | `{ "error": "unauthorized" }` | token 无效、过期或未提供 |
| 503 | `{ "error": "speech service not configured" }` | 运营未配置 `speech_provider` |
| 502 | `{ "error": "speech service error" }` | 上游 API 调用失败 |

## Notes

- 客户端播放时直接使用响应体 ArrayBuffer 创建 `AudioContext` 或 `<audio>` 对象
- 文本长度无硬性限制，但建议 ≤ 4096 字符（受上游服务商限制）
- 音色由 `tts_voice` Config key 控制；未配置时 OpenAI 默认 `alloy`，Azure 默认 `zh-CN-XiaoxiaoNeural`
