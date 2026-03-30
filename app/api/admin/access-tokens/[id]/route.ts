import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { enabled } = body as { enabled?: boolean };

  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'enabled must be a boolean' }, { status: 400 });
  }

  const existing = await prisma.accessToken.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Access token not found' }, { status: 404 });
  }

  const updated = await prisma.accessToken.update({
    where: { id },
    data: { enabled },
  });

  return NextResponse.json({
    ok: true,
    data: {
      id: updated.id,
      token: updated.token,
      label: updated.label,
      expiresAt: updated.expiresAt ? updated.expiresAt.toISOString() : null,
      enabled: updated.enabled,
      createdAt: updated.createdAt.toISOString(),
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 });
  }

  const existing = await prisma.accessToken.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Access token not found' }, { status: 404 });
  }

  await prisma.accessToken.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
