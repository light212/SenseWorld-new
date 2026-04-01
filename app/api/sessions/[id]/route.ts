import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateToken } from '@/lib/auth/token';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const valid = await validateToken(token);
    if (!valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { id } = await params;

    const session = await prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            imageUrl: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 });

    // Security: ensure the session belongs to this token
    if (session.accessToken !== token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      sessionId: session.id,
      createdAt: session.createdAt,
      messages: session.messages,
    });
  } catch (error) {
    console.error('Session detail route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
