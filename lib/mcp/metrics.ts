/**
 * MCPMetricsCollector -- MCP 运行时指标收集器
 *
 * 单例模式收集连接、工具调用和连接池指标，
 * 支持 JSON 和 Prometheus 两种格式导出。
 */

import type { PoolStats } from './pool'

/** 工具调用耗时环形缓冲区（每个工具名保留最近 100 次） */
const MAX_DURATION_ENTRIES = 100

interface ToolMetrics {
  callsTotal: number
  callsSuccess: number
  callsFailed: number
  durations: number[]  // ring buffer
}

class MCPMetricsCollector {
  // 连接指标
  private connectionsTotal = 0
  private connectionsActive = 0
  private connectionsFailed = 0

  // 工具调用指标（按工具名分组）
  private toolMetrics = new Map<string, ToolMetrics>()

  // 连接池指标（由 pool 更新）
  private poolSize = 0
  private poolInUse = 0
  private poolEvictions = 0

  /** 记录一次连接事件 */
  recordConnect(success: boolean): void {
    this.connectionsTotal++
    if (success) {
      this.connectionsActive++
    } else {
      this.connectionsFailed++
    }
  }

  /** 记录一次断开连接 */
  recordDisconnect(): void {
    this.connectionsActive = Math.max(0, this.connectionsActive - 1)
  }

  /** 记录一次工具调用 */
  recordToolCall(toolName: string, durationMs: number, success: boolean): void {
    let metrics = this.toolMetrics.get(toolName)
    if (!metrics) {
      metrics = { callsTotal: 0, callsSuccess: 0, callsFailed: 0, durations: [] }
      this.toolMetrics.set(toolName, metrics)
    }

    metrics.callsTotal++
    if (success) metrics.callsSuccess++
    else metrics.callsFailed++

    // Ring buffer for durations
    if (metrics.durations.length >= MAX_DURATION_ENTRIES) {
      metrics.durations.shift()
    }
    metrics.durations.push(durationMs)
  }

  /** 更新连接池指标 */
  updatePoolStats(stats: PoolStats): void {
    this.poolSize = stats.total
    this.poolInUse = stats.inUse
    this.poolEvictions = stats.evictions
  }

  /** 计算某工具的平均耗时 */
  private avgDuration(durations: number[]): number {
    if (durations.length === 0) return 0
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
  }

  /** 导出为 JSON 对象 */
  toJSON(): Record<string, unknown> {
    const avgToolDuration: Record<string, number> = {}
    const toolBreakdown: Record<string, { total: number; success: number; failed: number; avgDurationMs: number }> = {}

    const entries = Array.from(this.toolMetrics.entries())
    for (let i = 0; i < entries.length; i++) {
      const [name, m] = entries[i]
      const avg = this.avgDuration(m.durations)
      avgToolDuration[name] = avg
      toolBreakdown[name] = {
        total: m.callsTotal,
        success: m.callsSuccess,
        failed: m.callsFailed,
        avgDurationMs: avg,
      }
    }

    let toolCallsTotal = 0
    let toolCallsSuccess = 0
    let toolCallsFailed = 0
    this.toolMetrics.forEach((m) => {
      toolCallsTotal += m.callsTotal
      toolCallsSuccess += m.callsSuccess
      toolCallsFailed += m.callsFailed
    })

    return {
      connectionsTotal: this.connectionsTotal,
      connectionsActive: this.connectionsActive,
      connectionsFailed: this.connectionsFailed,
      toolCallsTotal,
      toolCallsSuccess,
      toolCallsFailed,
      avgToolCallDurationMs: avgToolDuration,
      toolBreakdown,
      poolSize: this.poolSize,
      poolInUse: this.poolInUse,
      poolEvictions: this.poolEvictions,
    }
  }

  /** 导出为 Prometheus text exposition 格式 */
  exportPrometheus(): string {
    const lines: string[] = []

    const addMetric = (name: string, help: string, type: string, value: number | string, labels?: string) => {
      lines.push(`# HELP mcp_${name} ${help}`)
      lines.push(`# TYPE mcp_${name} ${type}`)
      if (labels) {
        lines.push(`mcp_${name}{${labels}} ${value}`)
      } else {
        lines.push(`mcp_${name} ${value}`)
      }
      lines.push('')
    }

    addMetric('connections_total', 'Total MCP connection attempts', 'counter', this.connectionsTotal)
    addMetric('connections_active', 'Currently active connections', 'gauge', this.connectionsActive)
    addMetric('connections_failed', 'Failed connection attempts', 'counter', this.connectionsFailed)

    let toolCallsTotal = 0
    let toolCallsSuccess = 0
    let toolCallsFailed = 0
    this.toolMetrics.forEach((m, toolName) => {
      toolCallsTotal += m.callsTotal
      toolCallsSuccess += m.callsSuccess
      toolCallsFailed += m.callsFailed

      addMetric(`tool_calls_total`, 'Total tool calls', 'counter', m.callsTotal, `tool="${toolName}"`)
      addMetric(`tool_calls_success`, 'Successful tool calls', 'counter', m.callsSuccess, `tool="${toolName}"`)
      addMetric(`tool_calls_failed`, 'Failed tool calls', 'counter', m.callsFailed, `tool="${toolName}"`)
      addMetric(`tool_call_duration_avg_ms`, 'Average tool call duration in ms', 'gauge', this.avgDuration(m.durations), `tool="${toolName}"`)
    })

    addMetric('tool_calls_total', 'Total tool calls across all tools', 'counter', toolCallsTotal)
    addMetric('tool_calls_success', 'Successful tool calls across all tools', 'counter', toolCallsSuccess)
    addMetric('tool_calls_failed', 'Failed tool calls across all tools', 'counter', toolCallsFailed)

    addMetric('pool_size', 'Current connection pool size', 'gauge', this.poolSize)
    addMetric('pool_in_use', 'Connections currently in use', 'gauge', this.poolInUse)
    addMetric('pool_evictions', 'Total connection evictions', 'counter', this.poolEvictions)

    return lines.join('\n')
  }
}

/** 全局单例 */
export const mcpMetrics = new MCPMetricsCollector()
