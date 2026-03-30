import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  let dbStatus = 'connected'

  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    dbStatus = 'disconnected'
  }

  const status = dbStatus === 'connected' ? 'ok' : 'degraded'

  return NextResponse.json(
    { status, database: dbStatus, timestamp: new Date().toISOString() },
    { status: status === 'ok' ? 200 : 503 }
  )
}
