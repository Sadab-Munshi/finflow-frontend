import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { normalizeDateToYMD } from '@/lib/utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function sendEmail(to: string, subject: string, html: string, name: string) {
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.BREVO_FROM_EMAIL
  const senderName = process.env.BREVO_SENDER_NAME || process.env.BREVO_FROM_NAME || 'FinFlow'

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY!,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to, name }],
      subject,
      htmlContent: html,
    })
  })
  const data = await response.json()
  return data
}

function buildAlertEmail(userName: string, alerts: any[], appUrl: string): string {
  // Get first name only
  const firstName = userName ? userName.split(' ')[0] : null

  const rows = alerts.map(a => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1a202c">${a.category}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1a202c">₹${a.budget.toLocaleString('en-IN')}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:${a.percentage >= 100 ? '#ef4444' : '#f97316'}">₹${a.spent.toLocaleString('en-IN')}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;font-weight:700;color:${a.percentage >= 100 ? '#ef4444' : '#f97316'}">${a.percentage}%</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#0d9488">₹${a.remaining.toLocaleString('en-IN')}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Budget Alert</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#0d9488;padding:24px 24px 20px;">
              <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">⚠️ Budget Alert</p>
              <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">
                ${firstName ? `Hi ${firstName},` : 'Hi,'} some of your budgets need attention
              </p>
            </td>
          </tr>

          <!-- Table -->
          <tr>
            <td style="padding:20px 16px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Category</th>
                    <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Budget</th>
                    <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Spent</th>
                    <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Used</th>
                    <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Left</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Tip -->
          <tr>
            <td style="padding:12px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#f0fdf4;border-left:4px solid #0d9488;border-radius:6px;padding:12px 14px;">
                    <p style="margin:0;font-size:13px;color:#065f46;line-height:1.5;">
                      💡 Review your spending in the FinFlow app to stay within budget.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:16px 16px 20px;">
              <a href="${appUrl}/budgets"
                 style="display:inline-block;background:#0d9488;color:#ffffff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">
                View My Budgets →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 16px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a0aec0;line-height:1.6;">
                You received this because you enabled budget alerts in FinFlow.<br>
                <a href="${appUrl}/settings" style="color:#0d9488;text-decoration:none;">Manage notifications</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    let userId: string

    const botSecret = req.headers.get('x-bot-secret')
    if (botSecret && botSecret === process.env.WEBHOOK_SECRET) {
      const body = await req.json()
      if (!body.user_id) {
        return NextResponse.json({ ok: false, error: 'Missing user_id' }, { status: 400 })
      }
      userId = body.user_id
    } else {
      const authSupabase = await createAuthClient()
      const { data: { user: authUser } } = await authSupabase.auth.getUser()
      if (!authUser) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      }
      userId = authUser.id
    }

    // Fetch settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('budget_alerts, name')
      .eq('user_id', userId)
      .single()

    if (settingsError) {
      console.error('[budget-alert] Settings error:', settingsError)
      return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
    }

    if (!settings?.budget_alerts) {
      return NextResponse.json({ ok: false, reason: 'budget alerts disabled' })
    }

    // Get user email + metadata name as fallback
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !user?.email) {
      console.error('[BUDGET ALERT] User fetch error:', userError)
      return NextResponse.json({ ok: false, error: 'User email not found' })
    }

    // ✅ Use settings.name first, then user_metadata name, then email prefix
    const userName =
      settings?.name?.trim() ||
      user.user_metadata?.full_name?.trim() ||
      user.user_metadata?.name?.trim() ||
      user.email.split('@')[0]

    // Current month IST
    const thisMonth = new Date().toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata'
    }).slice(0, 7)

    // Fetch budgets
    const { data: budgets, error: budgetsError } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('month', thisMonth)

    if (budgetsError) {
      console.error('[budget-alert] Budgets error:', budgetsError)
      return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
    }

    if (!budgets || budgets.length === 0) {
      return NextResponse.json({ ok: false, reason: 'no budgets for this month' })
    }

    // Fetch expense transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'expense')

    if (txError) {
      console.error('[budget-alert] Transactions error:', txError)
      return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
    }

    // Filter to current month
    const monthTx = (transactions || []).filter(t =>
      normalizeDateToYMD(t.date).startsWith(thisMonth)
    )

    // Calculate alerts
    const alerts: any[] = []
    const spentPerCategory: Record<string, number> = {}

    for (const budget of budgets) {
      const bCat = budget.category?.trim().toLowerCase()
      const spent = monthTx
        .filter(t => t.category?.trim().toLowerCase() === bCat)
        .reduce((sum, t) => sum + Number(t.amount), 0)

      spentPerCategory[budget.category] = spent
      const budgetAmount = Number(budget.amount)
      const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0

      if (percentage >= 80) {
        alerts.push({
          category: budget.category,
          budget: budgetAmount,
          spent,
          percentage: Math.round(percentage),
          remaining: Math.max(0, budgetAmount - spent),
        })
      }
    }

    if (alerts.length === 0) {
      return NextResponse.json({
        ok: false,
        reason: 'all budgets under 80%',
        spentPerCategory,
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.sadabmunshi.online'
    const html = buildAlertEmail(userName, alerts, appUrl)

    await sendEmail(
      user.email,
      `⚠️ Budget Alert — ${alerts.length} budget${alerts.length > 1 ? 's' : ''} need attention`,
      html,
      userName
    )

    // Create in-app notifications and send push for each alert
    for (const alert of alerts) {
      const level = alert.percentage >= 100 ? 'exceeded' : alert.percentage >= 90 ? 'at 90%' : 'at 80%'
      const notifTitle = `Budget ${level}: ${alert.category}`
      const notifMessage = `You've spent ₹${alert.spent.toLocaleString('en-IN')} of ₹${alert.budget.toLocaleString('en-IN')} (${alert.percentage}%) on ${alert.category}`

      // Create in-app notification
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'budget_alert',
          title: notifTitle,
          message: notifMessage,
          icon: '⚠️',
          link: '/budgets',
          read: false,
        })

      // Send browser push
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.sadabmunshi.online'
      try {
        await fetch(`${baseUrl}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            title: notifTitle,
            body: notifMessage,
            icon: '/finflow-logo.png',
            link: '/budgets',
            tag: `budget-alert-${alert.category}`,
          }),
        })
      } catch (pushErr) {
        console.error('[BUDGET ALERT] Push notification error:', pushErr)
      }
    }

    return NextResponse.json({ ok: true, alertsSent: alerts.length, alerts })

  } catch (error) {
    console.error('[budget-alert] Unexpected error:', error)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
