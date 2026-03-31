# API Contract: POST /api/speech/stt

## Overview

语音转文字端点。接收音频文件（multipart/form-data），返回转写文本。

## Request

```
POST /api/speech/stt?token={access_token}
Content-Type: multipart/form-data
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | 访问令牌（与 `/api/chat` 相同机制） |

### Body (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audio` | File | Yes | 音频文件；支持 webm, wav, mp3, mp4, ogg, flac 等格式；最大 25MB |

## Response

### 200 OK

```json
{
  "text": "转写后的文本内容"
}
```

### Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "audio is required" }` | 请求未包含 `audio` 字段 |
| 400 | `{ "error": "file too large, max 25MB" }` | 文件超过 25MB（OpenAI 路径）|
| 401 | `{ "error": "unauthorized" }` | token 无效、过期或未提供 |
| 503 | `{ "error": "speech service not configured" }` | 运营未配置 `speech_provider` |
| 502 | `{ "error": "speech service error" }` | 上游 API 调用失败 |

## Notes

- `Content-Type` 由浏览器 FormData 自动设置（含 boundary），客户端不应手动设置
- 音频 MIME 类型从 `file.type` 读取，若为空则默认 `audio/webm`
- 转写语言：OpenAI 自动检测（可由 `transcribe_language` Config key 覆盖，本 feature 暂不实现）；Azure 默认 `zh-CN`
