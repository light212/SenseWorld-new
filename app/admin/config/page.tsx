import { prisma } from '@/lib/db';
import { maskApiKey } from '@/lib/config';
import AdminNav from '@/components/admin/AdminNav';
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
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-6">运营配置</h1>
        <ConfigForm initialConfigs={configs} />
      </div>
    </div>
  );
}
