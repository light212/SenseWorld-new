import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { validateToken } from '@/lib/auth/token'
import { AvatarFactory } from '@/lib/avatar/factory'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const valid = await validateToken(token)
  if (!valid) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const provider = await getConfig('AVATAR_PROVIDER')
  if (!provider) {
    return NextResponse.json({ error: 'avatar service unavailable' }, { status: 503 })
  }

  const apiKey = await getConfig('AVATAR_API_KEY')
  const actorId = await getConfig('AVATAR_ACTOR_ID')
  if (!apiKey || !actorId) {
    return NextResponse.json({ error: 'avatar service unavailable' }, { status: 503 })
  }

  let body: { text?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  if (!body.text || typeof body.text !== 'string') {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const maxCharsStr = await getConfig('AVATAR_MAX_CHARS')
  const maxChars = maxCharsStr ? parseInt(maxCharsStr, 10) : 300
  const text = body.text.slice(0, maxChars)

  try {
    const avatarProvider = AvatarFactory.create(provider, apiKey, actorId)
    const jobId = await avatarProvider.submitVideo(text)
    return NextResponse.json({ jobId })
  } catch {
    return NextResponse.json({ error: 'avatar service unavailable' }, { status: 503 })
  }
}
