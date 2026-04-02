import type { SpeechProvider } from './types'
import { OpenAISpeechProvider } from './openai-speech-provider'

/**
 * XAISpeechProvider - xAI 语音服务商实现
 *
 * xAI TTS API 与 OpenAI Audio SDK 完全兼容，只需将 baseURL 指向 https://api.x.ai/v1
 * xAI 标准模式不支持 STT，需使用实时语音模式或选择其他服务商
 */
export class XAISpeechProvider implements SpeechProvider {
  private inner: OpenAISpeechProvider

  constructor(apiKey: string, voice?: string) {
    this.inner = new OpenAISpeechProvider(apiKey, voice, 'https://api.x.ai/v1')
  }

  /**
   * xAI 标准模式不支持 STT
   * @throws 提示用户切换至实时语音模式或选择其他服务商
   */
  async transcribe(): Promise<string> {
    throw new Error('xAI 标准模式不支持 STT，请切换至实时语音模式或选择其他服务商')
  }

  /**
   * 文字转语音 - 委托给 OpenAISpeechProvider
   */
  async synthesize(text: string): Promise<{ audio: Buffer; mimeType: string }> {
    return this.inner.synthesize(text)
  }
}