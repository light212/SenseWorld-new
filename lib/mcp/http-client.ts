/**
 * HttpMCPClient — 标准 MCP HTTP 客户端
 *
 * 使用官方 @modelcontextprotocol/sdk 进行协议通信。
 *
 * 传输层优先尝试 StreamableHTTP（MCP 2024-11-05 规范），
 * 若服务器不支持则自动回退至 SSE（旧版规范）。
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { JSONRPCMessage, MessageExtraInfo } from '@modelcontextprotocol/sdk/types.js'
import type { MCPClient, MCPTool, MCPToolResult } from './types'

const CLIENT_INFO = { name: 'SenseWorld-MCP-Client', version: '1.0.0' }
const ALLOWED_PROTOCOLS = ['http:', 'https:']

/**
 * Custom Transport for basic JSON-RPC stateless HTTP servers
 * that don't support SSE or specific MCP streaming protocols.
 */
class StatelessHTTPTransport implements Transport {
  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: <T extends JSONRPCMessage>(message: T, extra?: MessageExtraInfo) => void

  constructor(private url: string, private headers?: Record<string, string>) {}

  async start(): Promise<void> {}

  async send(message: JSONRPCMessage): Promise<void> {
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.headers },
        body: JSON.stringify(message),
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const data = await res.json()
      if (this.onmessage) {
        if (Array.isArray(data)) {
          data.forEach(msg => this.onmessage!(msg))
        } else {
          this.onmessage(data)
        }
      }
    } catch (err) {
      if (this.onerror) this.onerror(err as Error)
    }
  }

  async close(): Promise<void> {
    if (this.onclose) this.onclose()
  }
}

export class HttpMCPClient implements MCPClient {
  private client: Client | null = null
  private connected = false

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────

  async connect(serverUrl: string, apiKey?: string | null): Promise<void> {
    // Validate URL
    let parsed: URL
    try {
      parsed = new URL(serverUrl)
    } catch {
      throw new Error(`MCP Server URL 格式无效: ${serverUrl}`)
    }
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      throw new Error(`仅支持 http/https 协议，当前: ${parsed.protocol}`)
    }

    // Build request init with auth header if apiKey provided
    const requestInit: RequestInit = {}
    if (apiKey) {
      // The server expects X-Api-Key rather than Authorization Bearer
      requestInit.headers = { 'X-Api-Key': apiKey, 'Authorization': `Bearer ${apiKey}` }
    }

    // Try StreamableHTTP first (MCP 2024-11-05 spec), fall back to SSE
    const errors: string[] = []
    
    try {
      const client = new Client(CLIENT_INFO)
      const httpTransport = new StreamableHTTPClientTransport(new URL(serverUrl), { requestInit })
      await client.connect(httpTransport)
      this.client = client
    } catch (err1) {
      errors.push(`StreamableHTTP 失败: ${(err1 as Error).message}`)
      
      try {
        const client = new Client(CLIENT_INFO)
        const sseTransport = new SSEClientTransport(new URL(serverUrl), { requestInit })
        await client.connect(sseTransport)
        this.client = client
      } catch (err2) {
        errors.push(`SSE 失败: ${(err2 as Error).message}`)
        
        // Fallback to basic state-less POST
        console.log('[MCP] StreamableHTTP & SSE failed, falling back to Stateless POST', errors)
        const statelessTransport = new StatelessHTTPTransport(
          serverUrl,
          apiKey ? { 
            'X-Api-Key': apiKey, 
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json, text/event-stream' 
          } : { 
            'Accept': 'application/json, text/event-stream' 
          }
        )
        try {
          const client = new Client(CLIENT_INFO)
          await client.connect(statelessTransport)
          this.client = client
        } catch (err3) {
          errors.push(`Stateless POST 失败: ${(err3 as Error).message}`)
          throw new Error('不支持所有标准连接方式。底层报错：\n' + errors.join('\n'))
        }
      }
    }

    this.connected = true
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close()
      } catch {
        // best effort
      }
      this.client = null
    }
    this.connected = false
  }

  async listTools(): Promise<MCPTool[]> {
    this.assertConnected()
    const res = await this.client!.listTools()
    return (res.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description ?? '',
      inputSchema: (t.inputSchema as MCPTool['inputSchema']) ?? { type: 'object' },
    }))
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    this.assertConnected()
    const res = await this.client!.callTool({ name, arguments: args })
    return res as MCPToolResult
  }

  isConnected(): boolean {
    return this.connected
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private
  // ──────────────────────────────────────────────────────────────────────────

  private assertConnected(): void {
    if (!this.connected || !this.client) {
      throw new Error('MCPClient 未连接，请先调用 connect()')
    }
  }
}
