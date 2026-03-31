# Quickstart: 004-voice-stt-tts

测试语音 API 端点的快速指南，无需前端 UI。

## 前置条件

1. 本地或远程服务已运行（`pnpm dev`）
2. 已有有效的 `access_token`（通过管理后台生成）
3. 运营后台已配置 `speech_provider`、`speech_api_key`（及 Azure 的 `speech_region`）

## 配置语音服务（运营后台 or 直接写 DB）

### 方式一：直接写入 Config 表（开发测试用）

```sql
-- OpenAI
INSERT INTO Config (\`key\`, value, updatedAt) VALUES ('speech_provider', 'openai', NOW())
  ON DUPLICATE KEY UPDATE value='openai', updatedAt=NOW();
INSERT INTO Config (\`key\`, value, updatedAt) VALUES ('speech_api_key', 'sk-YOUR_KEY', NOW())
  ON DUPLICATE KEY UPDATE value='sk-YOUR_KEY', updatedAt=NOW();

-- Azure（额外需要）
INSERT INTO Config (\`key\`, value, updatedAt) VALUES ('speech_provider', 'azure', NOW())
  ON DUPLICATE KEY UPDATE value='azure', updatedAt=NOW();
INSERT INTO Config (\`key\`, value, updatedAt) VALUES ('speech_api_key', 'YOUR_AZURE_KEY', NOW())
  ON DUPLICATE KEY UPDATE value='YOUR_AZURE_KEY', updatedAt=NOW();
INSERT INTO Config (\`key\`, value, updatedAt) VALUES ('speech_region', 'eastus', NOW())
  ON DUPLICATE KEY UPDATE value='eastus', updatedAt=NOW();
```

## 测试 STT（语音转文字）

### 准备测试音频

```bash
# 方式一：录制 5 秒麦克风音频（需安装 ffmpeg + sox）
rec -r 16000 -c 1 -b 16 test.wav trim 0 5

# 方式二：用 ffmpeg 生成静音测试文件（验证端点响应格式）
ffmpeg -f lavfi -i sine=frequency=1000:duration=3 test.wav

# 方式三：直接使用任意 .wav / .webm 文件
```

### 发送请求

```bash
TOKEN="your_access_token_here"

curl -X POST "http://localhost:3000/api/speech/stt?token=${TOKEN}" \
  -F "audio=@test.wav;type=audio/wav"
```

### 预期响应

```json
{ "text": "你好世界" }
```

### 测试错误场景

```bash
# 401 — 无效 token
curl -X POST "http://localhost:3000/api/speech/stt?token=invalid"

# 400 — 无音频文件
curl -X POST "http://localhost:3000/api/speech/stt?token=${TOKEN}"

# 503 — 未配置（先删除 Config 中的 speech_provider）
curl -X POST "http://localhost:3000/api/speech/stt?token=${TOKEN}" \
  -F "audio=@test.wav;type=audio/wav"
```

## 测试 TTS（文字转语音）

### 发送请求并保存音频

```bash
TOKEN="your_access_token_here"

# OpenAI 返回 audio/mpeg，保存为 mp3
curl -X POST "http://localhost:3000/api/speech/tts?token=${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"text": "你好，我是 SenseWorld 智能助手。"}' \
  --output output.mp3

# Azure 返回 audio/wav，保存为 wav
curl -X POST "http://localhost:3000/api/speech/tts?token=${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"text": "你好，我是 SenseWorld 智能助手。"}' \
  --output output.wav
```

### 播放验证

```bash
# macOS
afplay output.mp3
# 或
open output.wav
```

### 测试错误场景

```bash
# 400 — 空文本
curl -X POST "http://localhost:3000/api/speech/tts?token=${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"text": ""}'

# 401 — 无效 token
curl -X POST "http://localhost:3000/api/speech/tts?token=invalid" \
  -H "Content-Type: application/json" \
  -d '{"text": "测试"}'
```

## 切换服务商

```sql
-- 切换到 Azure
UPDATE Config SET value='azure' WHERE `key`='speech_provider';

-- 切换回 OpenAI
UPDATE Config SET value='openai' WHERE `key`='speech_provider';
```

切换后无需重启服务，下次请求即生效（`SpeechFactory` 每次请求从 DB 读取配置）。
