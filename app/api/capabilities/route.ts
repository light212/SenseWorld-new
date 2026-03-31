import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/token'
import { getConfig } from '@/lib/config'

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

  const speechProvider = await getConfig('SPEECH_PROVIDER')
  const aiProvider = await getConfig('AI_PROVIDER')
  const aiApiKey = await getConfig('AI_API_KEY')
  const aiModel = await getConfig('AI_MODEL')

  // Determine vision support by instantiating the LLM provider
  let supportsVision = false
  if (aiProvider && aiApiKey && aiModel) {
    try {
      const { LLMFactory } = await import('@/lib/ai/factory')
      const aiBaseUrl = await getConfig('AI_BASE_URL')
      const llm = LLMFactory.create(aiProvider, aiApiKey, aiModel, aiBaseUrl ?? undefined)
      supportsVision = llm.supportsVision
    } catch {
      supportsVision = false
    }
  }

  const supportsSTT = !!speechProvider

  const avatarProvider = await getConfig('AVATAR_PROVIDER')
  const supportsAvatar = !!avatarProvider
  const supportsTTS = !!speechProvider && !supportsAvatar

  return NextResponse.json({ supportsSTT, supportsTTS, supportsVision, supportsAvatar })
}
