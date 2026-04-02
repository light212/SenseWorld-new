/**
 * MCPError -- MCP 错误分类体系
 *
 * 将原生 Error 按类型分类，支持可恢复性判断，
 * 便于上层根据错误类型决定是否重试。
 */

/** MCP 错误码枚举 */
export enum MCPErrorCode {
  /** 网络不可达、DNS 解析失败 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** 连接或操作超时 */
  TIMEOUT = 'TIMEOUT',
  /** 认证失败（401/403） */
  AUTH_FAILED = 'AUTH_FAILED',
  /** 服务端错误（5xx） */
  SERVER_ERROR = 'SERVER_ERROR',
  /** 工具不存在 */
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  /** 参数验证失败 */
  INVALID_PARAMS = 'INVALID_PARAMS',
  /** 连接池耗尽 */
  CONNECTION_POOL_EXHAUSTED = 'CONNECTION_POOL_EXHAUSTED',
  /** 未知错误 */
  UNKNOWN = 'UNKNOWN',
}

/** 可恢复性规则映射 */
const RECOVERABLE_CODES: Set<MCPErrorCode> = new Set([
  MCPErrorCode.NETWORK_ERROR,
  MCPErrorCode.TIMEOUT,
  MCPErrorCode.CONNECTION_POOL_EXHAUSTED,
])

/** MCP 错误类 */
export class MCPError extends Error {
  readonly code: MCPErrorCode
  readonly recoverable: boolean
  readonly cause?: Error

  constructor(code: MCPErrorCode, message: string, cause?: Error) {
    super(message)
    this.name = 'MCPError'
    this.code = code
    this.recoverable = RECOVERABLE_CODES.has(code)
    this.cause = cause
  }
}

/**
 * 将原生错误自动分类为 MCPError。
 *
 * 分类规则：
 * - TypeError / fetch 网络错误 -> NETWORK_ERROR
 * - 消息含 "超时" / "timeout" / "timed out" -> TIMEOUT
 * - HTTP 401/403 -> AUTH_FAILED
 * - HTTP 5xx -> SERVER_ERROR
 * - 其他 -> UNKNOWN
 */
export function classifyError(err: unknown): MCPError {
  if (err instanceof MCPError) return err

  const message = err instanceof Error ? err.message : String(err)
  const lower = message.toLowerCase()

  // 超时
  if (lower.includes('超时') || lower.includes('timeout') || lower.includes('timed out')) {
    return new MCPError(MCPErrorCode.TIMEOUT, message, err instanceof Error ? err : undefined)
  }

  // HTTP 状态码
  if (lower.includes('401') || lower.includes('403') || lower.includes('unauthorized') || lower.includes('forbidden')) {
    return new MCPError(MCPErrorCode.AUTH_FAILED, message, err instanceof Error ? err : undefined)
  }
  if (/5\d{2}/.test(message) || lower.includes('internal server error') || lower.includes('server error')) {
    return new MCPError(MCPErrorCode.SERVER_ERROR, message, err instanceof Error ? err : undefined)
  }

  // 工具不存在
  if (lower.includes('tool not found') || lower.includes('unknown tool') || lower.includes('未找到工具')) {
    return new MCPError(MCPErrorCode.TOOL_NOT_FOUND, message, err instanceof Error ? err : undefined)
  }

  // 参数无效
  if (lower.includes('invalid params') || lower.includes('invalid arguments') || lower.includes('参数无效')) {
    return new MCPError(MCPErrorCode.INVALID_PARAMS, message, err instanceof Error ? err : undefined)
  }

  // 网络错误 (TypeError from fetch, ECONNREFUSED, etc.)
  if (
    err instanceof TypeError ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('network') ||
    lower.includes('fetch failed') ||
    lower.includes('连接失败') ||
    lower.includes('连接被拒绝')
  ) {
    return new MCPError(MCPErrorCode.NETWORK_ERROR, message, err instanceof Error ? err : undefined)
  }

  return new MCPError(MCPErrorCode.UNKNOWN, message, err instanceof Error ? err : undefined)
}
