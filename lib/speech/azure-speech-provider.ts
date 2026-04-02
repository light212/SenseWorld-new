import type { SpeechProvider } from './types'

export class AzureSpeechProvider implements SpeechProvider {
  private apiKey: string
  private region: string
  private voice: string

  constructor(apiKey: string, region: string, voice?: string) {
    this.apiKey = apiKey
    this.region = region
    this.voice = voice ?? 'zh-CN-XiaoxiaoNeural'
  }

  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const url = `https://${this.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=zh-CN`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'Content-Type': mimeType,
      },
      body: new Uint8Array(audioBuffer),
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Azure STT error: ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 200)}` : ''}`)
    }
    const data = await response.json() as { DisplayText?: string; RecognitionStatus?: string }
    return data.DisplayText ?? ''
  }

  async synthesize(text: string): Promise<{ audio: Buffer; mimeType: string }> {
    const url = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`
    const ssml = `<speak version='1.0' xml:lang='zh-CN'><voice name='${this.voice}'>${escapeXml(text)}</voice></speak>`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'riff-16khz-16bit-mono-pcm',
      },
      body: ssml,
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Azure TTS error: ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 200)}` : ''}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    return {
      audio: Buffer.from(arrayBuffer),
      mimeType: 'audio/wav',
    }
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
