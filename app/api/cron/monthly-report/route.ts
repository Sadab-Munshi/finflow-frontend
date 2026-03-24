import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeDateToYMD } from '@/lib/utils'
import jsPDF from 'jspdf'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Currency helpers ──────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// PDF uses Rs. instead of ₹ (jsPDF cannot render the ₹ glyph reliably)
function pdfRs(amount: number): string {
  return 'Rs.' + new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '')
  return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)]
}

// ── Category colour map ───────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining':    '#ef4444',
  'Transport':        '#f97316',
  'Shopping':         '#8b5cf6',
  'Bills & Utilities':'#06b6d4',
  'Entertainment':    '#ec4899',
  'Health':           '#14b8a6',
  'Education':        '#6366f1',
  'Rent':             '#78716c',
  'Groceries':        '#84cc16',
  'Personal Care':    '#f43f5e',
  'Salary':           '#22c55e',
  'Freelance':        '#10b981',
  'Business':         '#059669',
  'Investment':       '#0d9488',
  'Gift':             '#a855f7',
  'Other':            '#6b7280',
}
function catColor(name: string): string {
  return CATEGORY_COLORS[name] || '#6b7280'
}

// ── AI Summary ────────────────────────────────────────────────────────────────

async function getAISummary(
  monthName: string,
  totalIncome: number,
  totalExpense: number,
  savings: number,
  savingsRate: number,
  topExpense: { name: string; amount: number }[],
  incomeSources: { name: string; amount: number }[]
): Promise<string | null> {
  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY
    if (!GROQ_API_KEY) return null

    const topCatStr = topExpense.map(c => `${c.name} (Rs.${c.amount.toLocaleString('en-IN')})`).join(', ')
    const incomeStr = incomeSources.map(i => `${i.name} (Rs.${i.amount.toLocaleString('en-IN')})`).join(', ')

    const prompt = `Generate a detailed 5-6 sentence personal financial report summary for ${monthName}.
Total income: Rs.${totalIncome}, Total expenses: Rs.${totalExpense}, Net savings: Rs.${savings}, Savings rate: ${savingsRate.toFixed(1)}%.
Top expense categories: ${topCatStr}.
Income sources: ${incomeStr}.

Cover all of these points:
1. Overall financial health assessment
2. Biggest spending category and whether it is concerning or justified
3. Savings rate evaluation (good, average or needs improvement)
4. One specific actionable recommendation to improve finances
5. Positive reinforcement if savings rate is above 30%

Write in a warm, professional tone as if a financial advisor is speaking directly to the user.
Return ONLY valid JSON: { "summary": "paragraph here" }`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a personal finance advisor for Indian users. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4
      }),
    })

    if (!response.ok) return null
    const data = await response.json()
    const content = data.choices[0].message.content
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) return null
    return JSON.parse(match[0]).summary || null
  } catch (e) {
    console.error('[MONTHLY REPORT] AI summary error:', e)
    return null
  }
}

// ── PDF Generator (server-side jsPDF, no canvas needed) ──────────────────────

