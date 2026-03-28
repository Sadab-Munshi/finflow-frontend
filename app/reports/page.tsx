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
import { AI_SUMMARY_TEAL_KEYWORDS, getTransactionDescription } from '@/lib/pdf-constants'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { Transaction } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import jsPDF from 'jspdf'

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
  summary: string;
  userName: string;
}

// Use ₹ symbol for PDF output
function pdfCurrency(amount: number): string {
  return '\u20B9' + new Intl.NumberFormat('en-IN', {
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
        setUserName(settings?.name || user.email?.split('@')[0] || 'User')
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
      const savings = totalIncome - totalExpense
      const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0

      const categoryTotals: Record<string, number> = {}
      monthTx.filter(tx => tx.type === 'expense').forEach(tx => {
        const cat = getCategoryByName(tx.category)
        const catName = cat?.name || tx.category.trim()
        categoryTotals[catName] = (categoryTotals[catName] || 0) + tx.amount
      })
      const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => `${name} (\u20B9${amount.toLocaleString('en-IN')})`)
        .join(', ')

      const incomeTotals: Record<string, number> = {}
      monthTx.filter(tx => tx.type === 'income').forEach(tx => {
        const cat = getCategoryByName(tx.category)
        const catName = cat?.name || tx.category.trim()
        incomeTotals[catName] = (incomeTotals[catName] || 0) + tx.amount
      })
      const incomeSources = Object.entries(incomeTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => `${name} (\u20B9${amount.toLocaleString('en-IN')})`)
        .join(', ')

      const [year, month] = monthKey.split('-')
      const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })

      const prompt = `Generate a detailed 5-6 sentence personal financial report summary for ${monthName}.
Total income: \u20B9${totalIncome}, Total expenses: \u20B9${totalExpense}, Net savings: \u20B9${savings}, Savings rate: ${savingsRate}%.
Top expense categories: ${topCategories}.
Income sources: ${incomeSources}.

Cover all of these points:
1. Overall financial health assessment
2. Biggest spending category and whether it is concerning or justified
3. Savings rate evaluation (is it good, average or needs improvement)
4. One specific actionable recommendation to improve finances
5. Positive reinforcement if savings rate is above 30%

Write in a warm, professional tone as if a financial advisor is speaking directly to the user.`

      const res = await fetch('/api/ai/report-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: monthName, totalIncome, totalExpense, categories: Object.entries(categoryTotals).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5), prompt })
      })
      if (!res.ok) throw new Error()
      const { summary } = await res.json()
      setSummaries(prev => ({ ...prev, [monthKey]: summary }))
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
      return { name: catName, color: cat?.color || '#6b7280', amount: amt, percentage: totalExpense > 0 ? (amt / totalExpense) * 100 : 0 }
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

    // Get/generate AI summary
    let summary = summaries[monthKey]
    if (!summary) {
      setLoadingSummary(monthKey)
      try {
        const savings = netSavings
        const savingsRatePct = Math.round(savingsRate)
        const topCategories = categoryBreakdown.slice(0, 5).map(c => `${c.name} (\u20B9${c.amount.toLocaleString('en-IN')})`).join(', ')
        const incomeSources = incomeBreakdown.map(i => `${i.source} (\u20B9${i.amount.toLocaleString('en-IN')})`).join(', ')

        const prompt = `Generate a detailed 5-6 sentence personal financial report summary for ${monthName}.
Total income: \u20B9${totalIncome}, Total expenses: \u20B9${totalExpense}, Net savings: \u20B9${savings}, Savings rate: ${savingsRatePct}%.
Top expense categories: ${topCategories}.
Income sources: ${incomeSources}.

Cover all of these points:
1. Overall financial health assessment
2. Biggest spending category and whether it is concerning or justified
3. Savings rate evaluation (is it good, average or needs improvement)
4. One specific actionable recommendation to improve finances
5. Positive reinforcement if savings rate is above 30%

Write in a warm, professional tone as if a financial advisor is speaking directly to the user.`

        const res = await fetch('/api/ai/report-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            month: monthName,
            totalIncome,
            totalExpense,
            categories: categoryBreakdown.slice(0, 5).map(c => ({ name: c.name, amount: c.amount })),
            prompt
          })
        })
        if (res.ok) {
          const data = await res.json()
          summary = data.summary
          setSummaries(prev => ({ ...prev, [monthKey]: summary }))
        }
      } catch (e) {
        console.error('Failed to generate summary for PDF')
      } finally {
        setLoadingSummary(null)
      }
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
      summary: summary || '',
      userName
    }

    await generatePDF(pdfData)
    setGeneratingPdf(null)
  }

  const generatePDF = async (data: PdfData) => {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = 210
    const pageHeight = 297
    const margin = 14
    const contentWidth = pageWidth - margin * 2
    let yPos = margin
    let currentPage = 1

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

    const addFooter = (pageNum: number) => {
      pdf.setDrawColor(220, 220, 220)
      pdf.setLineWidth(0.3)
      pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)
      pdf.setFontSize(7.5)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(160, 160, 160)
      pdf.text(
        `FinFlow Financial Report \u00B7 Confidential \u00B7 Generated on ${genDateStr}, ${genTimeStr} \u00B7 Page ${pageNum}`,
        pageWidth / 2,
        pageHeight - 7,
        { align: 'center' }
      )
    }

    const addPageHeader = () => {
      pdf.setFontSize(7.5)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(13, 148, 136)
      pdf.text(`FinFlow \u00B7 ${data.monthName}`, pageWidth - margin, 7, { align: 'right' })
    }

    const newPage = () => {
      addFooter(currentPage)
      pdf.addPage()
      currentPage++
      addPageHeader()
      yPos = margin + 6
    }

    const checkPageBreak = (needed: number) => {
      if (yPos + needed > pageHeight - 16) newPage()
    }

    const numberedSection = (num: string, title: string) => {
      checkPageBreak(16)
      // Teal left border accent
      pdf.setFillColor(13, 148, 136)
      pdf.rect(margin, yPos - 4, 1.2, 8, 'F')
      pdf.setFontSize(13)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(30, 30, 30)
      pdf.text(`${num}. ${title}`, margin + 4, yPos + 2)
      yPos += 10
      pdf.setFont('helvetica', 'normal')
    }

    // ── SECTION 1: HEADER BAR ────────────────────────────────────────────────
    const headerH = 28
    pdf.setFillColor(13, 148, 136)
    pdf.rect(0, 0, pageWidth, headerH, 'F')

    // Left column: Logo placeholder (rounded container)
    const logoBoxX = margin
    const logoBoxY = 5
    const logoBoxW = 32
    const logoBoxH = 18
    pdf.setFillColor(217, 250, 247) // #D9FAF7
    pdf.roundedRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, 3, 3, 'F')
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(13, 148, 136)
    pdf.text('FinFlow', logoBoxX + logoBoxW / 2, logoBoxY + logoBoxH / 2 + 1, { align: 'center' })

    // Center column: Month and year
    const centerX = pageWidth / 2
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${monthOnly} ${yearOnly}`, centerX, 13, { align: 'center' })
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Financial Report', centerX, 20, { align: 'center' })

    // Right column: User name and generated date
    const rightX = pageWidth - margin
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255)
    pdf.text(data.userName, rightX, 13, { align: 'right' })
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Generated: ${genDateStr}, ${genTimeStr} IST`, rightX, 20, { align: 'right' })

    // Below header: currency note right-aligned
    yPos = headerH + 4
    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(140, 140, 140)
    pdf.text('All amounts in Indian Rupees (\u20B9)', pageWidth - margin, yPos, { align: 'right' })
    yPos += 8

    // ── SECTION 2: AI FINANCIAL SUMMARY ──────────────────────────────────────
    if (data.summary) {
      checkPageBreak(40)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(30, 30, 30)
      pdf.text('AI Financial Summary', margin, yPos)
      yPos += 8

      // Render summary with keyword highlighting
      pdf.setFontSize(10)
      const summaryLines = pdf.splitTextToSize(data.summary, contentWidth - 4)
      const lineH = 5.2

      const tealKeywords = AI_SUMMARY_TEAL_KEYWORDS

      summaryLines.forEach((line: string, i: number) => {
        let xCursor = margin + 2
        const lineY = yPos + i * lineH
        let remaining = line

        while (remaining.length > 0) {
          let earliestIdx = remaining.length
          let matchedKeyword = ''

          for (const kw of tealKeywords) {
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
      yPos += summaryLines.length * lineH + 10
    }

    // ── SECTION 3: KEY METRICS BOXES ─────────────────────────────────────────
    checkPageBreak(50)
    // Section title
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(13, 148, 136)
    pdf.text('\u2728 AI FINANCIAL SUMMARY & KEY METRICS', margin, yPos)
    yPos += 3
    pdf.setDrawColor(13, 148, 136)
    pdf.setLineWidth(0.5)
    pdf.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 8

    const boxW = (contentWidth - 6) / 3
    const boxH = 32
    const boxGap = 3

    // Box 1: Total Income
    const box1X = margin
    pdf.setFillColor(236, 253, 245)
    pdf.setDrawColor(13, 148, 136)
    pdf.setLineWidth(0.4)
    pdf.roundedRect(box1X, yPos, boxW, boxH, 2, 2, 'FD')
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(5, 150, 105)
    pdf.text('\u2191', box1X + 4, yPos + 7)
    pdf.setFontSize(7)
    pdf.setTextColor(120, 120, 120)
    pdf.text('TOTAL INCOME', box1X + boxW / 2, yPos + 14, { align: 'center' })
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(30, 30, 30)
    const incomeVal = pdfCurrency(data.totalIncome)
    pdf.setFontSize(incomeVal.length > 12 ? 9 : 12)
    pdf.text(incomeVal, box1X + boxW / 2, yPos + 24, { align: 'center' })

    // Box 2: Total Expense
    const box2X = margin + boxW + boxGap
    pdf.setFillColor(255, 241, 242)
    pdf.setDrawColor(220, 38, 38)
    pdf.setLineWidth(0.4)
    pdf.roundedRect(box2X, yPos, boxW, boxH, 2, 2, 'FD')
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(220, 38, 38)
    pdf.text('\u2193', box2X + 4, yPos + 7)
    pdf.setFontSize(7)
    pdf.setTextColor(120, 120, 120)
    pdf.text('TOTAL EXPENSE', box2X + boxW / 2, yPos + 14, { align: 'center' })
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(30, 30, 30)
    const expenseVal = pdfCurrency(data.totalExpense)
    pdf.setFontSize(expenseVal.length > 12 ? 9 : 12)
    pdf.text(expenseVal, box2X + boxW / 2, yPos + 24, { align: 'center' })

    // Box 3: Net Savings
    const box3X = margin + (boxW + boxGap) * 2
    const savingsNegative = data.netSavings < 0
    const savingsZero = data.netSavings === 0
    if (savingsNegative) {
      pdf.setFillColor(255, 241, 242)
      pdf.setDrawColor(220, 38, 38)
    } else if (savingsZero) {
      pdf.setFillColor(248, 250, 252)
      pdf.setDrawColor(160, 160, 160)
    } else {
      pdf.setFillColor(236, 253, 245)
      pdf.setDrawColor(5, 150, 105)
    }
    pdf.setLineWidth(0.4)
    pdf.roundedRect(box3X, yPos, boxW, boxH, 2, 2, 'FD')

    // Badge pill
    if (savingsNegative) {
      const badgeText = 'CONCERNING DEFICIT'
      pdf.setFontSize(6)
      const badgeW = pdf.getTextWidth(badgeText) + 6
      const badgeX = box3X + (boxW - badgeW) / 2
      pdf.setFillColor(254, 202, 202)
      pdf.roundedRect(badgeX, yPos + 2, badgeW, 5, 2, 2, 'F')
      pdf.setTextColor(185, 28, 28)
      pdf.setFont('helvetica', 'bold')
      pdf.text(badgeText, box3X + boxW / 2, yPos + 5.8, { align: 'center' })
    } else if (!savingsZero) {
      const badgeText = 'HEALTHY SAVINGS'
      pdf.setFontSize(6)
      const badgeW = pdf.getTextWidth(badgeText) + 6
      const badgeX = box3X + (boxW - badgeW) / 2
      pdf.setFillColor(187, 247, 208)
      pdf.roundedRect(badgeX, yPos + 2, badgeW, 5, 2, 2, 'F')
      pdf.setTextColor(22, 101, 52)
      pdf.setFont('helvetica', 'bold')
      pdf.text(badgeText, box3X + boxW / 2, yPos + 5.8, { align: 'center' })
    }

    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(120, 120, 120)
    pdf.text('NET SAVINGS', box3X + boxW / 2, yPos + 14, { align: 'center' })

    pdf.setFont('helvetica', 'bold')
    if (savingsNegative) {
      pdf.setTextColor(220, 38, 38)
    } else if (savingsZero) {
      pdf.setTextColor(120, 120, 120)
    } else {
      pdf.setTextColor(5, 150, 105)
    }
    const savingsVal = pdfCurrency(data.netSavings)
    pdf.setFontSize(savingsVal.length > 12 ? 9 : 12)
    pdf.text(savingsVal, box3X + boxW / 2, yPos + 24, { align: 'center' })

    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(120, 120, 120)
    pdf.text(`Savings Rate: ${data.savingsRate.toFixed(1)}%`, box3X + boxW / 2, yPos + 29, { align: 'center' })

    yPos += boxH + 10

    // ── SECTION 4: EXPENSE BREAKDOWN BY CATEGORY ────────────────────────────
    if (data.categoryBreakdown.length > 0) {
      checkPageBreak(30)
      numberedSection('2', 'EXPENSE BREAKDOWN BY CATEGORY')

      const nameW = 50
      const barStart = margin + nameW + 8
      const barMax = 60
      const pctX = barStart + barMax + 3

      data.categoryBreakdown.forEach((cat, i) => {
        checkPageBreak(14)
        const [cr, cg, cb] = hexToRgb(cat.color)

        // Category icon (colored rounded square)
        pdf.setFillColor(cr, cg, cb)
        pdf.roundedRect(margin, yPos - 4, 5, 5, 1, 1, 'F')

        // Category name
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(55, 55, 55)
        const nameDisplay = cat.name.length > 20 ? cat.name.slice(0, 18) + '..' : cat.name
        pdf.text(nameDisplay, margin + 8, yPos)

        // Progress bar background
        pdf.setFillColor(230, 230, 230)
        pdf.roundedRect(barStart, yPos - 3.5, barMax, 4, 1, 1, 'F')

        // Progress bar fill (teal)
        const barW = Math.max((cat.percentage / 100) * barMax, 0.5)
        pdf.setFillColor(13, 148, 136)
        pdf.roundedRect(barStart, yPos - 3.5, barW, 4, 1, 1, 'F')

        // Percentage at right
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(70, 70, 70)
        pdf.text(`${cat.percentage.toFixed(1)}%`, pctX, yPos)

        // Amount right-aligned below
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(90, 90, 90)
        pdf.text(pdfCurrency(cat.amount), pageWidth - margin, yPos + 4, { align: 'right' })

        // Divider
        if (i < data.categoryBreakdown.length - 1) {
          pdf.setDrawColor(230, 230, 230)
          pdf.setLineWidth(0.2)
          pdf.line(margin, yPos + 7, pageWidth - margin, yPos + 7)
        }

        yPos += 11
      })
      yPos += 5
    }

    // ── SECTION 5: TRANSACTION DETAILS ────────────────────────────────────────
    checkPageBreak(30)
    numberedSection('3', 'TRANSACTION DETAILS')

    const tCol = {
      date:     margin + 2,
      desc:     margin + 26,
      category: margin + 90,
      type:     margin + 132,
      amount:   margin + 152,
    }
    const txRowH = 7

    // Single header row
    const renderTxHdr = () => {
      pdf.setFillColor(13, 148, 136)
      pdf.rect(margin, yPos - 5, contentWidth, txRowH, 'F')
      pdf.setFontSize(8.5)
      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Date',        tCol.date, yPos)
      pdf.text('Description', tCol.desc, yPos)
      pdf.text('Category',    tCol.category, yPos)
      pdf.text('Type',        tCol.type, yPos)
      pdf.text('Amount',      tCol.amount, yPos)
      pdf.setFont('helvetica', 'normal')
      yPos += txRowH
    }
    renderTxHdr()

    data.transactions.forEach((tx, idx) => {
      checkPageBreak(txRowH + 2)
      // Re-render header only on new page
      if (yPos < margin + 20 && idx > 0) renderTxHdr()

      const isIncome = tx.type === 'income'

      // Alternating row backgrounds
      if (idx % 2 === 0) {
        pdf.setFillColor(255, 255, 255)
      } else {
        pdf.setFillColor(249, 250, 251) // #F9FAFB
      }
      pdf.rect(margin, yPos - 5, contentWidth, txRowH, 'F')

      // Light gray bottom border
      pdf.setDrawColor(230, 230, 230)
      pdf.setLineWidth(0.2)
      pdf.line(margin, yPos + 2, pageWidth - margin, yPos + 2)

      // Date
      const date = normalizeDateToYMD(tx.date)
      const dateStr = date.split('-').reverse().join('/')
      pdf.setFontSize(9)
      pdf.setTextColor(55, 55, 55)
      pdf.text(dateStr, tCol.date, yPos)

      // Description: if empty or "Done", show category
      const description = getTransactionDescription(tx.note, tx.category)
      const noteDisplay = pdf.splitTextToSize(description, 60)[0]
      pdf.text(noteDisplay, tCol.desc, yPos)

      // Category
      const catRaw = tx.category || '-'
      const catDisplay = pdf.splitTextToSize(catRaw, 36)[0]
      pdf.text(catDisplay, tCol.category, yPos)

      // Type: colored badge pill
      if (isIncome) {
        pdf.setFillColor(220, 252, 231)
        pdf.setTextColor(22, 101, 52)
      } else {
        pdf.setFillColor(254, 226, 226)
        pdf.setTextColor(185, 28, 28)
      }
      const typeText = tx.type
      const typeW = pdf.getTextWidth(typeText) + 4
      pdf.roundedRect(tCol.type - 1, yPos - 3.5, typeW, 5, 1.5, 1.5, 'F')
      pdf.setFontSize(7.5)
      pdf.setFont('helvetica', 'bold')
      pdf.text(typeText, tCol.type + 1, yPos)
      pdf.setFont('helvetica', 'normal')

      // Amount
      pdf.setFontSize(9)
      if (isIncome) {
        pdf.setTextColor(5, 150, 105)
      } else {
        pdf.setTextColor(220, 38, 38)
      }
      pdf.text(pdfCurrency(tx.amount), tCol.amount, yPos)

      yPos += txRowH
    })

    // ── FOOTER ──────────────────────────────────────────────────────────────
    addFooter(currentPage)

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
