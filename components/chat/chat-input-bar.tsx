'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { ArrowRight, Square } from 'lucide-react'

interface ChatInputBarProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled: boolean
  children?: React.ReactNode
}

export function ChatInputBar({ value, onChange, onSend, disabled, children }: ChatInputBarProps) {
  const [isFocused, setIsFocused] = useState(false)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSend()
    }
  }

  const isExpanded = isFocused || value.length > 0

  return (
    /* Gradient fade above the input bar */
    <div className="shrink-0 px-4 pb-6 pt-2 bg-gradient-to-t from-white via-white to-transparent flex justify-center">
      <div
        className={clsx(
          'bg-white transition-all duration-300 ease-out rounded-3xl flex flex-col justify-end overflow-hidden w-full',
          isExpanded
            ? 'max-w-3xl shadow-[0_4px_32px_-4px_rgba(0,0,0,0.12)] border border-slate-200/80'
            : 'max-w-2xl shadow-[0_2px_12px_-2px_rgba(0,0,0,0.06)] border border-slate-100/60'
        )}
      >
        <div className="relative flex items-end p-2 gap-2">

          {/* Left slot — voice recorder or other actions */}
          {children && (
            <div className="flex gap-1 pl-2 mb-1.5">
              {children}
            </div>
          )}

          {/* Textarea */}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder="Ask SenseWorld anything…"
            rows={isExpanded ? 3 : 1}
            className="flex-1 bg-transparent border-none focus:ring-0 outline-none resize-none py-3 px-2 text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 disabled:opacity-50"
            style={{
              minHeight: isExpanded ? '80px' : '44px',
              overflowY: 'auto',
            }}
          />

          {/* Submit button */}
          <button
            onClick={onSend}
            disabled={disabled || !value.trim()}
            aria-label="发送"
            className={clsx(
              'mb-1 mr-1 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300',
              !disabled && value.trim()
                ? 'bg-slate-900 text-white shadow-sm hover:scale-105 active:scale-95'
                : 'bg-slate-50 text-slate-300 cursor-not-allowed'
            )}
          >
            {disabled
              ? <Square size={14} fill="currentColor" />
              : <ArrowRight size={18} strokeWidth={2.5} />
            }
          </button>

        </div>
      </div>
    </div>
  )
}
