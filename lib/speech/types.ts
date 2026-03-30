/**
 * SpeechProvider 接口 - 语音服务商统一接口
 *
 * 新增语音服务商步骤：
 * 1. 在 lib/speech/ 下新建 <provider-name>-speech-provider.ts
 * 2. 实现此接口
 * 3. 在 lib/speech/factory.ts 的 SpeechFactory.create() 中注册
 * 4. 运营后台配置面板即可选择新语音服务商
 */
export interface SpeechProvider {
  /**
   * 语音转文字（STT）
   * @param audioBuffer 音频数据 Buffer
   * @param mimeType 音频 MIME 类型，如 'audio/webm' 或 'audio/wav'
   * @returns 转写后的文本
   */
  transcribe(audioBuffer: Buffer, mimeType: string): Promise<string>

  /**
   * 文字转语音（TTS）
   * @param text 需要合成的文本
   * @returns 音频 Buffer 及对应的 MIME 类型
   */
  synthesize(text: string): Promise<{ audio: Buffer; mimeType: string }>
}
