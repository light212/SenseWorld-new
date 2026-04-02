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

  // Use lowercase keys to match STT/TTS routes
  const speechProvider = await getConfig('speech_provider')
  const voiceMode = await getConfig('speech_voice_mode')
  const aiProvider = await getConfig('ai_provider')
  const aiApiKey = await getConfig('ai_api_key')
  const aiModel = await getConfig('ai_model')

  // Determine vision support by instantiating the LLM provider
  let supportsVision = false
  if (aiProvider && aiApiKey && aiModel) {
    try {
      const { LLMFactory } = await import('@/lib/ai/factory')
      const aiBaseUrl = await getConfig('ai_base_url')
      const llm = LLMFactory.create(aiProvider, aiApiKey, aiModel, aiBaseUrl ?? undefined)
      supportsVision = llm.supportsVision
    } catch {
      supportsVision = false
    }
  }

  // xAI standard mode does not support STT; only realtime voice is available
  const supportsSTT = !!speechProvider && speechProvider !== 'xai'

  const avatarProvider = await getConfig('avatar_provider')
  const supportsAvatar = !!avatarProvider
  const supportsTTS = !!speechProvider && !supportsAvatar

  // realtimeVoice flag for xAI realtime mode
  const realtimeVoice = speechProvider === 'xai' && voiceMode === 'realtime'

  return NextResponse.json({ supportsSTT, supportsTTS, supportsVision, supportsAvatar, realtimeVoice })
}
