'use client'

import type { DisplayMessage } from '@/lib/types/chat'

export function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`} role="log" aria-live="polite">
      <article
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        } ${message.streaming ? 'opacity-80' : ''}`}
        aria-label={isUser ? '用户消息' : 'AI 回复'}
      >
        {message.content}
        {message.streaming && (
          <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse align-middle" aria-label="正在输入" />
        )}
      </article>
    </div>
  )
}
