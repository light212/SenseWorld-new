import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminJwt } from '@/lib/auth/jwt'
import { HttpMCPClient } from '@/lib/mcp/http-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // Verify admin session
  const token = req.cookies.get('admin_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const payload = await verifyAdminJwt(token)
  if (!payload) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

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

  // Validate protocol via HttpMCPClient.connect(), then probe reachability with a minimal request
  const client = new HttpMCPClient()
  try {
    await client.connect(url.trim())
  } catch (err) {
    const message = err instanceof Error ? err.message : '地址无效'
    return NextResponse.json({ success: false, message })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(url.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '' }),
      signal: controller.signal,
    })
    if (!res.ok) {
      return NextResponse.json({ success: false, message: `服务器返回 HTTP ${res.status}` })
    }
    return NextResponse.json({ success: true, message: '连接成功' })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ success: false, message: '连接超时（5秒）' })
    }
    const message = err instanceof Error ? err.message : '连接失败'
    return NextResponse.json({ success: false, message })
  } finally {
    clearTimeout(timer)
    await client.disconnect()
  }
}
