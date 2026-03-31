import OpenAI from 'openai'
import type { LLMProvider, ChatMessage } from './types'

type OpenAIContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail: 'low' } }

function buildOpenAIContent(msg: ChatMessage, isLatestUser: boolean): string | OpenAIContent[] {
  if (isLatestUser && msg.imageBase64) {
    return [
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${msg.imageBase64}`, detail: 'low' } },
      { type: 'text', text: msg.content },
    ]
  }
  return msg.content
}

export class OpenAIProvider implements LLMProvider {
  readonly supportsVision = true
  readonly supportsNativeAudio = false

  private client: OpenAI
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey })
    this.model = model
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const lastUserIdx = messages.map((m) => m.role).lastIndexOf('user')
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m, i) => ({ role: m.role, content: buildOpenAIContent(m, i === lastUserIdx) })),
    })
    return response.choices[0]?.message?.content ?? ''
  }

  async *chatStream(messages: ChatMessage[]): AsyncIterable<string> {
    const lastUserIdx = messages.map((m) => m.role).lastIndexOf('user')
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m, i) => ({ role: m.role, content: buildOpenAIContent(m, i === lastUserIdx) })),
      stream: true,
    })
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content
      if (text) yield text
    }
  }
}
