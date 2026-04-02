import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminJwt } from '@/lib/auth/jwt'
import { HttpMCPClient } from '@/lib/mcp/http-client'
import { getConfig } from '@/lib/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.cookies.get('admin_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const payload = await verifyAdminJwt(token)
  if (!payload) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  const { url } = body
  if (!url || typeof url !== 'string' || !url.trim()) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  // Read real API key from DB (frontend only receives masked value)
  const apiKey = await getConfig('MCP_API_KEY')

  // ── Connect via official SDK and probe tools/list ─────────────────────────
  // A successful tools/list call is the most reliable connectivity proof:
  //   • confirms the URL is reachable
  //   • confirms the server speaks MCP protocol
  //   • confirms the API key (if required) is accepted
  const client = new HttpMCPClient()
  try {
    await client.connect(url.trim(), apiKey)

    const tools = await client.listTools()

    return NextResponse.json({
      success: true,
      message: `连接成功，发现 ${tools.length} 个工具${tools.length > 0 ? `：${tools.map((t) => t.name).join(' / ')}` : ''}`,
      tools,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '连接失败'
    return NextResponse.json({ success: false, message })
  } finally {
    await client.disconnect().catch(() => {})
  }
}