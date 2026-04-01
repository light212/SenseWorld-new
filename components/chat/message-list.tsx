'use client'

import { useEffect, useRef } from 'react'
import clsx from 'clsx'
import { Sparkles, User2, Loader2 } from 'lucide-react'
import type { DisplayMessage } from '@/lib/types/chat'

export function MessageList({ messages }: { messages: DisplayMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-3xl mx-auto px-6 pt-16 pb-8 flex flex-col gap-16">

        {/* Empty state branding */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center my-auto pt-32 text-center opacity-40 select-none pointer-events-none">
            <Sparkles size={48} strokeWidth={1} className="mb-6" />
            <h2 className="text-2xl font-light tracking-wide mb-2">SenseWorld AI</h2>
            <p className="text-sm font-medium tracking-widest uppercase">Multi-modal Platform Core</p>
          </div>
        )}

        {/* Message list — editorial document flow */}
        {messages.map((msg) => (
          <div key={msg.id} className="group flex flex-col gap-3">

            {/* Identity header */}
            <div className="flex items-center gap-3">
              {msg.role === 'assistant' ? (
                <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center text-white shadow-sm">
                  <Sparkles size={14} strokeWidth={2.5} />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                  <User2 size={14} strokeWidth={2.5} />
                </div>
              )}
              <span className="text-[13px] font-bold tracking-widest text-slate-900 uppercase">
                {msg.role === 'assistant' ? 'SenseWorld AI' : 'You'}
              </span>
            </div>

            {/* Message content */}
            <div className="pl-0 md:pl-10">
              {msg.content ? (
                <div
                  className={clsx(
                    'text-[15px] leading-[1.8] md:leading-[2] tracking-[0.02em] whitespace-pre-wrap',
                    msg.role === 'assistant' ? 'text-slate-800 font-medium' : 'text-slate-600'
                  )}
                >
                  {msg.content}
                  {/* Blinking cursor while streaming */}
                  {msg.streaming && (
                    <span className="inline-block w-[2px] h-[1em] ml-0.5 bg-slate-400 animate-pulse align-middle" />
                  )}
                </div>
              ) : (
                msg.streaming && (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-300 mt-1" />
                )
              )}
            </div>

          </div>
        ))}

        <div ref={bottomRef} className="h-1 w-full" />
      </div>
    </div>
  )
}
