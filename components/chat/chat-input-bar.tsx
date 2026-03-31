'use client'

import { useRef } from 'react'

interface ChatInputBarProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled: boolean
  children?: React.ReactNode
}

export function ChatInputBar({ value, onChange, onSend, disabled, children }: ChatInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSend()
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3 safe-area-bottom">
      <div className="flex items-end gap-2 max-w-2xl mx-auto">
        {children}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="输入消息…"
          rows={1}
          className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 min-h-[44px] max-h-32"
          style={{ overflowY: 'auto' }}
        />
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="shrink-0 h-11 w-11 rounded-full bg-blue-500 text-white flex items-center justify-center disabled:opacity-40 active:bg-blue-600"
          aria-label="发送"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
