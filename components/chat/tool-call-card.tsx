'use client';

import { Loader2, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolCallCardProps {
  toolName: string;
  isStreaming?: boolean;
}

export default function ToolCallCard({ toolName, isStreaming = true }: ToolCallCardProps) {
  return (
    <div className={cn(
      'bg-slate-50/80 backdrop-blur-sm rounded-xl px-4 py-2.5',
      'border border-slate-200/60',
      'flex items-center gap-2.5'
    )}>
      {isStreaming ? (
        <Loader2 className="size-3.5 text-slate-400 animate-spin" strokeWidth={2.5} />
      ) : (
        <Wrench className="size-3.5 text-slate-400" strokeWidth={2.5} />
      )}
      <span className="font-mono text-[13px] text-slate-500 tracking-wide">
        {toolName}
      </span>
      <span className="text-[13px] text-slate-400">正在执行...</span>
    </div>
  );
}