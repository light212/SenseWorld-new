'use client';

import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ToolResultCardProps {
  toolName: string;
  result: string;
}

export default function ToolResultCard({ toolName, result }: ToolResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLongText = result.length > 150;
  const displayText = isLongText && !expanded ? result.substring(0, 150) + '...' : result;

  return (
    <div className={cn(
      'bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2.5',
      'border border-slate-200/40'
    )}>
      <div className="flex items-start gap-2.5">
        <CheckCircle2 className="size-3.5 text-slate-400 mt-0.5" strokeWidth={2.5} />
        <div className="flex-1">
          <div className="font-mono text-[11px] text-slate-400 tracking-widest uppercase mb-1">
            {toolName}
          </div>
          <div className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">
            {displayText}
          </div>
          {isLongText && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors duration-200 mt-1"
            >
              {expanded ? '收起' : '展开'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}