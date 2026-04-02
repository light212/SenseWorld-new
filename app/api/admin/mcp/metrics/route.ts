import { NextResponse } from 'next/server'
import { mcpMetrics } from '@/lib/mcp/metrics'

/**
 * GET /api/admin/mcp/metrics
 *
 * 返回 MCP 运行时监控指标。
 * - Accept: application/json（默认）-> JSON 格式
 * - Accept: text/plain -> Prometheus text exposition 格式
 *
 * 受 middleware.ts 保护（/api/admin/:path* 需要 admin_token）
 */
export async function GET(req: Request) {
  try {
    const accept = req.headers.get('accept') || ''

    if (accept.includes('text/plain')) {
      // Prometheus 格式
      const prometheusText = mcpMetrics.exportPrometheus()
      return new Response(prometheusText, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' },
      })
    }

    // JSON 格式（默认）
    const data = mcpMetrics.toJSON()
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
