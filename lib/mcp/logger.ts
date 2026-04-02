/**
 * MCPLogger -- MCP 结构化 JSON 日志模块
 *
 * 输出 ISO 8601 时间戳的 JSON 日志到 stdout/stderr，
 * 便于 Docker/K8s 日志收集和 jq 解析。
 */

export interface MCPLogEvent {
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  component: 'mcp'
  event: string
  serverUrl?: string
  toolName?: string
  durationMs?: number
  error?: string
  poolStats?: {
    total: number
    inUse: number
    idle: number
  }
}

type LogLevel = MCPLogEvent['level']

let minLevel: LogLevel = (process.env.MCP_LOG_LEVEL as LogLevel) || 'info'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel]
}

function formatEvent(event: Partial<MCPLogEvent>): string {
  const entry: MCPLogEvent = {
    timestamp: new Date().toISOString(),
    level: event.level ?? 'info',
    component: 'mcp',
    event: event.event ?? 'unknown',
    ...event,
  }
  return JSON.stringify(entry)
}

export const mcpLogger = {
  debug(event: Omit<Partial<MCPLogEvent>, 'level'>): void {
    if (!shouldLog('debug')) return
    console.debug(formatEvent({ ...event, level: 'debug' }))
  },

  info(event: Omit<Partial<MCPLogEvent>, 'level'>): void {
    if (!shouldLog('info')) return
    console.log(formatEvent({ ...event, level: 'info' }))
  },

  warn(event: Omit<Partial<MCPLogEvent>, 'level'>): void {
    if (!shouldLog('warn')) return
    console.warn(formatEvent({ ...event, level: 'warn' }))
  },

  error(event: Omit<Partial<MCPLogEvent>, 'level'>): void {
    if (!shouldLog('error')) return
    console.error(formatEvent({ ...event, level: 'error' }))
  },

  /** 更新最低日志级别（运行时可调） */
  setLevel(level: LogLevel): void {
    minLevel = level
  },
}
