import Anthropic from '@anthropic-ai/sdk'
import type { LLMProvider, ChatMessage } from './types'

type AnthropicContent =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg'; data: string } }

function buildAnthropicContent(msg: ChatMessage, isLatestUser: boolean): string | AnthropicContent[] {
  if (isLatestUser && msg.imageBase64) {
    return [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: msg.imageBase64 } },
      { type: 'text', text: msg.content },
    ]
  }
  return msg.content
}

export class AnthropicProvider implements LLMProvider {
  readonly supportsVision = true
  readonly supportsNativeAudio = false

  private client: Anthropic
  private model: string

  constructor(apiKey: string, model: string, baseURL?: string) {
    this.client = new Anthropic({ apiKey, ...(baseURL ? { baseURL } : {}) })
    this.model = model
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const nonSystem = messages.filter((m) => m.role !== 'system')
    const lastUserIdx = nonSystem.map((m) => m.role).lastIndexOf('user')
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: nonSystem.map((m, i) => ({
        role: m.role as 'user' | 'assistant',
        content: buildAnthropicContent(m, i === lastUserIdx),
      })),
    })
    const block = response.content[0]
    return block?.type === 'text' ? block.text : ''
  }

  async *chatStream(messages: ChatMessage[]): AsyncIterable<string> {
    const systemMsg = messages.find((m) => m.role === 'system')
    const nonSystem = messages.filter((m) => m.role !== 'system')
    const lastUserIdx = nonSystem.map((m) => m.role).lastIndexOf('user')

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 4096,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      messages: nonSystem.map((m, i) => ({
        role: m.role as 'user' | 'assistant',
        content: buildAnthropicContent(m, i === lastUserIdx),
      })),
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
