'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChatInterface } from '@/components/chat/chat-interface'

function NewChatInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  return <ChatInterface token={token} />
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-slate-300 text-sm">加载中…</div>}>
      <NewChatInner />
    </Suspense>
  )
}
