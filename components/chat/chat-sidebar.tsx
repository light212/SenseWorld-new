'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { MessageSquare, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface SessionPreview {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: { content: string; role: string }[];
}

interface ChatSidebarProps {
  token: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function getSessionTitle(session: SessionPreview): string {
  const firstMsg = session.messages[0];
  if (!firstMsg) return '新对话';
  const text = firstMsg.content.trim();
  return text.length > 28 ? text.slice(0, 28) + '…' : text;
}

export function ChatSidebar({ token }: ChatSidebarProps) {
  const [sessions, setSessions] = useState<SessionPreview[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const router = useRouter();
  const activeChatId = params?.id as string | undefined;

  const fetchSessions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/sessions?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSessions();
    // Refresh sidebar when navigating to a new chat
    const interval = setInterval(fetchSessions, 8000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const handleNewChat = () => {
    router.push(`/?token=${encodeURIComponent(token)}`);
  };

  // Group sessions by date label
  const grouped: { label: string; items: SessionPreview[] }[] = [];
  const labelMap = new Map<string, SessionPreview[]>();
  for (const s of sessions) {
    const label = formatDate(s.updatedAt);
    if (!labelMap.has(label)) labelMap.set(label, []);
    labelMap.get(label)!.push(s);
  }
  Array.from(labelMap.entries()).forEach(([label, items]) => {
    grouped.push({ label, items });
  });

  return (
    <aside
      aria-label="对话历史"
      className={clsx(
        'relative flex flex-col h-full transition-all duration-300 ease-in-out shrink-0',
        collapsed ? 'w-14' : 'w-64'
      )}
    >
      {/* Panel */}
      <div className="flex flex-col h-full bg-white/70 backdrop-blur-xl border-r border-slate-100/80 overflow-hidden">
        {/* Header */}
        <div className={clsx('flex items-center pt-5 pb-3 px-3 gap-2', collapsed && 'justify-center')}>
          {!collapsed && (
            <span className="flex-1 text-[11px] font-bold tracking-widest text-slate-400 uppercase px-1">
              历史对话
            </span>
          )}
          <button
            onClick={handleNewChat}
            title="新建对话"
            aria-label="新建对话"
            className={clsx(
              'flex items-center justify-center w-8 h-8 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all duration-150',
              collapsed && 'w-9 h-9'
            )}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {loading && !collapsed && (
            <div className="px-2 py-8 flex flex-col items-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-slate-400 animate-spin" />
              <span className="text-[11px] text-slate-300">加载中…</span>
            </div>
          )}

          {!loading && sessions.length === 0 && !collapsed && (
            <div className="px-2 py-8 flex flex-col items-center gap-2 text-center">
              <MessageSquare size={20} className="text-slate-200" />
              <span className="text-[11px] text-slate-300">暂无历史对话</span>
            </div>
          )}

          {!collapsed &&
            grouped.map(({ label, items }) => (
              <div key={label}>
                <p className="px-2 mb-1 text-[10px] font-bold tracking-widest text-slate-300 uppercase">
                  {label}
                </p>
                <div className="space-y-0.5">
                  {items.map((session) => {
                    const isActive = session.id === activeChatId;
                    return (
                      <Link
                        key={session.id}
                        href={`/c/${session.id}?token=${encodeURIComponent(token)}`}
                        className={clsx(
                          'group flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-150 text-[13px]',
                          isActive
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        )}
                      >
                        <MessageSquare
                          size={13}
                          strokeWidth={2}
                          className={clsx(
                            'shrink-0 transition-colors',
                            isActive ? 'text-white/70' : 'text-slate-300 group-hover:text-slate-500'
                          )}
                        />
                        <span className="truncate leading-snug">{getSessionTitle(session)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Collapse toggle button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 hover:shadow-md transition-all duration-150"
        title={collapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        {collapsed ? <ChevronRight size={12} strokeWidth={2.5} /> : <ChevronLeft size={12} strokeWidth={2.5} />}
      </button>
    </aside>
  );
}
