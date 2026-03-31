import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { SpeechFactory } from '@/lib/speech/factory'
import { validateToken } from '@/lib/auth/token'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_SIZE = 25 * 1024 * 1024 // 25MB

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

  // 2. Load speech config
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

  // 3. Parse multipart form data
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'audio is required' }, { status: 400 })
  }
  const audioFile = formData.get('audio')
  if (!audioFile || !(audioFile instanceof Blob)) {
    return NextResponse.json({ error: 'audio is required' }, { status: 400 })
  }

  // 4. Check file size
  if (audioFile.size > MAX_SIZE) {
    return NextResponse.json({ error: 'file too large, max 25MB' }, { status: 400 })
  }

  // 5. Convert to Buffer
  const arrayBuffer = await audioFile.arrayBuffer()
  const audioBuffer = Buffer.from(arrayBuffer)
  const mimeType = audioFile.type || 'audio/webm'

  // 6. Transcribe
  try {
    const speech = SpeechFactory.create(provider, apiKey, region, voice)
    const text = await speech.transcribe(audioBuffer, mimeType)
    return NextResponse.json({ text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    console.error('STT error:', msg)
    return NextResponse.json({ error: 'speech service error' }, { status: 502 })
  }
}
