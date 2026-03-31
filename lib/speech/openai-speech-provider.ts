import OpenAI, { toFile } from 'openai'
import type { SpeechCreateParams } from 'openai/resources/audio/speech'
import type { SpeechProvider } from './types'

export class OpenAISpeechProvider implements SpeechProvider {
  private client: OpenAI
  private voice: SpeechCreateParams['voice']

  constructor(apiKey: string, voice?: string) {
    this.client = new OpenAI({ apiKey })
    this.voice = (voice as SpeechCreateParams['voice']) ?? 'alloy'
  }

  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const ext = mimeTypeToExt(mimeType)
    const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimeType })
    const transcription = await this.client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    })
    return transcription.text
  }

  async synthesize(text: string): Promise<{ audio: Buffer; mimeType: string }> {
    const response = await this.client.audio.speech.create({
      model: 'tts-1',
      voice: this.voice,
      input: text,
      response_format: 'mp3',
    })
    const arrayBuffer = await response.arrayBuffer()
    return {
      audio: Buffer.from(arrayBuffer),
      mimeType: 'audio/mpeg',
    }
  }
}

function mimeTypeToExt(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('wav')) return 'wav'
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('flac')) return 'flac'
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3'
  return 'webm'
}
