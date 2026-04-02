import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { signAdminJwt } from '@/lib/auth/jwt';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  // Rate limit: 5 login attempts per minute per IP
  const clientIp = getClientIp(request);
  if (isRateLimited(`login:${clientIp}`, 5)) {
    return NextResponse.json({ ok: false, error: 'Too many login attempts. Please try again later.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { username, password } = body as Record<string, unknown>;

  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ ok: false, error: 'Missing username or password' }, { status: 400 });
  }

  const admin = await prisma.adminUser.findUnique({ where: { username } });

  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);

  if (!valid) {
    return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await signAdminJwt({ sub: String(admin.id), username: admin.username });

  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return response;
}
