import { SignJWT, jwtVerify } from 'jose'

const secret = () => {
  const key = process.env.SECRET_KEY
  if (!key || key.length < 32) throw new Error('SECRET_KEY must be at least 32 chars')
  return new TextEncoder().encode(key)
}

export async function signToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(secret())
}

export async function verifyToken(token: string): Promise<{ sub: string; email: string }> {
  const { payload } = await jwtVerify(token, secret())
  return payload as { sub: string; email: string }
}

export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}
