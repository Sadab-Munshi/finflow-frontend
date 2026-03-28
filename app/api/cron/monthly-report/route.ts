import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeDateToYMD } from '@/lib/utils'
import {
  EXPENSE_CATEGORY_COLORS,
  getTransactionDescription,
  buildAISummaryPrompt,
} from '@/lib/pdf-constants'
import { buildReportHTML, PdfReportData } from '@/lib/pdf-html-template'
import jsPDF from 'jspdf'
import fs from 'fs'
import path from 'path'

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

// ── PDF Generator (server-side — HTML template + jsPDF) ──────────────────────

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

  // Read logo as base64
  let logoBase64 = ''
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'report-logo.png')
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath)
      logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`
    }
  } catch {
    // Logo unavailable — template will render without it
  }

  // Build AI summary in the PdfReportData format
  let pdfAiSummary: PdfReportData['aiSummary'] = null
  if (aiSummary?.sections) {
    pdfAiSummary = {
      assessment: aiSummary.sections.overall || '',
      spendingAnalysis: aiSummary.sections.spending || '',
      incomeAnalysis: aiSummary.sections.income || '',
      recommendations: aiSummary.sections.recommendations || [],
    }
  } else if (aiSummary?.summary) {
    pdfAiSummary = {
      assessment: aiSummary.summary,
      spendingAnalysis: '',
      incomeAnalysis: '',
      recommendations: [],
    }
  }

  // Build PdfReportData for the HTML template
  const reportData: PdfReportData = {
    userName,
    month: monthName,
    generatedAt: generatedDate,
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
    aiSummary: pdfAiSummary,
    incomeBreakdown: incomeBreakdown.map(i => ({
      source: i.name,
      amount: i.amount,
      percentage: i.percentage,
    })),
    expenseBreakdown: expenseBreakdown.map(e => ({
      category: e.name,
      amount: e.amount,
      percentage: e.percentage,
    })),
    transactions: transactions.map(tx => ({
      date: normalizeDateToYMD(tx.date).split('-').reverse().join('/'),
      description: getTransactionDescription(tx.note, tx.category),
      category: tx.category || '-',
      type: tx.type,
      amount: tx.amount,
    })),
  }

  // Generate the HTML string (same template as client-side)
  const _htmlString = buildReportHTML(reportData, logoBase64)

  // Server-side: use jsPDF text-based rendering (html2canvas requires a DOM).
  // We generate a styled PDF using jsPDF primitives that matches the HTML template design.
  const pdf = new jsPDF('p', 'mm', 'a4')
  const PW = 210, PH = 297
  const M = 14
  const CW = PW - M * 2
  let y = M
  let page = 1

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

  // Parse generatedDate into date and time parts
  const dateParts = generatedDate.split(',').map(s => s.trim())
  const genDateStr = dateParts[0] || generatedDate
  const genTimeStr = dateParts.slice(1).join(',').trim() || ''

  // Extract month and year from monthName (e.g. "March 2026")
  const monthYearParts = monthName.split(' ')
  const monthOnly = monthYearParts[0] || monthName
  const yearOnly = monthYearParts[1] || ''

  // ── Helpers ──

  const addFooter = () => {
    pdf.setDrawColor(229, 231, 235)
    pdf.setLineWidth(0.3)
    pdf.line(M, PH - 12, PW - M, PH - 12)
    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(156, 163, 175)
    pdf.text('FinFlow Financial Report \u00B7 Confidential', M, PH - 7)
    pdf.text(
      `Generated on ${genDateStr}, ${genTimeStr} \u00B7 Page ${page}`,
      PW - M, PH - 7, { align: 'right' }
    )
  }

  const pageHeader = () => {
    pdf.setDrawColor(13, 148, 136)
    pdf.setLineWidth(0.5)
    pdf.line(M, 5, PW - M, 5)
    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(130, 130, 130)
    pdf.text(`FinFlow \u00B7 ${monthName}`, M, 9)
    pdf.text(`Page ${page}`, PW - M, 9, { align: 'right' })
  }

  const newPage = () => {
    addFooter()
    pdf.addPage()
    page++
    pageHeader()
    y = M + 4
  }

  const need = (h: number) => { if (y + h > PH - 16) newPage() }

  const numberedSection = (num: string, title: string) => {
    need(16)
    pdf.setFillColor(13, 148, 136)
    pdf.rect(M, y - 4, 1.2, 8, 'F')
    pdf.setFontSize(13)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(30, 30, 30)
    pdf.text(`${num}. ${title}`, M + 4, y + 2)
    y += 10
    pdf.setFont('helvetica', 'normal')
  }

  // ── HEADER BAR ──
  const headerH = 20
  pdf.setFillColor(13, 148, 136)
  pdf.rect(0, 0, PW, headerH, 'F')

  // Logo container
  const logoBoxX = M
  const logoBoxY = 3
  const logoBoxW = 28
  const logoBoxH = 14
  pdf.setFillColor(217, 250, 247)
  pdf.roundedRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, 3, 3, 'F')

  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'report-logo.png')
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath)
      const logoB64 = 'data:image/png;base64,' + logoData.toString('base64')
      const logoH = 9.5
      const logoW = logoH
      const lx = logoBoxX + (logoBoxW - logoW) / 2
      const ly = logoBoxY + (logoBoxH - logoH) / 2
      pdf.addImage(logoB64, 'PNG', lx, ly, logoW, logoH)
    } else {
      throw new Error('Logo file not found')
    }
  } catch {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(13, 148, 136)
    pdf.text('FinFlow', logoBoxX + logoBoxW / 2, logoBoxY + logoBoxH / 2 + 1, { align: 'center' })
  }

  // Center: Month + "Financial Report"
  const centerX = PW / 2
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`${monthOnly} ${yearOnly}`, centerX, 10, { align: 'center' })
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Financial Report', centerX, 16, { align: 'center' })

  // Right: User name + date
  const rightX = PW - M
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(255, 255, 255)
  pdf.text(userName, rightX, 10, { align: 'right' })
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Generated: ${genDateStr}, ${genTimeStr} IST`, rightX, 16, { align: 'right' })

  // Currency note
  y = headerH + 4
  pdf.setFontSize(7.5)
  pdf.setFont('helvetica', 'italic')
  pdf.setTextColor(140, 140, 140)
  pdf.text('All amounts in Indian Rupees (Rs.)', PW - M, y, { align: 'right' })
  y += 8

  // ── AI FINANCIAL SUMMARY ──
  if (aiSummary) {
    need(40)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(30, 30, 30)
    pdf.text('AI Financial Summary', M, y)
    y += 8

    const lh = 5.6

    if (aiSummary.sections) {
      const sec = aiSummary.sections

      const renderLabel = (label: string) => {
        need(10)
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(13, 148, 136)
        pdf.text(label, M + 2, y)
        y += 6
      }

      const renderBody = (text: string) => {
        const sanitized = text.replace(/\u20B9/g, 'Rs.')
        pdf.setFontSize(9.5)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(55, 65, 81)
        const lines = pdf.splitTextToSize(sanitized, CW - 8)
        lines.forEach((line: string) => {
          need(6)
          pdf.text(line, M + 4, y)
          y += lh
        })
        y += 2
      }

      renderLabel('A. Overall Assessment')
      renderBody(sec.overall || '')
      renderLabel('B. Spending Analysis')
      renderBody(sec.spending || '')
      renderLabel('C. Income Analysis')
      renderBody(sec.income || '')

      renderLabel('D. Key Recommendations')
      if (sec.recommendations && sec.recommendations.length > 0) {
        pdf.setFontSize(9.5)
        sec.recommendations.forEach((rec: string, idx: number) => {
          need(8)
          const sanitized = rec.replace(/\u20B9/g, 'Rs.')
          const prefix = `${idx + 1}. `
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(13, 148, 136)
          pdf.text(prefix, M + 6, y)
          const prefixW = pdf.getTextWidth(prefix)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(55, 65, 81)
          const recLines = pdf.splitTextToSize(sanitized, CW - 14)
          recLines.forEach((line: string, li: number) => {
            need(6)
            pdf.text(line, M + 6 + (li === 0 ? prefixW : 0), y)
            y += lh
          })
          y += 1
        })
      }
      y += 4

    } else if (aiSummary.summary) {
      const sanitized = aiSummary.summary.replace(/\u20B9/g, 'Rs.')
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(55, 65, 81)
      const lines = pdf.splitTextToSize(sanitized, CW - 4)
      lines.forEach((line: string) => {
        need(6)
        pdf.text(line, M + 2, y)
        y += lh
      })
      y += 10
    }
  }

  // ── STAT BOXES ──
  need(50)
  y += 4
  const boxW = (CW - 6) / 3
  const boxH = 32
  const boxGap = 3

  // Box 1: Total Income
  const box1X = M
  pdf.setFillColor(236, 253, 245)
  pdf.setDrawColor(110, 231, 183)
  pdf.setLineWidth(0.4)
  pdf.roundedRect(box1X, y, boxW, boxH, 2, 2, 'FD')
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(6, 95, 70)
  pdf.text('TOTAL INCOME', box1X + boxW / 2, y + 14, { align: 'center' })
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(4, 120, 87)
  const incVal = pdfRs(totalIncome)
  pdf.setFontSize(incVal.length > 12 ? 9 : 12)
  pdf.text(incVal, box1X + boxW / 2, y + 24, { align: 'center' })

  // Box 2: Total Expense
  const box2X = M + boxW + boxGap
  pdf.setFillColor(255, 241, 242)
  pdf.setDrawColor(254, 205, 211)
  pdf.setLineWidth(0.4)
  pdf.roundedRect(box2X, y, boxW, boxH, 2, 2, 'FD')
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(159, 18, 57)
  pdf.text('TOTAL EXPENSE', box2X + boxW / 2, y + 14, { align: 'center' })
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(225, 29, 72)
  const expVal = pdfRs(totalExpense)
  pdf.setFontSize(expVal.length > 12 ? 9 : 12)
  pdf.text(expVal, box2X + boxW / 2, y + 24, { align: 'center' })

  // Box 3: Net Savings
  const box3X = M + (boxW + boxGap) * 2
  const savingsNeg = netSavings < 0
  const savingsZero = netSavings === 0
  if (savingsNeg) {
    pdf.setFillColor(255, 241, 242)
    pdf.setDrawColor(254, 205, 211)
  } else if (savingsZero) {
    pdf.setFillColor(248, 250, 252)
    pdf.setDrawColor(160, 160, 160)
  } else {
    pdf.setFillColor(236, 253, 245)
    pdf.setDrawColor(110, 231, 183)
  }
  pdf.setLineWidth(0.4)
  pdf.roundedRect(box3X, y, boxW, boxH, 2, 2, 'FD')

  if (savingsNeg) {
    const bText = 'CONCERNING DEFICIT'
    pdf.setFontSize(6)
    const bW = pdf.getTextWidth(bText) + 6
    const bX = box3X + (boxW - bW) / 2
    pdf.setFillColor(254, 226, 226)
    pdf.roundedRect(bX, y + 2, bW, 5, 2, 2, 'F')
    pdf.setTextColor(153, 27, 27)
    pdf.setFont('helvetica', 'bold')
    pdf.text(bText, box3X + boxW / 2, y + 5.8, { align: 'center' })
  } else if (!savingsZero) {
    const bText = 'HEALTHY SAVINGS'
    pdf.setFontSize(6)
    const bW = pdf.getTextWidth(bText) + 6
    const bX = box3X + (boxW - bW) / 2
    pdf.setFillColor(209, 250, 229)
    pdf.roundedRect(bX, y + 2, bW, 5, 2, 2, 'F')
    pdf.setTextColor(6, 95, 70)
    pdf.setFont('helvetica', 'bold')
    pdf.text(bText, box3X + boxW / 2, y + 5.8, { align: 'center' })
  }

  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(120, 120, 120)
  pdf.text('NET SAVINGS', box3X + boxW / 2, y + 14, { align: 'center' })

  pdf.setFont('helvetica', 'bold')
  if (savingsNeg) pdf.setTextColor(225, 29, 72)
  else if (savingsZero) pdf.setTextColor(120, 120, 120)
  else pdf.setTextColor(4, 120, 87)
  const savVal = pdfRs(netSavings)
  pdf.setFontSize(savVal.length > 12 ? 9 : 12)
  pdf.text(savVal, box3X + boxW / 2, y + 24, { align: 'center' })

  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(120, 120, 120)
  pdf.text(`Savings Rate: ${savingsRate.toFixed(1)}%`, box3X + boxW / 2, y + 29, { align: 'center' })

  y += boxH + 14

  // ── INCOME BREAKDOWN ──
  if (incomeBreakdown.length > 0) {
    need(30)
    numberedSection('1', 'INCOME BREAKDOWN BY SOURCE')
    const barStart = M + 58, barMax = 60, pctX = barStart + barMax + 3

    incomeBreakdown.forEach((src, i) => {
      need(14)
      pdf.setFillColor(13, 148, 136)
      pdf.roundedRect(M, y - 4, 5, 5, 1, 1, 'F')

      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(55, 55, 55)
      pdf.text(src.name.length > 20 ? src.name.slice(0, 18) + '..' : src.name, M + 8, y)

      pdf.setFillColor(209, 250, 229)
      pdf.roundedRect(barStart, y - 3.5, barMax, 4, 1, 1, 'F')
      const bW = Math.max((src.percentage / 100) * barMax, 0.5)
      pdf.setFillColor(13, 148, 136)
      pdf.roundedRect(barStart, y - 3.5, bW, 4, 1, 1, 'F')

      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(4, 120, 87)
      pdf.text(`${src.percentage.toFixed(1)}%`, pctX, y)

      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(90, 90, 90)
      pdf.text(pdfRs(src.amount), PW - M, y + 4, { align: 'right' })

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

  y += 6

  // ── EXPENSE BREAKDOWN ──
  if (expenseBreakdown.length > 0) {
    need(30)
    numberedSection('2', 'EXPENSE BREAKDOWN BY CATEGORY')
    const barStart = M + 58, barMax = 60, pctX = barStart + barMax + 3

    expenseBreakdown.forEach((cat, i) => {
      need(14)
      const color = EXPENSE_CATEGORY_COLORS[cat.name] || '#6B7280'
      const [cr, cg, cb] = hexToRgb(color)

      pdf.setFillColor(cr, cg, cb)
      pdf.roundedRect(M, y - 4, 5, 5, 1, 1, 'F')

      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(55, 55, 55)
      pdf.text(cat.name.length > 20 ? cat.name.slice(0, 18) + '..' : cat.name, M + 8, y)

      const bgR = Math.round(cr + (255 - cr) * 0.85)
      const bgG = Math.round(cg + (255 - cg) * 0.85)
      const bgB = Math.round(cb + (255 - cb) * 0.85)
      pdf.setFillColor(bgR, bgG, bgB)
      pdf.roundedRect(barStart, y - 3.5, barMax, 4, 1, 1, 'F')
      const bW = Math.max((cat.percentage / 100) * barMax, 0.5)
      pdf.setFillColor(cr, cg, cb)
      pdf.roundedRect(barStart, y - 3.5, bW, 4, 1, 1, 'F')

      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(cr, cg, cb)
      pdf.text(`${cat.percentage.toFixed(1)}%`, pctX, y)

      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(90, 90, 90)
      pdf.text(pdfRs(cat.amount), PW - M, y + 4, { align: 'right' })

      if (i < expenseBreakdown.length - 1) {
        pdf.setDrawColor(230, 230, 230)
        pdf.setLineWidth(0.2)
        pdf.line(M, y + 7, PW - M, y + 7)
      }
      y += 11
    })
    y += 5
  }

  y += 6

  // ── TRANSACTION DETAILS ──
  need(30)
  numberedSection('3', 'TRANSACTION DETAILS')

  const tc = { date: M + 2, desc: M + 26, cat: M + 90, type: M + 132, amt: M + 153 }
  const txRowH = 7

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
    if (y < M + 18 && i > 0) renderTHdr()

    const isIncome = tx.type === 'income'

    if (i % 2 === 0) pdf.setFillColor(255, 255, 255)
    else pdf.setFillColor(249, 250, 251)
    pdf.rect(M, y - 5, CW, txRowH, 'F')

    pdf.setDrawColor(230, 230, 230)
    pdf.setLineWidth(0.2)
    pdf.line(M, y + 2, PW - M, y + 2)

    const dateStr = normalizeDateToYMD(tx.date).split('-').reverse().join('/')
    pdf.setFontSize(9)
    pdf.setTextColor(55, 55, 55)
    pdf.text(dateStr, tc.date, y)

    const description = getTransactionDescription(tx.note, tx.category)
    pdf.text(pdf.splitTextToSize(description, 60)[0], tc.desc, y)
    pdf.text(pdf.splitTextToSize(tx.category || '-', 36)[0], tc.cat, y)

    if (isIncome) {
      pdf.setFillColor(209, 250, 229)
      pdf.setTextColor(6, 95, 70)
    } else {
      pdf.setFillColor(254, 226, 226)
      pdf.setTextColor(153, 27, 27)
    }
    const typeText = tx.type
    const typeW = pdf.getTextWidth(typeText) + 4
    pdf.roundedRect(tc.type - 1, y - 3.5, typeW, 5, 1.5, 1.5, 'F')
    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'bold')
    pdf.text(typeText, tc.type + 1, y)
    pdf.setFont('helvetica', 'normal')

    pdf.setFontSize(9)
    if (isIncome) pdf.setTextColor(4, 120, 87)
    else pdf.setTextColor(225, 29, 72)
    pdf.text(pdfRs(tx.amount), tc.amt, y)

    y += txRowH
  })

  addFooter()

  return pdf.output('datauristring').split(',')[1]
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
