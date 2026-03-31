import type { MCPClient } from './types'
import { HttpMCPClient } from './http-client'

export class MCPClientFactory {
  static create(): MCPClient {
    return new HttpMCPClient()
  }
}
