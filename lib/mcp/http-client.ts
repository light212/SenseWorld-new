import type { MCPClient } from './types'

const TIMEOUT_MS = 5000
const MAX_CONTENT_LENGTH = 2000
const ALLOWED_PROTOCOLS = ['http:', 'https:']

export class HttpMCPClient implements MCPClient {
  private serverUrl: string | null = null
  private apiKey: string | null = null

  async connect(serverUrl: string, apiKey?: string): Promise<void> {
    let parsed: URL
    try {
      parsed = new URL(serverUrl)
    } catch {
      throw new Error(`Invalid MCP Server URL: ${serverUrl}`)
    }
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      throw new Error(`地址格式无效，仅支持 http/https`)
    }
    this.serverUrl = serverUrl
    this.apiKey = apiKey || null
    this.connected = true
  }

  async query(prompt: string): Promise<string> {
    if (!this.connected || !this.serverUrl) {
      throw new Error('MCPClient is not connected')
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`
      }

      const res = await fetch(this.serverUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: prompt }),
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()
      const content: string = data?.result ?? data?.content ?? ''
      if (!content) return ''
      return content.length > MAX_CONTENT_LENGTH
        ? content.slice(0, MAX_CONTENT_LENGTH)
        : content
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('连接超时（5秒）')
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  async disconnect(): Promise<void> {
    this.serverUrl = null
    this.apiKey = null
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }
}
