import type { SpeechProvider } from './types'

/**
 * SpeechFactory - 根据运营配置创建对应的 SpeechProvider 实例
 *
 * 新增语音服务商后，在 switch 中添加对应 case 即可，业务逻辑无需修改。
 */
export class SpeechFactory {
  /**
   * 根据服务商名称创建 SpeechProvider 实例
   * @param provider 服务商名称（与运营配置中 speech_provider 字段对应）
   * @param apiKey API 密钥
   * @param region 服务区域（Azure 等需要）
   * @returns SpeechProvider 实例
   * @throws 不支持的服务商时抛出错误
   */
  static create(provider: string, apiKey: string, region?: string): SpeechProvider {
    switch (provider) {
      // Feature 004-voice 阶段实现以下 case
      // case 'openai':
      //   return new OpenAISpeechProvider(apiKey)
      // case 'azure':
      //   return new AzureSpeechProvider(apiKey, region!)
      default:
        throw new Error(`Unsupported speech provider: ${provider}`)
    }
  }
}
