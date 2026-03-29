'use client'

import { useState, useEffect } from 'react'
import { FileText, ChevronRight, Sparkles, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { getTransactions } from '@/lib/db'
import { getCategoryByName } from '@/lib/categories'
import { cn, formatIndianCurrency, parseIndianDate, normalizeDateToYMD, formatIST } from '@/lib/utils'
import { AI_SUMMARY_TEAL_KEYWORDS, EXPENSE_CATEGORY_COLORS, INCOME_CATEGORY_COLORS, getTransactionDescription } from '@/lib/pdf-constants'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { Transaction } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import jsPDF from 'jspdf'

interface AISummaryStructured {
  sections?: {
    overall: string;
    spending: string;
    income: string;
    recommendations: string[];
  };
  summary?: string;
}

interface PdfData {
  monthKey: string;
  monthName: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  categoryBreakdown: { name: string; color: string; amount: number; percentage: number }[];
  incomeBreakdown: { source: string; amount: number; percentage: number }[];
  transactions: Transaction[];
  aiSummary: AISummaryStructured | null;
  userName: string;
}

// Use Rs. prefix for PDF output (Helvetica does not support the ₹ glyph)
function pdfCurrency(amount: number): string {
  return 'Rs.' + new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Parse hex color to RGB
function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '')
  const r = parseInt(cleaned.slice(0, 2), 16)
  const g = parseInt(cleaned.slice(2, 4), 16)
  const b = parseInt(cleaned.slice(4, 6), 16)
  return [r, g, b]
}

