import type { LLMProvider } from './types'

/**
 * LLMFactory - 根据运营配置创建对应的 LLMProvider 实例
 *
 * 新增服务商后，在 switch 中添加对应 case 即可，业务逻辑无需修改。
 */
export class LLMFactory {
  /**
   * 根据服务商名称创建 LLMProvider 实例
   * @param provider 服务商名称（与运营配置中 llm_provider 字段对应）
   * @param apiKey API 密钥
   * @param model 模型名称
   * @returns LLMProvider 实例
   * @throws 不支持的服务商时抛出错误
   */
  static create(provider: string, apiKey: string, model?: string): LLMProvider {
    switch (provider) {
      // Feature 003-ai-chat-core 阶段实现以下 case
      // case 'claude':
      //   return new ClaudeProvider(apiKey, model)
      // case 'openai':
      //   return new OpenAIProvider(apiKey, model)
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`)
    }
  }
}
