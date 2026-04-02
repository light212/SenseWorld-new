/**
 * HttpMCPClient -- MCP HTTP 客户端
 *
 * 使用官方 @modelcontextprotocol/sdk 进行协议通信。
 * 传输层优先尝试 StreamableHTTP（MCP 2024-11-05 规范），
 * 若服务器不支持则自动回退至 SSE（旧版规范）。
 *
 * 增强特性：MCPError 错误分类、MCPLogger 结构化日志、细粒度可配置超时
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { JSONRPCMessage, MessageExtraInfo } from '@modelcontextprotocol/sdk/types.js'
import type { MCPClient, MCPTool, MCPToolResult } from './types'
import { MCPError, MCPErrorCode, classifyError } from './error'
import { mcpLogger } from './logger'
import { mcpMetrics } from './metrics'
import { getConfig } from '@/lib/config'

const CLIENT_INFO = { name: 'SenseWorld-MCP-Client', version: '1.0.0' }
const ALLOWED_PROTOCOLS = ['http:', 'https:']

// ─────────────────────────────────────────────────────────────────────────────
// 超时配置（可通过 Config 表覆盖）
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_TIMEOUTS = {
  connect: 5000,
  listTools: 10000,
  toolCallDefault: 15000,
  toolCallMax: 60000,
}

async function getTimeouts() {
  const [
    connect,
    listTools,
    toolCallDefault,
    toolCallMax,
  ] = await Promise.all([
    getConfig('MCP_TIMEOUT_CONNECT_MS'),
    getConfig('MCP_TIMEOUT_LIST_TOOLS_MS'),
    getConfig('MCP_TIMEOUT_TOOL_DEFAULT_MS'),
    getConfig('MCP_TIMEOUT_TOOL_MAX_MS'),
  ])
  return {
    connect: connect ? parseInt(connect, 10) : DEFAULT_TIMEOUTS.connect,
    listTools: listTools ? parseInt(listTools, 10) : DEFAULT_TIMEOUTS.listTools,
    toolCallDefault: toolCallDefault ? parseInt(toolCallDefault, 10) : DEFAULT_TIMEOUTS.toolCallDefault,
    toolCallMax: toolCallMax ? parseInt(toolCallMax, 10) : DEFAULT_TIMEOUTS.toolCallMax,
  }
}

/**
 * 带超时的 Promise 包装
 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${message}（超时 ${ms / 1000}s）`)), ms)
    promise
      .then((result) => { clearTimeout(timer); resolve(result) })
      .catch((err) => { clearTimeout(timer); reject(err) })
  })
}

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
          this.onmessage!(data)
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
  private serverUrl = ''

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────

  async connect(serverUrl: string, apiKey?: string | null): Promise<void> {
    this.serverUrl = serverUrl

    // Validate URL
    let parsed: URL
    try {
      parsed = new URL(serverUrl)
    } catch {
      throw new MCPError(MCPErrorCode.INVALID_PARAMS, `MCP Server URL 格式无效: ${serverUrl}`)
    }
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      throw new MCPError(MCPErrorCode.INVALID_PARAMS, `仅支持 http/https 协议，当前: ${parsed.protocol}`)
    }

    const timeouts = await getTimeouts()

    // Build request init with auth header if apiKey provided
    const requestInit: RequestInit = {}
    if (apiKey) {
      requestInit.headers = { 'X-Api-Key': apiKey, 'Authorization': `Bearer ${apiKey}` }
    }

    // Try StreamableHTTP first (MCP 2024-11-05 spec), fall back to SSE, then Stateless POST
    const errors: string[] = []

    // Helper to attempt connection with a transport
    const tryConnect = async (transport: Transport, label: string): Promise<Client | null> => {
      try {
        const client = new Client(CLIENT_INFO)
        await withTimeout(
          client.connect(transport),
          timeouts.connect,
          `MCP ${label} 连接`
        )
        return client
      } catch (err) {
        errors.push(`${label}: ${(err as Error).message}`)
        return null
      }
    }

    // 1. Try StreamableHTTP (MCP 2024-11-05 spec)
    let client = await tryConnect(
      new StreamableHTTPClientTransport(new URL(serverUrl), { requestInit }),
      'StreamableHTTP'
    )

    // 2. Fallback to SSE
    if (!client) {
      client = await tryConnect(
        new SSEClientTransport(new URL(serverUrl), { requestInit }),
        'SSE'
      )
    }

    // 3. Fallback to Stateless POST
    if (!client) {
      mcpLogger.warn({ event: 'connect_fallback', serverUrl, error: `StreamableHTTP & SSE failed, trying Stateless POST` })
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
      client = await tryConnect(statelessTransport, 'StatelessPOST')
    }

    if (!client) {
      const mcpErr = classifyError(new Error(`MCP 连接失败，已尝试所有协议：\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`))
      mcpLogger.error({ event: 'connect_failed', serverUrl, error: mcpErr.message })
      mcpMetrics.recordConnect(false)
      throw mcpErr
    }

    this.client = client
    this.connected = true
    mcpLogger.info({ event: 'connect', serverUrl })
    mcpMetrics.recordConnect(true)
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
    if (this.serverUrl) {
      mcpLogger.info({ event: 'disconnect', serverUrl: this.serverUrl })
    }
  }

  async listTools(): Promise<MCPTool[]> {
    this.assertConnected()
    const timeouts = await getTimeouts()
    try {
      const res = await withTimeout(
        this.client!.listTools(),
        timeouts.listTools,
        '获取工具列表'
      )
      return (res.tools ?? []).map((t) => ({
        name: t.name,
        description: t.description ?? '',
        inputSchema: (t.inputSchema as MCPTool['inputSchema']) ?? { type: 'object' },
      }))
    } catch (err) {
      const mcpErr = classifyError(err)
      mcpLogger.error({ event: 'list_tools_failed', serverUrl: this.serverUrl, error: mcpErr.message })
      throw mcpErr
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    this.assertConnected()
    const timeouts = await getTimeouts()
    const start = Date.now()
    try {
      const res = await withTimeout(
        this.client!.callTool({ name, arguments: args }),
        timeouts.toolCallDefault,
        `工具 ${name} 执行`
      )
      const durationMs = Date.now() - start
      mcpLogger.info({ event: 'tool_result', serverUrl: this.serverUrl, toolName: name, durationMs })
      mcpMetrics.recordToolCall(name, durationMs, true)
      return res as MCPToolResult
    } catch (err) {
      const durationMs = Date.now() - start
      const mcpErr = classifyError(err)
      mcpLogger.error({ event: 'tool_error', serverUrl: this.serverUrl, toolName: name, durationMs, error: mcpErr.message })
      mcpMetrics.recordToolCall(name, durationMs, false)
      throw mcpErr
    }
  }

  isConnected(): boolean {
    return this.connected
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private
  // ──────────────────────────────────────────────────────────────────────────

  private assertConnected(): void {
    if (!this.connected || !this.client) {
      throw new MCPError(MCPErrorCode.NETWORK_ERROR, 'MCPClient 未连接，请先调用 connect()')
    }
  }
}
