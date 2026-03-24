import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { userId, type, title, message, icon, link } = await req.json()

    if (!userId || !type || !title || !message) {
      return NextResponse.json({ error: 'userId, type, title, and message are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Check user notification preferences
    const { data: settings } = await supabase
      .from('settings')
      .select('inapp_notifications, notify_budget_alerts, notify_reports, notify_large_transactions, notify_system')
      .eq('user_id', userId)
      .single()

    // Check if user has disabled this notification type
    if (settings) {
      if (settings.inapp_notifications === false) {
        return NextResponse.json({ skipped: true, reason: 'in-app notifications disabled' })
      }
      if (type === 'budget_alert' && settings.notify_budget_alerts === false) {
        return NextResponse.json({ skipped: true, reason: 'budget alerts disabled' })
      }
      if (type === 'report' && settings.notify_reports === false) {
        return NextResponse.json({ skipped: true, reason: 'report notifications disabled' })
      }
      if (type === 'system' && settings.notify_system === false) {
        return NextResponse.json({ skipped: true, reason: 'system notifications disabled' })
      }
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        icon: icon || null,
        link: link || null,
        read: false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, notification: data })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
