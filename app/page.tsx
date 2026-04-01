'use client';

import { useChat } from '@ai-sdk/react';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';

export default function Home() {
  const { messages, append, isLoading } = useChat({
    api: '/api/chat',
  });

  const handleSend = (content: string) => {
    append({ role: 'user', content });
  };

  return (
    <main className="flex min-h-screen flex-col bg-white overflow-hidden relative selection:bg-slate-200">
      
      {/* Header Gradient Area (Optional, for aesthetic fade) */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />

      {/* Main Document Flow */}
      <div className="flex-1 overflow-y-auto w-full mx-auto relative z-0">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      {/* Floating Input Capsule */}
      <ChatInput 
        onSend={handleSend} 
        isLoading={isLoading} 
      />

    </main>
  );
}
