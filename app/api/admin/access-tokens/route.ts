import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const tokens = await prisma.accessToken.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const data = tokens.map((t) => ({
    id: t.id,
    token: t.token,
    label: t.label,
    expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
    enabled: t.enabled,
    createdAt: t.createdAt.toISOString(),
  }));

  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { label, expiresAt } = body as { label?: string; expiresAt?: string | null };

  if (expiresAt !== undefined && expiresAt !== null) {
    const date = new Date(expiresAt);
    if (isNaN(date.getTime()) || date <= new Date()) {
      return NextResponse.json({ ok: false, error: 'expiresAt must be a future date' }, { status: 400 });
    }
  }

  const token = await prisma.accessToken.create({
    data: {
      token: crypto.randomUUID(),
      label: label ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      enabled: true,
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      id: token.id,
      token: token.token,
      label: token.label,
      expiresAt: token.expiresAt ? token.expiresAt.toISOString() : null,
      enabled: token.enabled,
      createdAt: token.createdAt.toISOString(),
    },
  });
}