function generatePDF(params: {
  userName: string
  monthName: string
  totalIncome: number
  totalExpense: number
  netSavings: number
  savingsRate: number
  expenseBreakdown: { name: string; amount: number; percentage: number }[]
  incomeBreakdown:  { name: string; amount: number; percentage: number }[]
  transactions: { date: string; note: string; category: string; type: string; amount: number }[]
  aiSummary: string | null
  generatedDate: string
}): string {
  const {
    userName, monthName, totalIncome, totalExpense, netSavings, savingsRate,
    expenseBreakdown, incomeBreakdown, transactions, aiSummary, generatedDate
  } = params

  const pdf = new jsPDF('p', 'mm', 'a4')
  const PW = 210, PH = 297
  const M = 14
  const CW = PW - M * 2
  let y = M
  let page = 1

  // helpers
  const footer = () => {
    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(160, 160, 160)
    pdf.text(
      `FinFlow Financial Report  ·  Confidential  ·  Generated ${generatedDate}  ·  Page ${page}`,
      PW / 2, PH - 7, { align: 'center' }
    )
  }

  const pageHeader = () => {
    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(13, 148, 136)
    pdf.text(`FinFlow  ·  ${monthName}`, PW - M, 7, { align: 'right' })
  }

  const newPage = () => {
    footer()
    pdf.addPage()
    page++
    pageHeader()
    y = M + 6
  }

  const need = (h: number) => { if (y + h > PH - 16) newPage() }

  const section = (title: string) => {
    need(16)
    pdf.setFontSize(13)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(13, 148, 136)
    pdf.text(title, M, y)
    y += 4
    pdf.setDrawColor(13, 148, 136)
    pdf.setLineWidth(0.4)
    pdf.line(M, y, PW - M, y)
    y += 7
    pdf.setFont('helvetica', 'normal')
  }

  const tealHdr = (cols: { label: string; x: number }[], rowH = 7) => {
    pdf.setFillColor(13, 148, 136)
    pdf.rect(M, y - 5, CW, rowH, 'F')
    pdf.setFontSize(8.5)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255)
    cols.forEach(c => pdf.text(c.label, c.x, y))
    pdf.setFont('helvetica', 'normal')
    y += rowH
  }

  // PAGE 1 HEADER BAND
  pdf.setFillColor(13, 148, 136)
  pdf.rect(0, 0, PW, 32, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('FinFlow  ·  Financial Report', M, 11)
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')
  pdf.text(monthName, M, 19)
  pdf.setFontSize(8.5)
  pdf.text(`${userName}   ·   Generated: ${generatedDate} IST`, M, 26)
  pdf.setFontSize(8)
  pdf.setTextColor(200, 245, 230)
  pdf.text('All amounts in Indian Rupees (Rs.)', M, 31)
  y = 40

  // SUMMARY CARDS
  const cardW = CW / 4
  const cardH = 26
  const cards = [
    { label: 'Total Income',  val: pdfRs(totalIncome),  color: '#059669' },
    { label: 'Total Expense', val: pdfRs(totalExpense), color: '#dc2626' },
    { label: 'Net Savings',   val: pdfRs(netSavings),   color: netSavings >= 0 ? '#059669' : '#dc2626' },
    { label: 'Savings Rate',  val: `${savingsRate.toFixed(1)}%`, color: savingsRate >= 20 ? '#059669' : '#d97706' },
  ]
  cards.forEach((c, i) => {
    const x = M + i * cardW
    pdf.setFillColor(248, 250, 252)
    pdf.rect(x + 0.5, y, cardW - 1, cardH, 'F')
    pdf.setFillColor(13, 148, 136)
    pdf.rect(x + 0.5, y, cardW - 1, 1.8, 'F')
    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(110, 110, 110)
    pdf.text(c.label, x + cardW / 2, y + 9, { align: 'center' })
    const [r, g, b] = hexToRgb(c.color)
    pdf.setFontSize(c.val.length > 12 ? 9 : 11)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(r, g, b)
    pdf.text(c.val, x + cardW / 2, y + 20, { align: 'center' })
  })
  pdf.setFont('helvetica', 'normal')
  y += cardH + 10

  // AI SUMMARY
  if (aiSummary) {
    need(40)
    section('AI Financial Summary')
    pdf.setFontSize(10)
    const lines = pdf.splitTextToSize(aiSummary, CW - 10)
    const lh = 5
    const bh = lines.length * lh + 10
    pdf.setFillColor(248, 250, 252)
    pdf.rect(M, y - 3, CW, bh, 'F')
    pdf.setFillColor(13, 148, 136)
    pdf.rect(M, y - 3, 2, bh, 'F')
    pdf.setTextColor(55, 55, 55)
    lines.forEach((ln: string, i: number) => pdf.text(ln, M + 5, y + 2 + i * lh))
    y += bh + 10
  }

  // INCOME BREAKDOWN
  if (incomeBreakdown.length > 0) {
    need(30)
    section('Income Breakdown')
    const ic = { src: M + 2, amt: M + 110, pct: M + 155 }
    tealHdr([
      { label: 'Source',     x: ic.src },
      { label: 'Amount',     x: ic.amt },
      { label: '% of Total', x: ic.pct },
    ])
    incomeBreakdown.forEach(item => {
      need(9)
      pdf.setFillColor(240, 253, 244)
      pdf.rect(M, y - 5, CW, 7, 'F')
      pdf.setFontSize(9)
      pdf.setTextColor(50, 50, 50);  pdf.text(item.name, ic.src, y)
      pdf.setTextColor(5, 150, 105); pdf.text(pdfRs(item.amount), ic.amt, y)
      pdf.setTextColor(80, 80, 80);  pdf.text(`${item.percentage.toFixed(1)}%`, ic.pct, y)
      y += 7
    })
    y += 8
  }

  // EXPENSE BREAKDOWN (bar chart)
  if (expenseBreakdown.length > 0) {
    need(30)
    section('Expense Breakdown by Category')
    const nameW = 55, barStart = M + nameW + 6, barMax = 65, labelX = barStart + barMax + 3
    expenseBreakdown.forEach(cat => {
      need(12)
      const [r, g, b] = hexToRgb(catColor(cat.name))
      pdf.setFillColor(r, g, b)
      pdf.circle(M + 2.5, y - 1.5, 2, 'F')
      pdf.setFontSize(9)
      pdf.setTextColor(55, 55, 55)
      const nameDisp = cat.name.length > 22 ? cat.name.slice(0, 20) + '..' : cat.name
      pdf.text(nameDisp, M + 7, y)
      const barW = Math.max((cat.percentage / 100) * barMax, 0.5)
      pdf.setFillColor(220, 220, 220)
      pdf.rect(barStart, y - 4.5, barMax, 5, 'F')
      pdf.setFillColor(r, g, b)
      pdf.rect(barStart, y - 4.5, barW, 5, 'F')
      pdf.setFontSize(8.5)
      pdf.setTextColor(70, 70, 70)
      pdf.text(`${pdfRs(cat.amount)}  (${cat.percentage.toFixed(1)}%)`, labelX, y)
      y += 10
    })
    y += 5
  }

  // CATEGORY DETAILS TABLE
  if (expenseBreakdown.length > 0) {
    need(30)
    section('Category Details')
    const cc = { name: M + 2, amt: M + 95, pct: M + 148 }
    const renderCHdr = () => tealHdr([
      { label: 'Category',            x: cc.name },
      { label: 'Amount',              x: cc.amt  },
      { label: '% of Total Expense',  x: cc.pct  },
    ])
    renderCHdr()
    expenseBreakdown.forEach((cat, i) => {
      need(9)
      pdf.setFillColor(i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 250 : 255)
      pdf.rect(M, y - 5, CW, 7, 'F')
      pdf.setFontSize(9)
      pdf.setTextColor(55, 55, 55);  pdf.text(cat.name, cc.name, y)
      pdf.setTextColor(220, 38, 38); pdf.text(pdfRs(cat.amount), cc.amt, y)
      pdf.setTextColor(80, 80, 80);  pdf.text(`${cat.percentage.toFixed(1)}%`, cc.pct, y)
      y += 7
    })
    y += 10
  }

  // FULL TRANSACTION LIST
  need(30)
  section('Transaction Details')
  const tc = { date: M + 2, desc: M + 26, cat: M + 90, type: M + 132, amt: M + 153 }
  const renderTHdr = () => tealHdr([
    { label: 'Date',        x: tc.date },
    { label: 'Description', x: tc.desc },
    { label: 'Category',    x: tc.cat  },
    { label: 'Type',        x: tc.type },
    { label: 'Amount',      x: tc.amt  },
  ])
  renderTHdr()

  transactions.forEach((tx, i) => {
    need(9)
    if (y < M + 20 && i > 0) renderTHdr()
    const inc = tx.type === 'income'
    pdf.setFillColor(inc ? 240 : 255, inc ? 253 : 255, inc ? 244 : 255)
    pdf.rect(M, y - 5, CW, 7, 'F')
    const dateStr  = normalizeDateToYMD(tx.date).split('-').reverse().join('/')
    const noteDisp = pdf.splitTextToSize((tx.note || '-').replace(/\n/g, ' '), 60)[0]
    const catDisp  = pdf.splitTextToSize(tx.category || '-', 36)[0]
    pdf.setFontSize(9)
    pdf.setTextColor(55, 55, 55)
    pdf.text(dateStr,  tc.date, y)
    pdf.text(noteDisp, tc.desc, y)
    pdf.text(catDisp,  tc.cat,  y)
    pdf.text(tx.type,  tc.type, y)
    pdf.setTextColor(inc ? 5 : 220, inc ? 150 : 38, inc ? 105 : 38)
    pdf.text(pdfRs(tx.amount), tc.amt, y)
    y += 7
  })

  footer()

  // Return base64 (strip the "data:application/pdf;base64," prefix)
  return pdf.output('datauristring').split(',')[1]
}

