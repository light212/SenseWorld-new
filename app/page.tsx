'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChatInterface } from '@/components/chat/chat-interface'
import { ChatSidebar } from '@/components/chat/chat-sidebar'

function ChatHomeInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  // No token → send to admin to get one
  useEffect(() => {
    if (!token) {
      router.replace('/admin/config')
    }
  }, [token, router])

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-300 text-sm">
        重定向中…
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <ChatSidebar token={token} />
      <main className="flex-1 min-w-0 overflow-hidden">
        <ChatInterface token={token} />
      </main>
    </div>
  )
}

export default function ChatHomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-slate-300 text-sm">
          加载中…
        </div>
      }
    >
      <ChatHomeInner />
    </Suspense>
  )
}
