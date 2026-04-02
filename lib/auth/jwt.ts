import { SignJWT, jwtVerify } from 'jose';

function getSecret(): Uint8Array {
  const secretValue = process.env.JWT_SECRET;
  if (!secretValue) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    console.warn('[WARN] JWT_SECRET not set, using insecure dev fallback. Set JWT_SECRET in production!');
    return new TextEncoder().encode('dev-secret-change-in-production');
  }
  return new TextEncoder().encode(secretValue);
}

const expiresIn = process.env.JWT_EXPIRES_IN ?? '8h';

export async function signAdminJwt(payload: Record<string, unknown>): Promise<string> {
  const secret = getSecret();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyAdminJwt(token: string): Promise<Record<string, unknown> | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as Record<string, unknown>;
  } catch (error) {
    console.warn('[Auth] JWT verification failed:', error instanceof Error ? error.message : 'unknown error');
    return null;
  }
}
