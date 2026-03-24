import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { phone, type, name } = await req.json()

    const botUrl = process.env.WP_BOT_URL
    const secret = process.env.WEBHOOK_SECRET

    if (botUrl && secret) {
      await fetch(`${botUrl}/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bot-secret': secret,
        },
        body: JSON.stringify({ phone, type, name }),
      }).catch((err) => {
        console.error('[whatsapp/notify] Bot notification failed:', err)
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[whatsapp/notify] Request error:', err)
    return NextResponse.json({ ok: true })
  }
}
