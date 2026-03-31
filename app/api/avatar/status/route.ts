import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { validateToken } from '@/lib/auth/token'
import { AvatarFactory } from '@/lib/avatar/factory'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const valid = await validateToken(token)
  if (!valid) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const jobId = req.nextUrl.searchParams.get('jobId')
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  }

  const provider = await getConfig('AVATAR_PROVIDER')
  const apiKey = await getConfig('AVATAR_API_KEY')
  const actorId = await getConfig('AVATAR_ACTOR_ID')
  if (!provider || !apiKey || !actorId) {
    return NextResponse.json({ error: 'avatar service unavailable' }, { status: 503 })
  }

  try {
    const avatarProvider = AvatarFactory.create(provider, apiKey, actorId)
    const result = await avatarProvider.getVideoStatus(jobId)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'avatar service unavailable' }, { status: 503 })
  }
}
