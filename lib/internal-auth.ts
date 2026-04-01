import { timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'

export function verifyInternalSecret(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) return false
  const header = req.headers.get('x-internal-secret')
  if (!header) return false
  try {
    const a = Buffer.from(secret)
    const b = Buffer.from(header)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
