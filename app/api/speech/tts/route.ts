import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { SpeechFactory } from '@/lib/speech/factory'
import { validateToken } from '@/lib/auth/token'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // 1. Validate access token
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const valid = await validateToken(token)
  if (!valid) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 2. Parse request body
  let body: { text?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }
  const { text } = body
  if (!text || text.trim() === '') {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  // 3. Load speech config
  const provider = await getConfig('speech_provider')
  if (!provider) {
    return NextResponse.json({ error: 'speech service not configured' }, { status: 503 })
  }
  const apiKey = await getConfig('speech_api_key')
  if (!apiKey) {
    return NextResponse.json({ error: 'speech service not configured' }, { status: 503 })
  }
  const region = await getConfig('speech_region') ?? undefined
  const voice = await getConfig('tts_voice') ?? undefined
  const baseURL = await getConfig('speech_base_url') ?? undefined

  // 4. Synthesize
  try {
    const speech = SpeechFactory.create(provider, apiKey, region, voice, baseURL)
    const { audio, mimeType } = await speech.synthesize(text)
    return new Response(new Uint8Array(audio), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': 'inline',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    console.error('TTS error:', msg)
    return NextResponse.json({ error: 'speech service error' }, { status: 502 })
  }
}
