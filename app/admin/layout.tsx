'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin-sidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50/50">
      <AdminSidebar />
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative w-full hide-scrollbar pl-[310px]">
        
        {/* Main Content Pane */}
        <div className="relative z-10 w-full p-6 lg:p-10 max-w-[1600px] h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
