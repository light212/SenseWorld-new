import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getConfig } from '@/lib/config'
import { LLMFactory } from '@/lib/ai/factory'
import type { ChatMessage } from '@/lib/ai/types'
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

  // 2. Parse and validate request body
  let body: { sessionId?: string; message?: string; images?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }
  const { sessionId, message, images } = body
  if (!message || message.trim() === '') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  // 3. Resolve or create session
  let session: { id: string }
  if (sessionId) {
    const existing = await prisma.chatSession.findUnique({ where: { id: sessionId } })
    if (!existing) {
      return NextResponse.json({ error: 'session not found' }, { status: 404 })
    }
    session = existing
  } else {
    session = await prisma.chatSession.create({ data: { accessToken: token } })
  }

  // 4. Load history
  const history = await prisma.message.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'asc' },
  })

  // 5. Save user message
  await prisma.message.create({
    data: { sessionId: session.id, role: 'user', content: message },
  })

  // 6. Read AI config
  // getConfig() uses an in-memory cache that is updated synchronously by setConfig().
  // Config changes made via the admin panel take effect on the next request with no restart required.
  const [aiProvider, aiApiKey, aiModel, systemPrompt] = await Promise.all([
    getConfig('AI_PROVIDER'),
    getConfig('AI_API_KEY'),
    getConfig('AI_MODEL'),
    getConfig('SYSTEM_PROMPT'),
  ])

  if (!aiProvider) {
    return NextResponse.json({ error: 'AI provider not configured' }, { status: 503 })
  }

  // 7. Create provider
  let provider
  try {
    provider = LLMFactory.create(aiProvider, aiApiKey ?? '', aiModel ?? '')
  } catch {
    return NextResponse.json({ error: 'AI provider not configured' }, { status: 503 })
  }

  // 8. Build messages for LLM
  const imageBase64 = provider.supportsVision && images?.[0] ? images[0] : undefined
  const chatMessages: ChatMessage[] = [
    ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message, ...(imageBase64 ? { imageBase64 } : {}) },
  ]

  // 9. Stream SSE response
  const encoder = new TextEncoder()
  let assistantContent = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of provider.chatStream(chatMessages)) {
          assistantContent += chunk
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
          )
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown error'
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: `LLM provider error: ${msg}` })}\n\n`)
        )
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } finally {
        controller.close()
        // 10. Persist assistant message asynchronously
        if (assistantContent) {
          prisma.message
            .create({
              data: { sessionId: session.id, role: 'assistant', content: assistantContent },
            })
            .catch((e) => console.error('Failed to save assistant message:', e))
        }
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Session-Id': session.id,
    },
  })
}
