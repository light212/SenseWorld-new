import Anthropic from '@anthropic-ai/sdk'
import type { LLMProvider, ChatMessage } from './types'

export class AnthropicProvider implements LLMProvider {
  readonly supportsVision = false
  readonly supportsNativeAudio = false

  private client: Anthropic
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey })
    this.model = model
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    })
    const block = response.content[0]
    return block?.type === 'text' ? block.text : ''
  }

  async *chatStream(messages: ChatMessage[]): AsyncIterable<string> {
    const systemMsg = messages.find((m) => m.role === 'system')
    const nonSystemMsgs = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 4096,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      messages: nonSystemMsgs,
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text
      }
    }
  }
}
