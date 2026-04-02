'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolErrorCardProps {
  error: string;
}

export default function ToolErrorCard({ error }: ToolErrorCardProps) {
  return (
    <div className={cn(
      'bg-red-50/40 rounded-xl px-4 py-2.5',
      'border border-red-100/60'
    )}>
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="size-3.5 text-red-300 mt-0.5" strokeWidth={2.5} />
        <div className="text-[13px] text-red-400 whitespace-pre-wrap">
          {error}
        </div>
      </div>
    </div>
  );
}