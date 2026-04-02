import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { validateToken } from '@/lib/auth/token'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/speech/realtime-session?token=xxx
 *
 * Generates an ephemeral token for xAI Realtime API.
 * Frontend uses this token to connect directly to wss://api.x.ai/v1/realtime
 * without exposing the main API key.
 */
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

  // 2. Load xAI config
  const speechProvider = await getConfig('speech_provider')
  if (speechProvider !== 'xai') {
    return NextResponse.json({ error: 'xAI not configured' }, { status: 503 })
  }
  const apiKey = await getConfig('speech_api_key')
  if (!apiKey) {
    return NextResponse.json({ error: 'xAI API key not configured' }, { status: 503 })
  }

  // 3. Request ephemeral token from xAI
  try {
    const response = await fetch('https://api.x.ai/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2-audio',
        voice: await getConfig('tts_voice') || 'eve',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('xAI realtime session error:', response.status, errorText)
      return NextResponse.json(
        { error: 'xAI realtime session creation failed', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({
      ephemeralToken: data.client_secret?.value || data.ephemeral_token,
      expiresAt: data.client_secret?.expires_at || data.expires_at,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    console.error('Realtime session error:', msg)
    return NextResponse.json({ error: 'Failed to create realtime session' }, { status: 502 })
  }
}