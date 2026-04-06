import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { chat_id, type } = await req.json()

    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token || !chat_id) {
      return NextResponse.json({ ok: true })
    }

    let text = ''
    if (type === 'connected') {
      text =
        '✅ *Account Connected!*\n' +
        '─────────────────────\n' +
        'Your Telegram is now linked to FinFlow.\n' +
        'Your data is safe and synced.\n' +
        'Type *help* to see available commands.'
    } else if (type === 'disconnected') {
      text =
        '🔗 *Account Disconnected*\n' +
        '─────────────────────\n' +
        'Your Telegram has been unlinked from FinFlow.\n' +
        'Your data is safe in the app.\n' +
        'To reconnect: Settings → Connect Telegram'
    }

    if (text) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, text, parse_mode: 'Markdown' }),
      }).catch((err) => {
        console.error('[telegram/notify] Telegram API call failed:', err)
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[telegram/notify] Request error:', err)
    return NextResponse.json({ ok: true })
  }
}
