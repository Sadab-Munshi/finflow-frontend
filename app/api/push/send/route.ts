import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import webpush from 'web-push'

// Configure VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@finflow.app'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export async function POST(req: NextRequest) {
  try {
    const { userId, title, body, icon, link, tag } = await req.json()

    if (!userId || !title) {
      return NextResponse.json({ error: 'userId and title required' }, { status: 400 })
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
    }

    const supabase = createServiceClient()

    // Check if user has push enabled
    const { data: settings } = await supabase
      .from('settings')
      .select('push_enabled')
      .eq('user_id', userId)
      .single()

    if (settings?.push_enabled === false) {
      return NextResponse.json({ skipped: true, reason: 'push disabled' })
    }

    // Get all push subscriptions for user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (error || !subscriptions?.length) {
      return NextResponse.json({ skipped: true, reason: 'no subscriptions' })
    }

    const payload = JSON.stringify({
      title: title || 'FinFlow',
      body: body || '',
      icon: icon || '/finflow-logo.png',
      badge: '/icons/icon-96x96.png',
      link: link || '/dashboard',
      tag: tag || 'finflow-notification',
    })

    let sent = 0
    let failed = 0

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key,
            },
          },
          payload
        )
        sent++
      } catch (pushError: unknown) {
        failed++
        // Remove expired subscriptions (410 Gone)
        const statusCode = pushError instanceof Error && 'statusCode' in pushError
          ? (pushError as Error & { statusCode: number }).statusCode
          : undefined
        if (statusCode === 410 || statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
        }
      }
    }

    return NextResponse.json({ success: true, sent, failed })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
