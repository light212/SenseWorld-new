import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import AdminNav from '@/components/admin/AdminNav';
import AccessTokenList from '@/components/admin/AccessTokenList';
import type { AccessTokenItem } from '@/lib/types/admin';

export default async function AccessTokensPage() {
  const headersList = headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  const rows = await prisma.accessToken.findMany({ orderBy: { createdAt: 'desc' } });

  const tokens: AccessTokenItem[] = rows.map((t) => ({
    id: t.id,
    token: t.token,
    label: t.label,
    expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
    enabled: t.enabled,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-6">访客入口管理</h1>
        <AccessTokenList initialTokens={tokens} baseUrl={baseUrl} />
      </div>
    </div>
  );
}
