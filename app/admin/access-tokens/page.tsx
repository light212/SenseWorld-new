import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
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
    <div className="w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">访客通行证管理</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">随时生成、禁用前台外部访客体验平台的唯一邀请链接及二维码。</p>
        </div>
      </div>
      <AccessTokenList initialTokens={tokens} baseUrl={baseUrl} />
    </div>
  );
}
