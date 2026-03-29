import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeDateToYMD } from '@/lib/utils'
import {
  AI_SUMMARY_TEAL_KEYWORDS,
  EXPENSE_CATEGORY_COLORS,
  INCOME_CATEGORY_COLORS,
  getTransactionDescription,
  buildAISummaryPrompt,
} from '@/lib/pdf-constants'
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

// Use Rs. prefix for PDF output (Helvetica does not support the ₹ glyph)
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

function catColor(name: string): string {
  return EXPENSE_CATEGORY_COLORS[name] || INCOME_CATEGORY_COLORS[name] || '#6B7280'
}

function incomeCatColor(name: string): string {
  return INCOME_CATEGORY_COLORS[name] || '#0D9488'
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
): Promise<{ sections?: { overall: string; spending: string; income: string; recommendations: string[] }; summary?: string } | null> {
  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY
    if (!GROQ_API_KEY) return null

    const topCatStr = topExpense.map(c => `${c.name} (Rs.${c.amount.toLocaleString('en-IN')})`).join(', ')
    const incomeStr = incomeSources.map(i => `${i.name} (Rs.${i.amount.toLocaleString('en-IN')})`).join(', ')

    const prompt = buildAISummaryPrompt(
      monthName, totalIncome, totalExpense, savings, savingsRate,
      topCatStr, incomeStr
    )

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
    const parsed = JSON.parse(match[0])
    // Support both structured and legacy format
    if (parsed.sections) return { sections: parsed.sections }
    if (parsed.summary) return { summary: parsed.summary }
    return null
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
  aiSummary: { sections?: { overall: string; spending: string; income: string; recommendations: string[] }; summary?: string } | null
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

  // Parse generatedDate into date and time parts
  const dateParts = generatedDate.split(',').map(s => s.trim())
  const genDateStr = dateParts[0] || generatedDate
  const genTimeStr = dateParts.slice(1).join(',').trim() || ''

  // Extract month and year from monthName (e.g. "March 2026")
  const monthYearParts = monthName.split(' ')
  const monthOnly = monthYearParts[0] || monthName
  const yearOnly = monthYearParts[1] || ''

  // ── Helpers ──

  const addFooter = (pageNum: number, totalPages: number) => {
    const footerY = PH - 14
    pdf.setDrawColor(209, 213, 219)
    pdf.setLineWidth(0.3)
    pdf.line(M, footerY, PW - M, footerY)
    // Left: "FinFlow" bold teal + site URL gray below
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(42, 181, 160)
    pdf.text('FinFlow', M, footerY + 4.5)
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(156, 163, 175)
    pdf.text('app.sadabmunshi.online', M, footerY + 8.5)
    // Center: "Confidential" + "For personal use only"
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(107, 114, 128)
    pdf.text('Confidential', PW / 2, footerY + 4.5, { align: 'center' })
    pdf.setFontSize(7)
    pdf.setTextColor(156, 163, 175)
    pdf.text('For personal use only', PW / 2, footerY + 8.5, { align: 'center' })
    // Right: "Page X/Y"
    pdf.setFontSize(8.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(107, 114, 128)
    pdf.text(`Page ${pageNum}/${totalPages}`, PW - M, footerY + 6.5, { align: 'right' })
  }

  // Page 2+ compact header
  const pageHeader = () => {
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(42, 181, 160)
    pdf.text('FinFlow', M, 6.5)
    const fw = pdf.getTextWidth('FinFlow')
    pdf.setFontSize(8.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(107, 114, 128)
    pdf.text(` | ${monthName} Financial Report`, M + fw, 6.5)
    pdf.setFontSize(8.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(107, 114, 128)
    pdf.text(`Page ${page}`, PW - M, 6.5, { align: 'right' })
    pdf.setDrawColor(209, 213, 219)
    pdf.setLineWidth(0.3)
    pdf.line(M, 9.5, PW - M, 9.5)
  }

  const newPage = () => {
    pdf.addPage()
    page++
    pageHeader()
    y = M + 4
  }

  const need = (h: number) => { if (y + h > PH - 16) newPage() }

  const numberedSection = (num: string, title: string) => {
    need(16)
    // Teal left border accent (4px solid #0D9488)
    pdf.setFillColor(13, 148, 136)
    pdf.rect(M, y - 4, 1.2, 8, 'F')
    pdf.setFontSize(13)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(30, 30, 30)
    pdf.text(`${num}. ${title}`, M + 4, y + 2)
    y += 10
    pdf.setFont('helvetica', 'normal')
  }

  // ── SECTION: PAGE 1 HEADER ──
  // Row 1: "FinFlow" bold teal left + Month Year bold dark right
  const rightX = PW - M
  pdf.setFontSize(19)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(42, 181, 160)
  pdf.text('FinFlow', M, 9)
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(30, 30, 30)
  pdf.text(`${monthOnly} ${yearOnly}`, rightX, 8, { align: 'right' })
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(107, 114, 128)
  pdf.text('Financial Report', rightX, 13.5, { align: 'right' })
  // First divider
  pdf.setDrawColor(209, 213, 219)
  pdf.setLineWidth(0.3)
  pdf.line(M, 17, PW - M, 17)
  // Info row: "Prepared for" left + "Generated" right
  pdf.setFontSize(8.5)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(30, 30, 30)
  pdf.text(`Prepared for: ${userName}`, M, 22.5)
  pdf.setTextColor(107, 114, 128)
  pdf.text(`Generated: ${genDateStr}, ${genTimeStr} IST`, rightX, 22.5, { align: 'right' })
  // Currency line
  pdf.setFontSize(7.5)
  pdf.setTextColor(156, 163, 175)
  pdf.text('Currency: Indian Rupees (Rs.)', M, 27.5)
  // Second divider
  pdf.setDrawColor(209, 213, 219)
  pdf.setLineWidth(0.3)
  pdf.line(M, 31, PW - M, 31)
  y = 35

  // ── AI FINANCIAL SUMMARY (FIX 2 — structured 4-section format) ──
  if (aiSummary) {
    need(40)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(30, 30, 30)
    pdf.text('AI Financial Summary', M, y)
    y += 8

    const lh = 5.6 // line height 1.6 for readability

    if (aiSummary.sections) {
      const sec = aiSummary.sections

      const renderSectionLabel = (label: string) => {
        need(10)
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(30, 30, 30)
        pdf.text(label, M + 2, y)
        y += 6
      }

      const renderSectionBody = (text: string) => {
        const sanitized = text.replace(/\u20B9/g, 'Rs.')
        pdf.setFontSize(9.5)
        const lines = pdf.splitTextToSize(sanitized, CW - 8)
        lines.forEach((line: string) => {
          need(6)
          let xCursor = M + 4
          let remaining = line
          while (remaining.length > 0) {
            let earliestIdx = remaining.length
            let matchedKeyword = ''
            for (const kw of AI_SUMMARY_TEAL_KEYWORDS) {
              const idx = remaining.toLowerCase().indexOf(kw.toLowerCase())
              if (idx !== -1 && idx < earliestIdx) {
                earliestIdx = idx
                matchedKeyword = kw
              }
            }
            if (matchedKeyword && earliestIdx < remaining.length) {
              if (earliestIdx > 0) {
                const before = remaining.slice(0, earliestIdx)
                pdf.setFont('helvetica', 'normal')
                pdf.setTextColor(55, 55, 55)
                pdf.text(before, xCursor, y)
                xCursor += pdf.getTextWidth(before)
              }
              const kwText = remaining.slice(earliestIdx, earliestIdx + matchedKeyword.length)
              pdf.setFont('helvetica', 'bold')
              pdf.setTextColor(13, 148, 136)
              pdf.text(kwText, xCursor, y)
              xCursor += pdf.getTextWidth(kwText)
              remaining = remaining.slice(earliestIdx + matchedKeyword.length)
            } else {
              pdf.setFont('helvetica', 'normal')
              pdf.setTextColor(55, 55, 55)
              pdf.text(remaining, xCursor, y)
              remaining = ''
            }
          }
          y += lh
        })
        y += 2
      }

      // Section A
      renderSectionLabel('A. Overall Assessment')
      renderSectionBody(sec.overall || '')

      // Section B
      renderSectionLabel('B. Spending Analysis')
      renderSectionBody(sec.spending || '')

      // Section C
      renderSectionLabel('C. Income Analysis')
      renderSectionBody(sec.income || '')

      // Section D — Recommendations as numbered list with indent
      renderSectionLabel('D. Key Recommendations')
      if (sec.recommendations && sec.recommendations.length > 0) {
        pdf.setFontSize(9.5)
        sec.recommendations.forEach((rec: string, idx: number) => {
          need(8)
          const sanitized = rec.replace(/\u20B9/g, 'Rs.')
          const prefix = `${idx + 1}. `
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(30, 30, 30)
          pdf.text(prefix, M + 6, y)
          const prefixW = pdf.getTextWidth(prefix)
          const recLines = pdf.splitTextToSize(sanitized, CW - 14)
          recLines.forEach((line: string, li: number) => {
            need(6)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(55, 55, 55)
            pdf.text(line, M + 6 + (li === 0 ? prefixW : 0), y)
            y += lh
          })
          y += 1
        })
      }
      y += 4

    } else if (aiSummary.summary) {
      // Legacy single-paragraph fallback
      const sanitizedSummary = aiSummary.summary.replace(/\u20B9/g, 'Rs.')
      pdf.setFontSize(10)
      const summaryLines = pdf.splitTextToSize(sanitizedSummary, CW - 4)
      summaryLines.forEach((line: string, i: number) => {
        let xCursor = M + 2
        const lineY = y + i * lh
        let remaining = line
        while (remaining.length > 0) {
          let earliestIdx = remaining.length
          let matchedKeyword = ''
          for (const kw of AI_SUMMARY_TEAL_KEYWORDS) {
            const idx = remaining.toLowerCase().indexOf(kw.toLowerCase())
            if (idx !== -1 && idx < earliestIdx) {
              earliestIdx = idx
              matchedKeyword = kw
            }
          }
          if (matchedKeyword && earliestIdx < remaining.length) {
            if (earliestIdx > 0) {
              const before = remaining.slice(0, earliestIdx)
              pdf.setFont('helvetica', 'normal')
              pdf.setTextColor(55, 55, 55)
              pdf.text(before, xCursor, lineY)
              xCursor += pdf.getTextWidth(before)
            }
            const kwText = remaining.slice(earliestIdx, earliestIdx + matchedKeyword.length)
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(13, 148, 136)
            pdf.text(kwText, xCursor, lineY)
            xCursor += pdf.getTextWidth(kwText)
            remaining = remaining.slice(earliestIdx + matchedKeyword.length)
          } else {
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(55, 55, 55)
            pdf.text(remaining, xCursor, lineY)
            remaining = ''
          }
        }
      })
      y += summaryLines.length * lh + 10
    }
  }

  // ── KEY METRICS BOXES (FIX 3 — distinct colors per box) ──
  need(50)
  y += 4

  // Three boxes side by side
  const boxW = (CW - 6) / 3
  const boxH = 32
  const boxGap = 3

  // Box 1: Total Income — green theme
  const box1X = M
  pdf.setFillColor(236, 253, 245) // #ECFDF5
  pdf.setDrawColor(110, 231, 183) // #6EE7B7
  pdf.setLineWidth(0.4)
  pdf.roundedRect(box1X, y, boxW, boxH, 2, 2, 'FD')
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(6, 95, 70) // #065F46
  pdf.text('TOTAL INCOME', box1X + boxW / 2, y + 14, { align: 'center' })
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(4, 120, 87) // #047857
  const incomeVal = pdfRs(totalIncome)
  pdf.setFontSize(incomeVal.length > 12 ? 9 : 12)
  pdf.text(incomeVal, box1X + boxW / 2, y + 24, { align: 'center' })

  // Box 2: Total Expense — red theme
  const box2X = M + boxW + boxGap
  pdf.setFillColor(255, 241, 242) // #FFF1F2
  pdf.setDrawColor(254, 205, 211) // #FECDD3
  pdf.setLineWidth(0.4)
  pdf.roundedRect(box2X, y, boxW, boxH, 2, 2, 'FD')
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(159, 18, 57) // #9F1239
  pdf.text('TOTAL EXPENSE', box2X + boxW / 2, y + 14, { align: 'center' })
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(225, 29, 72) // #E11D48
  const expenseVal = pdfRs(totalExpense)
  pdf.setFontSize(expenseVal.length > 12 ? 9 : 12)
  pdf.text(expenseVal, box2X + boxW / 2, y + 24, { align: 'center' })

  // Box 3: Net Savings — conditional
  const box3X = M + (boxW + boxGap) * 2
  const savingsNegative = netSavings < 0
  const savingsZero = netSavings === 0
  if (savingsNegative) {
    pdf.setFillColor(255, 241, 242) // #FFF1F2
    pdf.setDrawColor(254, 205, 211) // #FECDD3
  } else if (savingsZero) {
    pdf.setFillColor(248, 250, 252)
    pdf.setDrawColor(160, 160, 160)
  } else {
    pdf.setFillColor(236, 253, 245) // #ECFDF5
    pdf.setDrawColor(110, 231, 183) // #6EE7B7
  }
  pdf.setLineWidth(0.4)
  pdf.roundedRect(box3X, y, boxW, boxH, 2, 2, 'FD')

  // Badge pill at top
  if (savingsNegative) {
    const badgeText = 'CONCERNING DEFICIT'
    pdf.setFontSize(6)
    const badgeW = pdf.getTextWidth(badgeText) + 6
    const badgeX = box3X + (boxW - badgeW) / 2
    pdf.setFillColor(254, 202, 202)
    pdf.roundedRect(badgeX, y + 2, badgeW, 5, 2, 2, 'F')
    pdf.setTextColor(225, 29, 72) // #E11D48
    pdf.setFont('helvetica', 'bold')
    pdf.text(badgeText, box3X + boxW / 2, y + 5.8, { align: 'center' })
  } else if (!savingsZero) {
    const badgeText = 'HEALTHY SAVINGS'
    pdf.setFontSize(6)
    const badgeW = pdf.getTextWidth(badgeText) + 6
    const badgeX = box3X + (boxW - badgeW) / 2
    pdf.setFillColor(187, 247, 208)
    pdf.roundedRect(badgeX, y + 2, badgeW, 5, 2, 2, 'F')
    pdf.setTextColor(4, 120, 87) // #047857
    pdf.setFont('helvetica', 'bold')
    pdf.text(badgeText, box3X + boxW / 2, y + 5.8, { align: 'center' })
  }

  // Label
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(120, 120, 120)
  pdf.text('NET SAVINGS', box3X + boxW / 2, y + 14, { align: 'center' })

  // Value
  pdf.setFont('helvetica', 'bold')
  if (savingsNegative) {
    pdf.setTextColor(225, 29, 72) // #E11D48
  } else if (savingsZero) {
    pdf.setTextColor(120, 120, 120)
  } else {
    pdf.setTextColor(4, 120, 87) // #047857
  }
  const savingsVal = pdfRs(netSavings)
  pdf.setFontSize(savingsVal.length > 12 ? 9 : 12)
  pdf.text(savingsVal, box3X + boxW / 2, y + 24, { align: 'center' })

  // Savings rate below value
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(120, 120, 120)
  pdf.text(`Savings Rate: ${savingsRate.toFixed(1)}%`, box3X + boxW / 2, y + 29, { align: 'center' })

  y += boxH + 14 // 24px section spacing

  // ── SECTION 1: INCOME BREAKDOWN BY SOURCE (FIX 5 — new section) ──
  if (incomeBreakdown.length > 0) {
    need(30)
    numberedSection('1', 'INCOME BREAKDOWN BY SOURCE')

    const nameW = 50
    const barStart = M + nameW + 8
    const barMax = 60
    const pctX = barStart + barMax + 3

    incomeBreakdown.forEach((src, i) => {
      need(14)
      const color = incomeCatColor(src.name)
      const [cr, cg, cb] = hexToRgb(color)

      // Teal icon
      pdf.setFillColor(cr, cg, cb)
      pdf.roundedRect(M, y - 4, 5, 5, 1, 1, 'F')

      // Source name
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(55, 55, 55)
      const nameDisp = src.name.length > 20 ? src.name.slice(0, 18) + '..' : src.name
      pdf.text(nameDisp, M + 8, y)

      // Bar background (15% opacity of teal)
      // jsPDF doesn't support alpha, use light teal
      pdf.setFillColor(230, 250, 248)
      pdf.roundedRect(barStart, y - 3.5, barMax, 4, 1, 1, 'F')

      // Progress bar fill (teal)
      const barW = Math.max((src.percentage / 100) * barMax, 0.5)
      pdf.setFillColor(cr, cg, cb)
      pdf.roundedRect(barStart, y - 3.5, barW, 4, 1, 1, 'F')

      // Percentage
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(cr, cg, cb)
      pdf.text(`${src.percentage.toFixed(1)}%`, pctX, y)

      // Amount right-aligned below bar
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(90, 90, 90)
      pdf.text(pdfRs(src.amount), PW - M, y + 4, { align: 'right' })

      // Divider
      if (i < incomeBreakdown.length - 1) {
        pdf.setDrawColor(230, 230, 230)
        pdf.setLineWidth(0.2)
        pdf.line(M, y + 7, PW - M, y + 7)
      }

      y += 11
    })
    y += 5
  } else {
    need(16)
    numberedSection('1', 'INCOME BREAKDOWN BY SOURCE')
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(120, 120, 120)
    pdf.text('No income recorded for this month', M + 4, y)
    y += 10
  }

  y += 6 // section spacing

  // ── SECTION 2: EXPENSE BREAKDOWN BY CATEGORY (FIX 4 — unique colors) ──
  if (expenseBreakdown.length > 0) {
    need(30)
    numberedSection('2', 'EXPENSE BREAKDOWN BY CATEGORY')

    const nameW = 50
    const barStart = M + nameW + 8
    const barMax = 60
    const pctX = barStart + barMax + 3

    expenseBreakdown.forEach((cat, i) => {
      need(14)
      const color = catColor(cat.name)
      const [cr, cg, cb] = hexToRgb(color)

      // Category icon (colored rounded square)
      pdf.setFillColor(cr, cg, cb)
      pdf.roundedRect(M, y - 4, 5, 5, 1, 1, 'F')

      // Category name
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(55, 55, 55)
      const nameDisp = cat.name.length > 20 ? cat.name.slice(0, 18) + '..' : cat.name
      pdf.text(nameDisp, M + 8, y)

      // Bar background: same color at 15% opacity
      // Approximate by blending with white
      const bgR = Math.round(cr + (255 - cr) * 0.85)
      const bgG = Math.round(cg + (255 - cg) * 0.85)
      const bgB = Math.round(cb + (255 - cb) * 0.85)
      pdf.setFillColor(bgR, bgG, bgB)
      pdf.roundedRect(barStart, y - 3.5, barMax, 4, 1, 1, 'F')

      // Progress bar fill (category color)
      const barW = Math.max((cat.percentage / 100) * barMax, 0.5)
      pdf.setFillColor(cr, cg, cb)
      pdf.roundedRect(barStart, y - 3.5, barW, 4, 1, 1, 'F')

      // Percentage: same color as bar
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(cr, cg, cb)
      pdf.text(`${cat.percentage.toFixed(1)}%`, pctX, y)

      // Amount right-aligned below bar (dark gray)
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(90, 90, 90)
      pdf.text(pdfRs(cat.amount), PW - M, y + 4, { align: 'right' })

      // Light gray divider
      if (i < expenseBreakdown.length - 1) {
        pdf.setDrawColor(230, 230, 230)
        pdf.setLineWidth(0.2)
        pdf.line(M, y + 7, PW - M, y + 7)
      }

      y += 11
    })
    y += 5
  }

  y += 6 // section spacing

  // ── SECTION 3: TRANSACTION DETAILS (FIX 6) ──
  need(30)
  numberedSection('3', 'TRANSACTION DETAILS')

  const tc = { date: M + 2, desc: M + 26, cat: M + 90, type: M + 132, amt: M + 153 }
  const txRowH = 7

  // Single header row — teal bg, white bold text
  const renderTHdr = () => {
    pdf.setFillColor(13, 148, 136)
    pdf.rect(M, y - 5, CW, txRowH, 'F')
    pdf.setFontSize(8.5)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255)
    pdf.text('Date',        tc.date, y)
    pdf.text('Description', tc.desc, y)
    pdf.text('Category',    tc.cat, y)
    pdf.text('Type',        tc.type, y)
    pdf.text('Amount',      tc.amt, y)
    pdf.setFont('helvetica', 'normal')
    y += txRowH
  }
  renderTHdr()

  transactions.forEach((tx, i) => {
    need(9)
    // Re-render header on new page (FIX 6 — page 2 table gets headers)
    if (y < M + 18 && i > 0) renderTHdr()

    const isIncome = tx.type === 'income'

    // Alternating row backgrounds
    if (i % 2 === 0) {
      pdf.setFillColor(255, 255, 255)
    } else {
      pdf.setFillColor(249, 250, 251) // #F9FAFB
    }
    pdf.rect(M, y - 5, CW, txRowH, 'F')

    // Light gray bottom border
    pdf.setDrawColor(230, 230, 230)
    pdf.setLineWidth(0.2)
    pdf.line(M, y + 2, PW - M, y + 2)

    // Date: DD/MM/YYYY
    const dateStr = normalizeDateToYMD(tx.date).split('-').reverse().join('/')
    pdf.setFontSize(9)
    pdf.setTextColor(55, 55, 55)
    pdf.text(dateStr, tc.date, y)

    // Description: if empty or "Done", show category
    const description = getTransactionDescription(tx.note, tx.category)
    const noteDisplay = pdf.splitTextToSize(description, 60)[0]
    pdf.text(noteDisplay, tc.desc, y)

    // Category
    const catDisp = pdf.splitTextToSize(tx.category || '-', 36)[0]
    pdf.text(catDisp, tc.cat, y)

    // Type: colored badge pill (FIX 6)
    if (isIncome) {
      pdf.setFillColor(236, 253, 245) // #ECFDF5
      pdf.setTextColor(4, 120, 87)    // #047857
    } else {
      pdf.setFillColor(255, 241, 242) // #FFF1F2
      pdf.setTextColor(225, 29, 72)   // #E11D48
    }
    const typeText = tx.type
    const typeW = pdf.getTextWidth(typeText) + 4
    pdf.roundedRect(tc.type - 1, y - 3.5, typeW, 5, 1.5, 1.5, 'F')
    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'bold')
    pdf.text(typeText, tc.type + 1, y)
    pdf.setFont('helvetica', 'normal')

    // Amount with color (FIX 6)
    pdf.setFontSize(9)
    if (isIncome) {
      pdf.setTextColor(4, 120, 87)  // #047857
    } else {
      pdf.setTextColor(225, 29, 72) // #E11D48
    }
    pdf.text(pdfRs(tx.amount), tc.amt, y)

    y += txRowH
  })

  // Post-process: add footers to all pages with known total
  const totalPages = page
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p)
    addFooter(p, totalPages)
  }

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
          || user.email
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
