import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin-auth'
import webpush from 'web-push'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@finflow.app'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdmin(req)
    if (authResult instanceof NextResponse) return authResult

    const { type, title, message, icon, link, sendPush, sendInApp, targetType, userIds } = await req.json()

    if (!type || !title || !message) {
      return NextResponse.json({ error: 'type, title, and message are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Determine recipient list
    let recipients: string[] = []

    if (targetType === 'specific' && userIds?.length) {
      recipients = userIds
    } else {
      // Get all users from settings table
      const { data: allUsers } = await supabase
        .from('settings')
        .select('user_id')

      if (allUsers) {
        recipients = allUsers.map((u: { user_id: string }) => u.user_id)
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
    }

    let inAppSent = 0
    let pushSent = 0
    let pushFailed = 0
    const BATCH_SIZE = 100

    // Process in batches
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE)

      // Send in-app notifications
      if (sendInApp !== false) {
        const notifications = batch.map(userId => ({
          user_id: userId,
          type,
          title,
          message,
          icon: icon || '🔔',
          link: link || null,
          read: false,
        }))

        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notifications)

        if (!insertError) {
          inAppSent += batch.length
        }
      }

      // Send push notifications
      if (sendPush && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        for (const userId of batch) {
          const { data: subscriptions } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId)

          if (!subscriptions?.length) continue

          const payload = JSON.stringify({
            title,
            body: message,
            icon: '/finflow-logo.png',
            badge: '/icons/icon-96x96.png',
            link: link || '/dashboard',
            tag: 'admin-notification',
          })

          for (const sub of subscriptions) {
            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
                },
                payload
              )
              pushSent++
            } catch (pushError: unknown) {
              pushFailed++
              const statusCode = pushError instanceof Error && 'statusCode' in pushError
                ? (pushError as Error & { statusCode: number }).statusCode
                : undefined
              if (statusCode === 410 || statusCode === 404) {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id)
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      recipients: recipients.length,
      inAppSent,
      pushSent,
      pushFailed,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
