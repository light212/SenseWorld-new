'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatSidebar } from '@/components/chat/chat-sidebar';

function ChatLayoutInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* History sidebar — only shown when token is present */}
      {token && <ChatSidebar token={token} />}

      {/* Main chat area */}
      <main className="flex-1 min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-screen">{children}</div>}>
      <ChatLayoutInner>{children}</ChatLayoutInner>
    </Suspense>
  );
}
