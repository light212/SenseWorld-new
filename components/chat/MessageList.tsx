'use client';

import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { Sparkles, User2, Loader2 } from 'lucide-react';
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data';
  content: string;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="w-full max-w-3xl mx-auto px-6 pt-16 pb-40 flex flex-col gap-16">
      
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center my-auto pt-32 text-center opacity-40">
          <Sparkles size={48} strokeWidth={1} className="mb-6" />
          <h2 className="text-2xl font-light tracking-wide mb-2 pointer-events-none">SenseWorld AI</h2>
          <p className="text-sm font-medium tracking-widest uppercase">Multi-modal Platform Core</p>
        </div>
      )}

      {messages.map((msg) => (
        <div key={msg.id} className="group flex flex-col gap-3">
          {/* Identity Header */}
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
            
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-bold tracking-widest text-slate-900 uppercase">
                {msg.role === 'assistant' ? 'SenseWorld AI' : 'You'}
              </span>
            </div>
          </div>

          {/* Message Content (Editorial Flow) */}
          <div className="pl-0 md:pl-10">
            <div 
              className={clsx(
                "text-[15px] leading-[1.8] md:leading-[2] tracking-[0.02em] whitespace-pre-wrap",
                msg.role === 'assistant' ? "text-slate-800 font-medium" : "text-slate-600"
              )}
            >
              {msg.content}
            </div>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex items-center justify-center py-4">
           <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      )}
      
      {/* Auto-scroll anchor point */}
      <div ref={bottomRef} className="h-1 w-full" />
    </div>
  );
}
