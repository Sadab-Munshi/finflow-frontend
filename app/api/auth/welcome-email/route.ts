import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/brevo'

export async function POST(request: NextRequest) {
  try {
    const { fullName, email } = await request.json()

    if (!fullName || !email) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    await sendWelcomeEmail(fullName, email)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Welcome email error:', error)
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 })
  }
}
