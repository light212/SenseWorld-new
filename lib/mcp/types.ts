/**
 * MCP (Model Context Protocol) 标准类型定义
 *
 * 遵循官方 @modelcontextprotocol/sdk 协议规范
 */

/** MCP Tool 描述结构，对应 tools/list 返回 */
export interface MCPTool {
  /** 工具名称（唯一标识，用于 tools/call） */
  name: string
  /** 工具功能描述（将注入到大模型的 Function Calling 定义中） */
  description: string
  /** JSON Schema 格式的参数规范 */
  inputSchema: {
    type: 'object'
    properties?: Record<string, {
      type: string
      description?: string
      [key: string]: unknown
    }>
    required?: string[]
    [key: string]: unknown
  }
}

/** MCP Tool 调用结果 */
export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
    resource?: unknown
  }>
  isError?: boolean
}

/** MCP 客户端抽象接口 */
export interface MCPClient {
  /** 连接到 MCP Server */
  connect(serverUrl: string, apiKey?: string | null): Promise<void>

  /** 断开连接并清理资源 */
  disconnect(): Promise<void>

  /** 获取 MCP Server 暴露的工具列表（JSON Schema 格式） */
  listTools(): Promise<MCPTool[]>

  /** 调用指定工具并获取结果 */
  callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult>

  /** 检测连接状态 */
  isConnected(): boolean
}
