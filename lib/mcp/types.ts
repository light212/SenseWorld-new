/**
 * MCP (Model Context Protocol) 客户端接口预留
 *
 * 对接公司 MCP Server 知识库，增强 AI 回复质量。
 * Feature 007-mcp-integration 阶段实现。
 */
export interface MCPClient {
  /** 连接到 MCP Server */
  connect(serverUrl: string): Promise<void>

  /** 断开连接 */
  disconnect(): Promise<void>

  /** 查询知识库 */
  query(prompt: string): Promise<string>

  /** 检测连接状态 */
  isConnected(): boolean
}
