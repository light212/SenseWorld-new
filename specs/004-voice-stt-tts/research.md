# Research: 004-voice-stt-tts

## Key Decision: Azure REST API vs SDK

**Decision**: Use Azure Speech REST API (native `fetch`) instead of `microsoft-cognitiveservices-speech-sdk`.

**Rationale**: The `microsoft-cognitiveservices-speech-sdk` npm package has known compatibility issues with Next.js 14 App Router server-side rendering (native `node-gyp` modules cause Webpack bundling errors). Using REST API directly:
- No additional npm dependencies required
- No Webpack/bundler compatibility issues
- Simpler server-side implementation
- Works identically on Node.js 20 LTS

**Impact on spec.md assumption**: spec.md line 113 states "Azure Speech SDK (microsoft-cognitiveservices-speech-sdk) used via npm" - this assumption is INCORRECT. Plan uses REST API instead. Spec assumption should be noted as revised.

## OpenAI STT (Whisper)

**Package**: `openai` v6+ (already in package.json as `^6.33.0`)

**Method**: `openai.audio.transcriptions.create()`

**Server-side file passing** (Node.js context):
```typescript
import { toFile } from 'openai'

const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimeType })
const transcription = await openai.audio.transcriptions.create({
  file,
  model: 'whisper-1',
  language: 'zh',  // optional, auto-detect if omitted
})
return transcription.text
```

**Supported formats**: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm
**Size limit**: 25MB - SDK throws on exceed; catch and return 413/400

## OpenAI TTS

**Method**: `openai.audio.speech.create()`

**Buffer extraction**:
```typescript
const response = await openai.audio.speech.create({
  model: 'tts-1',
  voice: (voice as SpeechCreateParams['voice']) ?? 'alloy',
  input: text,
  response_format: 'mp3',
})
const arrayBuffer = await response.arrayBuffer()
return {
  audio: Buffer.from(arrayBuffer),
  mimeType: 'audio/mpeg',
}
```

**Voice options**: alloy, echo, fable, onyx, nova, shimmer
**Config key**: `tts_voice` (defaults to `alloy`)

## Azure Speech STT (REST API)

**Endpoint**: `https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`

**Request**:
```typescript
const params = new URLSearchParams({
  language: 'zh-CN',
  format: 'detailed',
})
const res = await fetch(
  `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?${params}`,
  {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': mimeType,  // e.g. audio/webm;codecs=opus
    },
    body: audioBuffer,
  }
)
const data = await res.json()
return data.DisplayText ?? data.NBest?.[0]?.Display ?? ''
```

**Supported formats**: wav, ogg, webm (with codec hints in Content-Type)

## Azure Speech TTS (REST API)

**Endpoint**: `https://{region}.tts.speech.microsoft.com/cognitiveservices/v1`

**Request** (SSML):
```typescript
const voice = voiceName ?? 'zh-CN-XiaoxiaoNeural'
const ssml = `<speak version='1.0' xml:lang='zh-CN'>
  <voice xml:lang='zh-CN' name='${voice}'>${text}</voice>
</speak>`

const res = await fetch(
  `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
  {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'riff-16khz-16bit-mono-pcm',
    },
    body: ssml,
  }
)
const arrayBuffer = await res.arrayBuffer()
return {
  audio: Buffer.from(arrayBuffer),
  mimeType: 'audio/wav',
}
```

## Next.js 14 multipart/form-data parsing

```typescript
// In App Router route handler
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('audio') as File | null
  if (!file) return NextResponse.json({ error: 'audio is required' }, { status: 400 })
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const mimeType = file.type || 'audio/webm'
  // ...
}
```

## No New npm Dependencies Required

- OpenAI STT/TTS: already in `package.json` as `openai: ^6.33.0`
- Azure STT/TTS: native `fetch` (Node.js 20 built-in)
- No `microsoft-cognitiveservices-speech-sdk` needed

## Config Keys Summary

| Key | Values | Required By |
|-----|--------|-------------|
| `speech_provider` | `openai` \| `azure` | Both |
| `speech_api_key` | string | Both |
| `speech_region` | e.g. `eastus` | Azure only |
| `tts_voice` | OpenAI: alloy/echo/etc; Azure: zh-CN-XiaoxiaoNeural/etc | Optional |
