import { prisma } from '@/lib/db';

const cache = new Map<string, string>();
let cacheLoaded = false;

async function loadCache(): Promise<void> {
  if (cacheLoaded) return;
  const rows = await prisma.config.findMany();
  for (const row of rows) {
    cache.set(row.key, row.value);
  }
  cacheLoaded = true;
}

export async function getConfig(key: string): Promise<string | undefined> {
  await loadCache();
  if (cache.has(key)) return cache.get(key);
  return process.env[key];
}

export async function setConfig(key: string, value: string): Promise<void> {
  await prisma.config.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  cache.set(key, value);
}

export function maskApiKey(value: string): string {
  if (!value) return '';
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}
