import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { validateToken } from '@/lib/auth/token'
import { ChatInterface } from '@/components/chat/chat-interface'
import type { DisplayMessage } from '@/lib/types/chat'

interface HistoryChatPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function HistoryChatPage({ params, searchParams }: HistoryChatPageProps) {
  const { id } = await params
  const { token } = await searchParams

  // Auth guard
  if (!token) return notFound()
  const valid = await validateToken(token)
  if (!valid) return notFound()

  // Fetch session with ownership check
  const session = await prisma.chatSession.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          imageUrl: true,
          createdAt: true,
        },
      },
    },
  })

  if (!session || session.accessToken !== token) {
    return notFound()
  }

  // Shape into DisplayMessage[]
  const initialMessages: DisplayMessage[] = session.messages.map((m) => ({
    id: String(m.id),
    role: m.role as 'user' | 'assistant',
    content: m.content,
    imageUrl: m.imageUrl ?? undefined,
    createdAt: m.createdAt.toISOString(),
    streaming: false,
  }))

  return (
    <ChatInterface
      token={token}
      initialSessionId={id}
      initialMessages={initialMessages}
    />
  )
}
