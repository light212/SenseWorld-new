/**
 * LLMProvider 接口 - AI 大语言模型服务商统一接口
 *
 * 新增服务商步骤：
 * 1. 在 lib/ai/ 下新建 <provider-name>-provider.ts
 * 2. 实现此接口
 * 3. 在 lib/ai/factory.ts 的 LLMFactory.create() 中注册
 * 4. 运营后台配置面板即可选择新服务商
 */
export interface LLMProvider {
  /** 是否支持图像输入（Vision） */
  readonly supportsVision: boolean

  /** 是否支持原生音频输入/输出 */
  readonly supportsNativeAudio: boolean

  /**
   * 非流式对话 - 返回完整回复文本
   * @param messages 对话历史消息列表
   * @returns 完整的 AI 回复文本
   */
  chat(messages: ChatMessage[]): Promise<string>

  /**
   * 流式对话 - 通过 AsyncIterable 逐块返回文本
   * @param messages 对话历史消息列表
   * @yields 文本块（每次 yield 一段增量文本）
   */
  chatStream(messages: ChatMessage[]): AsyncIterable<string>
}

/** 对话消息结构 */
export interface ChatMessage {
  /** 消息来源角色 */
  role: 'user' | 'assistant' | 'system'

  /** 消息文本内容 */
  content: string

  /**
   * 图像数据（base64 编码，不含 data URI 前缀）
   * 仅在 supportsVision=true 的 Provider 下生效
   */
  imageBase64?: string
}
