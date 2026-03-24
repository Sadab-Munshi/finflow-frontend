import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { token } = await req.json()

  if (!token) {
    return NextResponse.json({ success: false, error: 'No token provided' }, { status: 400 })
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
    })
  })

  const data = await response.json()

  if (data.success) {
    return NextResponse.json({ success: true })
  } else {
    return NextResponse.json({ success: false, error: data['error-codes'] }, { status: 400 })
  }
}