export default function ReportsPage() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null)
  const [summaries, setSummaries] = useState<Record<string, string>>({})
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      const data = await getTransactions()
      setTransactions(data)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: settings } = await supabase.from('settings').select('name').eq('user_id', user.id).single()
        setUserName(settings?.name || user.user_metadata?.full_name || user.email || 'User')
      }

      setLoading(false)
      setMounted(true)
    }
    load()
  }, [])

  if (loading) return <LoadingScreen />
  if (!mounted) return null

  const monthlyData: Record<string, Transaction[]> = {}
  transactions.forEach(tx => {
    const d = parseIndianDate(tx.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyData[key]) monthlyData[key] = []
    monthlyData[key].push(tx)
  })
  const months = Object.keys(monthlyData).sort((a, b) => b.localeCompare(a))

  const generateSummary = async (monthKey: string) => {
    setLoadingSummary(monthKey)
    try {
      const monthTx = monthlyData[monthKey]
      const totalIncome = monthTx.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0)
      const totalExpense = monthTx.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0)

      const categoryTotals: Record<string, number> = {}
      monthTx.filter(tx => tx.type === 'expense').forEach(tx => {
        const cat = getCategoryByName(tx.category)
        const catName = cat?.name || tx.category.trim()
        categoryTotals[catName] = (categoryTotals[catName] || 0) + tx.amount
      })

      const [year, month] = monthKey.split('-')
      const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })

      const res = await fetch('/api/ai/report-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: monthName, totalIncome, totalExpense, categories: Object.entries(categoryTotals).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5) })
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      // Build display text from structured or legacy format
      let displayText = ''
      if (data.sections) {
        const s = data.sections
        displayText = [s.overall, s.spending, s.income, '', 'Recommendations:', ...(s.recommendations || []).map((r: string, i: number) => `${i + 1}. ${r}`)].filter((v) => v !== undefined && v !== null).join('\n')
      } else if (data.summary) {
        displayText = data.summary
      }
      if (displayText) setSummaries(prev => ({ ...prev, [monthKey]: displayText }))
    } catch { console.error('Failed to generate summary') } finally { setLoadingSummary(null) }
  }

  const downloadPdf = async (monthKey: string) => {
    const monthTx = monthlyData[monthKey]
    const totalIncome = monthTx.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0)
    const totalExpense = monthTx.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0)
    const netSavings = totalIncome - totalExpense
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0

    const [year, month] = monthKey.split('-')
    const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })

    // Expense breakdown
    const categoryTotals: Record<string, number> = {}
    monthTx.filter(tx => tx.type === 'expense').forEach(tx => {
      const cat = getCategoryByName(tx.category)
      const catName = cat?.name || tx.category.trim()
      categoryTotals[catName] = (categoryTotals[catName] || 0) + tx.amount
    })
    const categoryBreakdown = Object.entries(categoryTotals).map(([catName, amt]) => {
      const cat = getCategoryByName(catName)
      return { name: catName, color: EXPENSE_CATEGORY_COLORS[catName] || cat?.color || '#6B7280', amount: amt, percentage: totalExpense > 0 ? (amt / totalExpense) * 100 : 0 }
    }).sort((a, b) => b.amount - a.amount)

    // Income breakdown
    const incomeTotals: Record<string, number> = {}
    monthTx.filter(tx => tx.type === 'income').forEach(tx => {
      const cat = getCategoryByName(tx.category)
      const catName = cat?.name || tx.category.trim()
      incomeTotals[catName] = (incomeTotals[catName] || 0) + tx.amount
    })
    const incomeBreakdown = Object.entries(incomeTotals).map(([source, amt]) => ({
      source,
      amount: amt,
      percentage: totalIncome > 0 ? (amt / totalIncome) * 100 : 0
    })).sort((a, b) => b.amount - a.amount)

    // Get/generate AI summary (structured format)
    let aiSummary: AISummaryStructured | null = null
    setLoadingSummary(monthKey)
    try {
      const res = await fetch('/api/ai/report-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: monthName,
          totalIncome,
          totalExpense,
          categories: categoryBreakdown.slice(0, 5).map(c => ({ name: c.name, amount: c.amount })),
        })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.sections) {
          aiSummary = { sections: data.sections }
        } else if (data.summary) {
          aiSummary = { summary: data.summary }
          setSummaries(prev => ({ ...prev, [monthKey]: data.summary }))
        }
      }
    } catch (e) {
      console.error('Failed to generate summary for PDF')
    } finally {
      setLoadingSummary(null)
    }

    // Fallback: use previously generated legacy summary
    if (!aiSummary && summaries[monthKey]) {
      aiSummary = { summary: summaries[monthKey] }
    }

    setGeneratingPdf(monthKey)

    const pdfData: PdfData = {
      monthKey,
      monthName,
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      categoryBreakdown,
      incomeBreakdown,
      transactions: monthTx.sort((a, b) => new Date(normalizeDateToYMD(b.date)).getTime() - new Date(normalizeDateToYMD(a.date)).getTime()),
      aiSummary,
      userName
    }

    await generatePDF(pdfData)
    setGeneratingPdf(null)
  }

  const generatePDF = async (data: PdfData) => {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const PW = 210
    const PH = 297
    const M = 14
    const CW = PW - M * 2
    let y = M
    let page = 1

    const generatedDate = formatIST(new Date().toISOString())
    const fileName = `FinFlow-Report-${data.monthName.replace(' ', '-')}.pdf`

    // Parse date and time parts
    const dateParts = generatedDate.split(',').map((s: string) => s.trim())
    const genDateStr = dateParts[0] || generatedDate
    const genTimeStr = dateParts.slice(1).join(',').trim() || ''

    // Extract month and year
    const monthYearParts = data.monthName.split(' ')
    const monthOnly = monthYearParts[0] || data.monthName
    const yearOnly = monthYearParts[1] || ''

    // ── Helpers ───────────────────────────────────────────────────────────────

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
    const addPageHeader = () => {
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(42, 181, 160)
      pdf.text('FinFlow', M, 6.5)
      const fw = pdf.getTextWidth('FinFlow')
      pdf.setFontSize(8.5)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(107, 114, 128)
      pdf.text(` | ${data.monthName} Financial Report`, M + fw, 6.5)
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
      addPageHeader()
      y = M + 4
    }

    const checkPageBreak = (needed: number) => {
      if (y + needed > PH - 16) newPage()
    }

    const numberedSection = (num: string, title: string) => {
      checkPageBreak(16)
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

    // ── PAGE 1 HEADER ────────────────────────────────────────────────────────
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
    pdf.text(`Prepared for: ${data.userName}`, M, 22.5)
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

    // ── AI FINANCIAL SUMMARY (FIX 2 — structured 4-section format) ───────────
    if (data.aiSummary) {
      checkPageBreak(40)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(30, 30, 30)
      pdf.text('AI Financial Summary', M, y)
      y += 8

      const lh = 5.6 // line height 1.6

      if (data.aiSummary.sections) {
        const sec = data.aiSummary.sections

        const renderSectionLabel = (label: string) => {
          checkPageBreak(10)
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
            checkPageBreak(6)
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
            checkPageBreak(8)
            const sanitized = rec.replace(/\u20B9/g, 'Rs.')
            const prefix = `${idx + 1}. `
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(30, 30, 30)
            pdf.text(prefix, M + 6, y)
            const prefixW = pdf.getTextWidth(prefix)
            const recLines = pdf.splitTextToSize(sanitized, CW - 14)
            recLines.forEach((line: string, li: number) => {
              checkPageBreak(6)
              pdf.setFont('helvetica', 'normal')
              pdf.setTextColor(55, 55, 55)
              pdf.text(line, M + 6 + (li === 0 ? prefixW : 0), y)
              y += lh
            })
            y += 1
          })
        }
        y += 4

      } else if (data.aiSummary.summary) {
        // Legacy single-paragraph fallback
        const sanitizedSummary = data.aiSummary.summary.replace(/\u20B9/g, 'Rs.')
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

    // ── KEY METRICS BOXES (FIX 3 — distinct colors per box) ──────────────────
    checkPageBreak(50)
    y += 4

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
    const incomeVal = pdfCurrency(data.totalIncome)
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
    const expenseVal = pdfCurrency(data.totalExpense)
    pdf.setFontSize(expenseVal.length > 12 ? 9 : 12)
    pdf.text(expenseVal, box2X + boxW / 2, y + 24, { align: 'center' })

    // Box 3: Net Savings — conditional
    const box3X = M + (boxW + boxGap) * 2
    const savingsNegative = data.netSavings < 0
    const savingsZero = data.netSavings === 0
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

    // Badge pill
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

    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(120, 120, 120)
    pdf.text('NET SAVINGS', box3X + boxW / 2, y + 14, { align: 'center' })

    pdf.setFont('helvetica', 'bold')
    if (savingsNegative) {
      pdf.setTextColor(225, 29, 72) // #E11D48
    } else if (savingsZero) {
      pdf.setTextColor(120, 120, 120)
    } else {
      pdf.setTextColor(4, 120, 87) // #047857
    }
    const savingsVal = pdfCurrency(data.netSavings)
    pdf.setFontSize(savingsVal.length > 12 ? 9 : 12)
    pdf.text(savingsVal, box3X + boxW / 2, y + 24, { align: 'center' })

    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(120, 120, 120)
    pdf.text(`Savings Rate: ${data.savingsRate.toFixed(1)}%`, box3X + boxW / 2, y + 29, { align: 'center' })

    y += boxH + 14 // 24px section spacing

    // ── SECTION 1: INCOME BREAKDOWN BY SOURCE (FIX 5 — new section) ──────────
    if (data.incomeBreakdown.length > 0) {
      checkPageBreak(30)
      numberedSection('1', 'INCOME BREAKDOWN BY SOURCE')

      const nameW = 50
      const barStart = M + nameW + 8
      const barMax = 60
      const pctX = barStart + barMax + 3

      data.incomeBreakdown.forEach((src, i) => {
        checkPageBreak(14)
        const color = INCOME_CATEGORY_COLORS[src.source] || '#0D9488'
        const [cr, cg, cb] = hexToRgb(color)

        // Teal icon
        pdf.setFillColor(cr, cg, cb)
        pdf.roundedRect(M, y - 4, 5, 5, 1, 1, 'F')

        // Source name
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(55, 55, 55)
        const nameDisp = src.source.length > 20 ? src.source.slice(0, 18) + '..' : src.source
        pdf.text(nameDisp, M + 8, y)

        // Bar background (light teal)
        pdf.setFillColor(230, 250, 248)
        pdf.roundedRect(barStart, y - 3.5, barMax, 4, 1, 1, 'F')

        // Progress bar fill
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
        pdf.text(pdfCurrency(src.amount), PW - M, y + 4, { align: 'right' })

        // Divider
        if (i < data.incomeBreakdown.length - 1) {
          pdf.setDrawColor(230, 230, 230)
          pdf.setLineWidth(0.2)
          pdf.line(M, y + 7, PW - M, y + 7)
        }

        y += 11
      })
      y += 5
    } else {
      checkPageBreak(16)
      numberedSection('1', 'INCOME BREAKDOWN BY SOURCE')
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'italic')
      pdf.setTextColor(120, 120, 120)
      pdf.text('No income recorded for this month', M + 4, y)
      y += 10
    }

    y += 6 // section spacing

    // ── SECTION 2: EXPENSE BREAKDOWN BY CATEGORY (FIX 4 — unique colors) ─────
    if (data.categoryBreakdown.length > 0) {
      checkPageBreak(30)
      numberedSection('2', 'EXPENSE BREAKDOWN BY CATEGORY')

      const nameW = 50
      const barStart = M + nameW + 8
      const barMax = 60
      const pctX = barStart + barMax + 3

      data.categoryBreakdown.forEach((cat, i) => {
        checkPageBreak(14)
        const color = EXPENSE_CATEGORY_COLORS[cat.name] || cat.color || '#6B7280'
        const [cr, cg, cb] = hexToRgb(color)

        // Category icon (colored rounded square)
        pdf.setFillColor(cr, cg, cb)
        pdf.roundedRect(M, y - 4, 5, 5, 1, 1, 'F')

        // Category name
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(55, 55, 55)
        const nameDisplay = cat.name.length > 20 ? cat.name.slice(0, 18) + '..' : cat.name
        pdf.text(nameDisplay, M + 8, y)

        // Bar background: same color at 15% opacity (blend with white)
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
        pdf.text(pdfCurrency(cat.amount), PW - M, y + 4, { align: 'right' })

        // Light gray divider
        if (i < data.categoryBreakdown.length - 1) {
          pdf.setDrawColor(230, 230, 230)
          pdf.setLineWidth(0.2)
          pdf.line(M, y + 7, PW - M, y + 7)
        }

        y += 11
      })
      y += 5
    }

    y += 6 // section spacing

    // ── SECTION 3: TRANSACTION DETAILS (FIX 6) ──────────────────────────────
    checkPageBreak(30)
    numberedSection('3', 'TRANSACTION DETAILS')

    const tCol = {
      date:     M + 2,
      desc:     M + 26,
      category: M + 90,
      type:     M + 132,
      amount:   M + 152,
    }
    const txRowH = 7

    // Single header row — teal bg, white bold text
    const renderTxHdr = () => {
      pdf.setFillColor(13, 148, 136)
      pdf.rect(M, y - 5, CW, txRowH, 'F')
      pdf.setFontSize(8.5)
      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Date',        tCol.date, y)
      pdf.text('Description', tCol.desc, y)
      pdf.text('Category',    tCol.category, y)
      pdf.text('Type',        tCol.type, y)
      pdf.text('Amount',      tCol.amount, y)
      pdf.setFont('helvetica', 'normal')
      y += txRowH
    }
    renderTxHdr()

    data.transactions.forEach((tx, idx) => {
      checkPageBreak(txRowH + 2)
      // Re-render header on new page (FIX 6 — page 2 table gets headers)
      if (y < M + 18 && idx > 0) renderTxHdr()

      const isIncome = tx.type === 'income'

      // Alternating row backgrounds
      if (idx % 2 === 0) {
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
      const date = normalizeDateToYMD(tx.date)
      const dateStr = date.split('-').reverse().join('/')
      pdf.setFontSize(9)
      pdf.setTextColor(55, 55, 55)
      pdf.text(dateStr, tCol.date, y)

      // Description: if empty or "Done", show category
      const description = getTransactionDescription(tx.note, tx.category)
      const noteDisplay = pdf.splitTextToSize(description, 60)[0]
      pdf.text(noteDisplay, tCol.desc, y)

      // Category
      const catRaw = tx.category || '-'
      const catDisplay = pdf.splitTextToSize(catRaw, 36)[0]
      pdf.text(catDisplay, tCol.category, y)

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
      pdf.roundedRect(tCol.type - 1, y - 3.5, typeW, 5, 1.5, 1.5, 'F')
      pdf.setFontSize(7.5)
      pdf.setFont('helvetica', 'bold')
      pdf.text(typeText, tCol.type + 1, y)
      pdf.setFont('helvetica', 'normal')

      // Amount with color (FIX 6)
      pdf.setFontSize(9)
      if (isIncome) {
        pdf.setTextColor(4, 120, 87)  // #047857
      } else {
        pdf.setTextColor(225, 29, 72) // #E11D48
      }
      pdf.text(pdfCurrency(tx.amount), tCol.amount, y)

      y += txRowH
    })

    // ── FOOTER ──────────────────────────────────────────────────────────────
    // Post-process: add footers to all pages with known total
    const totalPages = page
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p)
      addFooter(p, totalPages)
    }

    pdf.save(fileName)
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('monthlyReports')}</h1>
        {months.length === 0 ? (
          <Card className="border-gray-100"><CardContent className="p-8 text-center text-gray-500"><FileText className="w-12 h-12 mx-auto mb-3 text-gray-200" /><p>{t('noReports')}</p><p className="text-sm">{t('addTransactionsFirst')}</p></CardContent></Card>
        ) : (
          <div className="space-y-4">
            {months.map(monthKey => {
              const monthTx = monthlyData[monthKey]
              const totalIncome = monthTx.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0)
              const totalExpense = monthTx.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0)
              const netSavings = totalIncome - totalExpense
              const [year, month] = monthKey.split('-')
              const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
              const isExpanded = expandedMonth === monthKey

              const categoryTotals: Record<string, number> = {}
              monthTx.filter(tx => tx.type === 'expense').forEach(tx => {
                const cat = getCategoryByName(tx.category)
                const catName = cat?.name || tx.category.trim()
                categoryTotals[catName] = (categoryTotals[catName] || 0) + tx.amount
              })
              const categoryBreakdown = Object.entries(categoryTotals).map(([catName, amt]) => {
                const cat = getCategoryByName(catName)
                return { name: catName, color: cat?.color || '#6b7280', amount: amt, percentage: totalExpense > 0 ? (amt / totalExpense) * 100 : 0 }
              }).sort((a, b) => b.amount - a.amount)

              return (
                <Card key={monthKey} className="border-gray-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-lg font-semibold text-gray-800">{monthName}</h3>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadPdf(monthKey)}
                          disabled={generatingPdf === monthKey || loadingSummary === monthKey}
                          className="border-gray-200 text-teal-600 hover:bg-teal-50"
                        >
                          {generatingPdf === monthKey ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Download className="w-4 h-4 mr-2" />Download PDF</>}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setExpandedMonth(isExpanded ? null : monthKey)} className="text-emerald-600">
                          {isExpanded ? t('close') : t('viewDetails')}
                          <ChevronRight className={cn("w-4 h-4 ml-1 transition-transform", isExpanded && "rotate-90")} />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                      <div><p className="text-sm text-gray-500">{t('income')}</p><p className="text-xl font-semibold text-emerald-600">{formatIndianCurrency(totalIncome)}</p></div>
                      <div><p className="text-sm text-gray-500">{t('expense')}</p><p className="text-xl font-semibold text-orange-600">{formatIndianCurrency(totalExpense)}</p></div>
                      <div><p className="text-sm text-gray-500">{t('netSavings')}</p><p className={cn("text-xl font-semibold", netSavings >= 0 ? "text-emerald-600" : "text-red-500")}>{formatIndianCurrency(netSavings)}</p></div>
                    </div>
                    {isExpanded && (
                      <div className="mt-6 space-y-6 border-t border-gray-100 pt-6">
                        <div>
                          <h4 className="font-medium mb-4">{t('categoryBreakdown')}</h4>
                          <div className="space-y-3">
                            {categoryBreakdown.map((cat, i) => (
                              <div key={i}>
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} /><span>{cat.name}</span></div>
                                  <span className="font-medium">{formatIndianCurrency(cat.amount)}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1"><div className="h-2 rounded-full" style={{ backgroundColor: cat.color, width: `${cat.percentage}%` }} /></div>
                                <p className="text-xs text-gray-500 text-right">{cat.percentage.toFixed(1)}%</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium">{t('generateSummary')}</h4>
                            {!summaries[monthKey] && (
                              <Button size="sm" variant="outline" onClick={() => generateSummary(monthKey)} disabled={loadingSummary === monthKey} className="border-gray-200">
                                {loadingSummary === monthKey ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('loading')}</> : <><Sparkles className="w-4 h-4 mr-2" />{t('generateSummary')}</>}
                              </Button>
                            )}
                          </div>
                          {summaries[monthKey] ? <p className="text-sm text-gray-600 bg-emerald-50 p-4 rounded-lg">{summaries[monthKey]}</p> : <p className="text-sm text-gray-400">{t('clickGenerate')}</p>}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
