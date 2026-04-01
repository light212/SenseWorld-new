import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateToken } from '@/lib/auth/token';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const valid = await validateToken(token);
    if (!valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const sessions = await prisma.chatSession.findMany({
      where: { accessToken: token },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { content: true, role: true },
        },
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Sessions route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