// ── Minimal clean email — PDF is the real report ─────────────────────────────

function buildEmail(params: {
  firstName: string
  monthName: string
  totalIncome: number
  totalExpense: number
  savings: number
  savingsRate: number
  topCategories: { name: string; amount: number; percentage: number }[]
  aiSummary: string | null
  appUrl: string
}): string {
  const { firstName, monthName, totalIncome, totalExpense, savings, savingsRate, appUrl } = params
  const savingsColor = savings >= 0 ? '#059669' : '#dc2626'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Your ${monthName} Financial Report — FinFlow</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 24px;">
  <tr><td style="max-width:520px;">

    <!-- NAME + GREETING -->
    <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">FinFlow · ${monthName} Report</p>
    <p style="margin:0 0 18px;font-size:22px;font-weight:800;color:#111827;line-height:1.3;">
      Hi <span style="color:#0d9488;">${firstName}</span>, your report is ready.
    </p>

    <!-- MESSAGE -->
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.75;">
      Your <strong>${monthName} financial report</strong> is attached to this email as a PDF.
      It includes your complete transaction list, income &amp; expense breakdown, category analysis, and AI-generated insights.
    </p>

    <!-- DIVIDER -->
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;">

    <!-- FOOTER -->
    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.8;">
      You received this because you enabled monthly reports in FinFlow.<br>
      To stop receiving these emails, go to Settings &gt; Notifications in the app.
    </p>

  </td></tr>
</table>
</body>
</html>`
}

// ── Brevo sender with PDF attachment ─────────────────────────────────────────

async function sendEmailWithPDF(params: {
  to: string
  name: string
  subject: string
  html: string
  pdfBase64: string
  monthName: string
}) {
  const { to, name, subject, html, pdfBase64, monthName } = params
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.BREVO_FROM_EMAIL
  const senderName  = process.env.BREVO_SENDER_NAME  || process.env.BREVO_FROM_NAME || 'FinFlow'
  const fileName    = `FinFlow-Report-${monthName.replace(' ', '-')}.pdf`

  console.log(`[MONTHLY REPORT] Sending email+PDF to: ${to}`)

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept':        'application/json',
      'api-key':       process.env.BREVO_API_KEY!,
      'content-type':  'application/json',
    },
    body: JSON.stringify({
      sender:      { name: senderName, email: senderEmail },
      to:          [{ email: to, name }],
      subject,
      htmlContent: html,
      attachment: [
        {
          content: pdfBase64,   // base64-encoded PDF, no data URI prefix
          name:    fileName,
        }
      ]
    })
  })

  const data = await response.json()
  console.log('[MONTHLY REPORT] Brevo response:', JSON.stringify(data))
  return data
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const authHeader    = req.headers.get('Authorization')
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`
    if (!authHeader || authHeader !== expectedToken) {
      console.log('[MONTHLY REPORT] Unauthorized')
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    console.log('=== MONTHLY REPORT CRON START ===')

    const url    = new URL(req.url)
    const isTest = url.searchParams.get('test') === 'true'

    const now = new Date()
    let reportDate: Date
    if (isTest) {
      reportDate = now
      console.log('[MONTHLY REPORT] Test mode — using current month')
    } else {
      reportDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    }

    const prevMonthKey  = reportDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7)
    const prevMonthName = reportDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

    console.log(`[MONTHLY REPORT] Processing: ${prevMonthName} (${prevMonthKey})`)

    const { data: settingsList, error: settingsError } = await supabase
      .from('settings')
      .select('user_id, name, monthly_report')
      .eq('monthly_report', true)

    if (settingsError) {
      return NextResponse.json({ ok: false, error: settingsError.message })
    }
    if (!settingsList?.length) {
      return NextResponse.json({ ok: true, message: 'No users with monthly reports enabled' })
    }

    console.log(`[MONTHLY REPORT] Found ${settingsList.length} users`)

    const appUrl  = process.env.NEXT_PUBLIC_APP_URL || 'https://app.sadabmunshi.online'
    const results: { userId: string; email: string; status: string; error?: string }[] = []

    for (const userSettings of settingsList) {
      const userId = userSettings.user_id
      try {
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
        if (userError || !user?.email) {
          results.push({ userId, email: 'unknown', status: 'failed', error: 'User not found' })
          continue
        }

        const userName  = userSettings.name?.trim()
          || user.user_metadata?.full_name?.trim()
          || user.user_metadata?.name?.trim()
          || user.email.split('@')[0]
        const firstName = userName.split(' ')[0]

        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)

        if (txError) {
          results.push({ userId, email: user.email, status: 'failed', error: 'Transactions fetch failed' })
          continue
        }

        const monthTx = (transactions || []).filter(t =>
          normalizeDateToYMD(t.date).startsWith(prevMonthKey)
        )

        if (monthTx.length === 0) {
          console.log(`[MONTHLY REPORT] No transactions for ${user.email} in ${prevMonthName}`)
          results.push({ userId, email: user.email, status: 'skipped', error: 'No transactions' })
          continue
        }

        const totalIncome  = monthTx.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0)
        const totalExpense = monthTx.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0)
        const savings      = totalIncome - totalExpense
        const savingsRate  = totalIncome > 0 ? (savings / totalIncome) * 100 : 0

        // Expense breakdown
        const expTotals: Record<string, number> = {}
        monthTx.filter(tx => tx.type === 'expense').forEach(tx => {
          const n = tx.category?.trim() || 'Other'
          expTotals[n] = (expTotals[n] || 0) + Number(tx.amount)
        })
        const expenseBreakdown = Object.entries(expTotals)
          .map(([name, amount]) => ({ name, amount, percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0 }))
          .sort((a, b) => b.amount - a.amount)

        // Income breakdown
        const incTotals: Record<string, number> = {}
        monthTx.filter(tx => tx.type === 'income').forEach(tx => {
          const n = tx.category?.trim() || 'Other'
          incTotals[n] = (incTotals[n] || 0) + Number(tx.amount)
        })
        const incomeBreakdown = Object.entries(incTotals)
          .map(([name, amount]) => ({ name, amount, percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0 }))
          .sort((a, b) => b.amount - a.amount)

        const aiSummary = await getAISummary(
          prevMonthName, totalIncome, totalExpense, savings, savingsRate,
          expenseBreakdown.slice(0, 5).map(c => ({ name: c.name, amount: c.amount })),
          incomeBreakdown.slice(0, 3).map(i => ({ name: i.name, amount: i.amount }))
        )

        const generatedDate = new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true
        })

        // Generate PDF server-side
        const pdfBase64 = generatePDF({
          userName,
          monthName: prevMonthName,
          totalIncome,
          totalExpense,
          netSavings: savings,
          savingsRate,
          expenseBreakdown,
          incomeBreakdown,
          transactions: monthTx
            .sort((a, b) =>
              new Date(normalizeDateToYMD(b.date)).getTime() -
              new Date(normalizeDateToYMD(a.date)).getTime()
            )
            .map(tx => ({
              date:     tx.date,
              note:     tx.note     || '',
              category: tx.category || '',
              type:     tx.type,
              amount:   Number(tx.amount),
            })),
          aiSummary,
          generatedDate,
        })

        const html = buildEmail({
          firstName,
          monthName: prevMonthName,
          totalIncome,
          totalExpense,
          savings,
          savingsRate,
          topCategories: expenseBreakdown.slice(0, 5),
          aiSummary,
          appUrl,
        })

        await sendEmailWithPDF({
          to:        user.email,
          name:      userName,
          subject:   `Your ${prevMonthName} Financial Report — FinFlow`,
          html,
          pdfBase64,
          monthName: prevMonthName,
        })

        // Create in-app notification for report
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'report',
            title: `Your ${prevMonthName} report is ready`,
            message: `Your monthly financial report for ${prevMonthName} has been generated and sent to your email.`,
            icon: '📊',
            link: '/reports',
            read: false,
          })

        // Send browser push notification
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.sadabmunshi.online'
        try {
          await fetch(`${baseUrl}/api/push/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              title: `Your ${prevMonthName} report is ready`,
              body: `Your monthly financial report for ${prevMonthName} has been generated. Tap to view.`,
              icon: '/finflow-logo.png',
              link: '/reports',
              tag: `monthly-report-${prevMonthName}`,
            }),
          })
        } catch (pushErr) {
          console.error(`[MONTHLY REPORT] Push notification error for ${userId}:`, pushErr)
        }

        console.log(`[MONTHLY REPORT] Sent to: ${user.email}`)
        results.push({ userId, email: user.email, status: 'sent' })

      } catch (err) {
        console.error(`[MONTHLY REPORT] Error for user ${userId}:`, err)
        results.push({ userId, email: 'unknown', status: 'failed', error: String(err) })
      }
    }

    console.log('=== MONTHLY REPORT CRON END ===')
    return NextResponse.json({ ok: true, processed: results.length, results })

  } catch (err) {
    console.error('[MONTHLY REPORT] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: String(err) })
  }
}

// Support GET for quick curl testing
export async function GET(req: NextRequest) {
  return POST(req)
}
