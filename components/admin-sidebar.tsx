'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Settings, KeyRound, Command, LogOut } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/admin/config', label: '系统运维', icon: Settings },
  { href: '/admin/access-tokens', label: '访问控制', icon: KeyRound }
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } finally {
      router.push('/admin/login');
    }
  }

  if (pathname === '/admin/login') return null;

  return (
    <aside className="fixed left-6 top-6 bottom-6 w-64 flex flex-col z-20">
      <div className="flex-1 glass-panel rounded-3xl flex flex-col pt-8 pb-6 shadow-sm overflow-hidden border border-slate-200/40">
        
        {/* Brand Header */}
        <div className="px-8 pb-10">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white mb-6">
            <Command strokeWidth={2.5} size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            SenseWorld
          </h1>
          <p className="text-[11px] font-bold tracking-widest text-slate-400 mt-1 uppercase">
            核心中枢
          </p>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 mt-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'group flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 text-[13px] font-bold tracking-wider',
                  isActive 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon 
                  className={clsx(
                    "w-[18px] h-[18px] transition-colors duration-200", 
                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-900"
                  )} 
                  strokeWidth={2.5} 
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile + Logout */}
        <div className="px-4 mt-auto space-y-2">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden shrink-0">
              <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Admin&backgroundColor=f8fafc" alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-[13px] font-bold text-slate-900 truncate">超级管理员</p>
              <p className="text-[11px] font-medium text-slate-400 truncate">最高系统权限</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[13px] font-bold tracking-wider text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 disabled:opacity-50"
          >
            <LogOut size={16} strokeWidth={2.5} />
            {loggingOut ? '退出中...' : '退出登录'}
          </button>
        </div>
      </div>
    </aside>
  );
}
