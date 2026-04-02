import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth/token'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface MessageInput {
  role: 'user' | 'assistant'
  content: string
}

/**
 * POST /api/chat/messages?token=xxx
 *
 * Batch writes transcript messages to the database.
 * Used by realtime voice feature to save conversation history after call ends.
 *
 * Body: { sessionId: string, messages: Array<{role, content}> }
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

  // 2. Parse request body
  let body: { sessionId?: string; messages?: MessageInput[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { sessionId, messages } = body
  if (!sessionId || !messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'sessionId and messages array are required' }, { status: 400 })
  }

  // 3. Verify session exists
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } })
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // 4. Batch insert messages
  try {
    await prisma.message.createMany({
      data: messages.map((msg) => ({
        sessionId,
        role: msg.role,
        content: msg.content,
      })),
    })
    return NextResponse.json({ saved: messages.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    console.error('Batch message insert error:', msg)
    return NextResponse.json({ error: 'Failed to save messages' }, { status: 502 })
  }
}