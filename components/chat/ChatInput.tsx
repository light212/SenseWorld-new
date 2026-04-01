'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { ArrowRight, Paperclip, Mic, Square } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleLocalSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-6 pointer-events-none flex justify-center z-50">
      {/* Capsule Container */}
      <form 
        onSubmit={handleLocalSubmit}
        className={clsx(
          "pointer-events-auto bg-white transition-all duration-300 ease-out rounded-3xl flex flex-col justify-end overflow-hidden",
          isFocused || (input || '').length > 0 
            ? "w-full max-w-3xl shadow-[0_4px_32px_-4px_rgba(0,0,0,0.12)] border border-slate-200/80" 
            : "w-full max-w-2xl shadow-[0_2px_12px_-2px_rgba(0,0,0,0.06)] border border-slate-100/60"
        )}
      >
        <div className="relative flex items-end p-2 gap-2">
          
          {/* Subtle actions (left) */}
          <div className="flex gap-1 pl-2 mb-1.5 opacity-0 sm:opacity-100 transition-opacity">
            <button type="button" className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors">
              <Paperclip size={16} strokeWidth={2.5} />
            </button>
            <button type="button" className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors">
              <Mic size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Textarea */}
          <textarea
            value={input || ''}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleLocalSubmit();
              }
            }}
            placeholder="Ask SenseWorld anything..."
            rows={isFocused || (input || '').length > 0 ? 3 : 1}
            className="flex-1 bg-transparent border-none focus:ring-0 outline-none resize-none py-3 px-2 text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 hide-scrollbar transition-all duration-300"
            style={{ minHeight: isFocused || (input || '').length > 0 ? '80px' : '44px' }}
          />

          {/* Submit Button (Ghost / Minimalist) */}
          <button 
            type="submit"
            className={clsx(
              "mb-1 mr-1 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
              (input || '').trim().length > 0 || isLoading
                ? "bg-slate-900 text-white shadow-sm hover:scale-105 active:scale-95" 
                : "bg-slate-50 text-slate-300 cursor-not-allowed"
            )}
            disabled={(input || '').trim().length === 0 && !isLoading}
          >
            {isLoading ? <Square size={14} fill="currentColor" /> : <ArrowRight size={18} strokeWidth={2.5} />}
          </button>
          
        </div>
      </form>
    </div>
  );
}
