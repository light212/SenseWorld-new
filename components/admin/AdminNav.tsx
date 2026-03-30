'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminNav() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
      <span className="font-semibold text-gray-800">SenseWorld Admin</span>
      <Link href="/admin/config" className="text-sm text-gray-600 hover:text-gray-900">配置</Link>
      <Link href="/admin/access-tokens" className="text-sm text-gray-600 hover:text-gray-900">访客入口</Link>
      <button
        onClick={handleLogout}
        className="ml-auto text-sm text-gray-500 hover:text-gray-700"
      >
        退出
      </button>
    </nav>
  );
}
