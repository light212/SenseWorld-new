import { prisma } from '@/lib/db';
import { maskApiKey } from '@/lib/config';
import ConfigForm from '@/components/admin/ConfigForm';
import type { ConfigItem } from '@/lib/types/admin';

export default async function ConfigPage() {
  const rows = await prisma.config.findMany({ orderBy: { key: 'asc' } });

  const configs: ConfigItem[] = rows.map((row) => ({
    key: row.key,
    value: row.key.endsWith('_KEY') ? maskApiKey(row.value) : row.value,
    description: row.description,
    updatedAt: row.updatedAt.toISOString(),
  }));

  return (
    <div className="w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">运营配置中心</h1>
        <p className="text-sm text-slate-500 mt-2 font-medium">管理您的 AI 模型提供商密钥、多模态接口与底层系统运作参数。</p>
      </div>
      <ConfigForm initialConfigs={configs} />
    </div>
  );
}
