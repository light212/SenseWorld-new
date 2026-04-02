import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { maskApiKey, invalidateConfigCache } from '@/lib/config';

export async function GET() {
  const rows = await prisma.config.findMany({ orderBy: { key: 'asc' } });

  const data = rows.map((row) => ({
    key: row.key,
    value: row.key.endsWith('_KEY') ? maskApiKey(row.value) : row.value,
    description: row.description,
    updatedAt: row.updatedAt.toISOString(),
  }));

  return NextResponse.json({ ok: true, data });
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { configs } = body as { configs?: Array<{ key: string; value: string }> };

  if (!Array.isArray(configs) || configs.length === 0) {
    return NextResponse.json({ ok: false, error: 'configs must be a non-empty array' }, { status: 400 });
  }

  for (const item of configs) {
    if (typeof item.key !== 'string' || typeof item.value !== 'string') {
      return NextResponse.json({ ok: false, error: 'Each config must have string key and value' }, { status: 400 });
    }
  }

  // Filter out masked values (containing ****) - these should not be saved
  // Only update keys if user explicitly entered a new value
  const validConfigs = configs.filter((item) => !item.value.includes('****'));

  if (validConfigs.length === 0) {
    return NextResponse.json({ ok: true, message: 'No valid configs to update' });
  }

  await Promise.all(
    validConfigs.map((item) =>
      prisma.config.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value },
      })
    )
  );

  // Invalidate config cache so next requests get fresh values
  invalidateConfigCache();

  return NextResponse.json({ ok: true });
}
