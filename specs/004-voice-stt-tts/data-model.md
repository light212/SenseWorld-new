# Data Model: 004-voice-stt-tts

## No Schema Changes

本 feature 不新增 Prisma model，复用现有 `Config` 表存储语音配置。

## Config 表 — 语音相关 Key 约定

| Key | 类型 | 示例值 | 必填 | 说明 |
|-----|------|--------|------|------|
| `speech_provider` | string | `openai` \| `azure` | 是 | 选择语音服务商；未配置时 STT/TTS 端点返回 503 |
| `speech_api_key` | string | `sk-...` | 是 | 对应服务商的 API Key |
| `speech_region` | string | `eastus` | Azure 必填 | Azure 区域；OpenAI 忽略此字段 |
| `tts_voice` | string | `alloy` / `zh-CN-XiaoxiaoNeural` | 否 | TTS 音色；未配置时使用服务商默认值 |

### 默认值

- OpenAI TTS 默认音色：`alloy`
- Azure TTS 默认音色：`zh-CN-XiaoxiaoNeural`
- 未配置 `tts_voice` 时各 Provider 内部使用上述默认值

## 读取方式

```typescript
// 复用现有 getConfig() 工具
import { getConfig } from '@/lib/config'

const provider = await getConfig('speech_provider')   // null if not set
const apiKey   = await getConfig('speech_api_key')
const region   = await getConfig('speech_region')
const voice    = await getConfig('tts_voice')         // optional
```

若 `speech_provider` 为 `null`，`SpeechFactory.create()` 抛出错误，路由层捕获后返回 HTTP 503。

## 现有 Model 参考（无变更）

```prisma
model Config {
  id          Int      @id @default(autoincrement())
  key         String   @unique
  value       String   @db.Text
  description String?
  updatedAt   DateTime @updatedAt
}
```
