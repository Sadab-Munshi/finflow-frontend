import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const hash = crypto.createHash('sha256').update(password).digest('hex')
  const validHash = crypto.createHash('sha256').update('W1VZ16NcCQQKD99pTeHb8wxTKINs66UO').digest('hex')
  
  if (hash === validHash) {
    const response = NextResponse.json({ ok: true })
    response.cookies.set('admin_auth', validHash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
      path: '/',
    })
    return response
  }
  return NextResponse.json({ ok: false }, { status: 401 })
}
