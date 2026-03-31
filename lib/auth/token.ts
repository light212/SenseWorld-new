import { prisma } from '@/lib/db'

export async function validateToken(token: string): Promise<boolean> {
  const record = await prisma.accessToken.findUnique({ where: { token } })
  if (!record) return false
  if (!record.enabled) return false
  if (record.expiresAt && record.expiresAt <= new Date()) return false
  return true
}
