import type { MCPClient } from './types'
import { HttpMCPClient } from './http-client'
import { mcpPool } from './pool'

export class MCPClientFactory {
  /**
   * 从连接池获取 MCP 连接。
   * 调用方必须在用完后调用 release() 释放连接。
   */
  static async acquire(serverUrl: string, apiKey?: string | null): Promise<MCPClient> {
    return mcpPool.acquire(serverUrl, apiKey)
  }

  /** 释放连接回连接池 */
  static release(client: MCPClient): void {
    mcpPool.release(client)
  }

  /**
   * 创建不经过连接池的独立客户端。
   * 仅用于测试连接（/api/admin/mcp/test）等非对话场景。
   */
  static create(): MCPClient {
    return new HttpMCPClient()
  }
}

/** 便捷函数：释放 MCP 连接回池 */
export function releaseClient(client: MCPClient): void {
  mcpPool.release(client)
}
