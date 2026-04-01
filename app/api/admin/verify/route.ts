import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const storedHash = process.env.ADMIN_PASSWORD_HASH
  if (!storedHash) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const { password } = await req.json()
  const isMatch = await bcrypt.compare(password, storedHash)

  if (!isMatch) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  // Generate a random session token and set it as the admin cookie
  const sessionToken = crypto.randomBytes(32).toString('hex')
  const response = NextResponse.json({ ok: true })
  response.cookies.set('admin_auth', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  })
  return response
}
