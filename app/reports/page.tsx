'use client'

import { useState, useEffect, useRef } from 'react'
import { FileText, ChevronRight, Sparkles, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { getTransactions } from '@/lib/db'
import { getCategoryByName } from '@/lib/categories'
import { cn, formatIndianCurrency, parseIndianDate, normalizeDateToYMD, formatIST } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { Transaction } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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

// Helper to replace ₹ with Rs. for PDF output
function pdfCurrency(amount: number): string {
  return formatIndianCurrency(amount).replace('₹', 'Rs.').replace('Rs ', 'Rs. ')
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
  const pdfRef = useRef<HTMLDivElement>(null)

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
        .map(([name, amount]) => `${name} (Rs. ${amount.toLocaleString('en-IN')})`)
        .join(', ')

      const incomeTotals: Record<string, number> = {}
      monthTx.filter(tx => tx.type === 'income').forEach(tx => {
        const cat = getCategoryByName(tx.category)
        const catName = cat?.name || tx.category.trim()
        incomeTotals[catName] = (incomeTotals[catName] || 0) + tx.amount
      })
      const incomeSources = Object.entries(incomeTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => `${name} (Rs. ${amount.toLocaleString('en-IN')})`)
        .join(', ')

      const [year, month] = monthKey.split('-')
      const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })

      const prompt = `Generate a detailed 5-6 sentence personal financial report summary for ${monthName}.
Total income: Rs.${totalIncome}, Total expenses: Rs.${totalExpense}, Net savings: Rs.${savings}, Savings rate: ${savingsRate}%.
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
        const topCategories = categoryBreakdown.slice(0, 5).map(c => `${c.name} (Rs. ${c.amount.toLocaleString('en-IN')})`).join(', ')
        const incomeSources = incomeBreakdown.map(i => `${i.source} (Rs. ${i.amount.toLocaleString('en-IN')})`).join(', ')

        const prompt = `Generate a detailed 5-6 sentence personal financial report summary for ${monthName}.
Total income: Rs.${totalIncome}, Total expenses: Rs.${totalExpense}, Net savings: Rs.${savings}, Savings rate: ${savingsRatePct}%.
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

    // ── Helpers ───────────────────────────────────────────────────────────────

    const addPageHeader = () => {
      pdf.setFontSize(7.5)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(13, 148, 136)
      pdf.text(`FinFlow · ${data.monthName}`, pageWidth - margin, 7, { align: 'right' })
    }

    const addFooter = (pageNum: number) => {
      pdf.setFontSize(7.5)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(160, 160, 160)
      pdf.text(
        `FinFlow Financial Report  ·  Confidential  ·  Generated on ${generatedDate}  ·  Page ${pageNum}`,
        pageWidth / 2,
        pageHeight - 7,
        { align: 'center' }
      )
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

    const sectionHeader = (title: string) => {
      checkPageBreak(16)
      pdf.setFontSize(13)
      pdf.setTextColor(13, 148, 136)
      pdf.setFont('helvetica', 'bold')
      pdf.text(title, margin, yPos)
      yPos += 4
      pdf.setDrawColor(13, 148, 136)
      pdf.setLineWidth(0.4)
      pdf.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 7
      pdf.setFont('helvetica', 'normal')
    }

    // ── Page 1 Header ────────────────────────────────────────────────────────
    // Compact teal header band — no giant "FinFlow" word
    pdf.setFillColor(13, 148, 136)
    pdf.rect(0, 0, pageWidth, 32, 'F')

    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('FinFlow  ·  Financial Report', margin, 11)

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.text(data.monthName, margin, 19)

    pdf.setFontSize(8.5)
    pdf.text(`${data.userName}   ·   Generated: ${generatedDate} IST`, margin, 26)

    pdf.setFontSize(8)
    pdf.setTextColor(200, 245, 230)
    pdf.text('All amounts in Indian Rupees (Rs.)', margin, 31)

    yPos = 40

    // ── Summary Cards ────────────────────────────────────────────────────────
    const colW = contentWidth / 4
    const summaryItems = [
      { label: 'Total Income',  value: pdfCurrency(data.totalIncome),  color: '#059669' },
      { label: 'Total Expense', value: pdfCurrency(data.totalExpense), color: '#dc2626' },
      { label: 'Net Savings',   value: pdfCurrency(data.netSavings),   color: data.netSavings >= 0 ? '#059669' : '#dc2626' },
      { label: 'Savings Rate',  value: `${data.savingsRate.toFixed(1)}%`, color: data.savingsRate >= 20 ? '#059669' : '#d97706' }
    ]

    const cardH = 26
    summaryItems.forEach((item, idx) => {
      const x = margin + idx * colW
      pdf.setFillColor(248, 250, 252)
      pdf.rect(x + 0.5, yPos, colW - 1, cardH, 'F')
      pdf.setFillColor(13, 148, 136)
      pdf.rect(x + 0.5, yPos, colW - 1, 1.8, 'F')

      pdf.setFontSize(7.5)
      pdf.setTextColor(110, 110, 110)
      pdf.setFont('helvetica', 'normal')
      pdf.text(item.label, x + colW / 2, yPos + 9, { align: 'center' })

      const [r, g, b] = hexToRgb(item.color)
      // Auto-shrink value font if text is long
      const valFontSize = item.value.length > 12 ? 9 : 11
      pdf.setFontSize(valFontSize)
      pdf.setTextColor(r, g, b)
      pdf.setFont('helvetica', 'bold')
      pdf.text(item.value, x + colW / 2, yPos + 20, { align: 'center' })
    })
    pdf.setFont('helvetica', 'normal')
    yPos += cardH + 10

    // ── AI Summary ───────────────────────────────────────────────────────────
    if (data.summary) {
      checkPageBreak(40)
      sectionHeader('AI Financial Summary')

      // Use 10pt for the summary text so it wraps cleanly and stays consistent
      pdf.setFontSize(10)
      const summaryLines = pdf.splitTextToSize(data.summary, contentWidth - 10)
      const lineH = 5
      const boxH = summaryLines.length * lineH + 10

      pdf.setFillColor(248, 250, 252)
      pdf.rect(margin, yPos - 3, contentWidth, boxH, 'F')
      pdf.setFillColor(13, 148, 136)
      pdf.rect(margin, yPos - 3, 2, boxH, 'F')

      pdf.setTextColor(55, 55, 55)
      // Draw each line individually to keep spacing consistent
      summaryLines.forEach((line: string, i: number) => {
        pdf.text(line, margin + 5, yPos + 2 + i * lineH)
      })
      yPos += boxH + 10
    }

    // ── Income Breakdown ─────────────────────────────────────────────────────
    if (data.incomeBreakdown.length > 0) {
      checkPageBreak(30)
      sectionHeader('Income Breakdown')

      // Column x positions
      const iCol = { source: margin + 2, amount: margin + 110, pct: margin + 155 }
      const rowH = 7

      // Header row
      pdf.setFillColor(13, 148, 136)
      pdf.rect(margin, yPos - 5, contentWidth, rowH, 'F')
      pdf.setFontSize(8.5)
      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Source', iCol.source, yPos)
      pdf.text('Amount', iCol.amount, yPos)
      pdf.text('% of Total', iCol.pct, yPos)
      pdf.setFont('helvetica', 'normal')
      yPos += rowH

      data.incomeBreakdown.forEach((item) => {
        checkPageBreak(rowH + 2)
        pdf.setFillColor(240, 253, 244)
        pdf.rect(margin, yPos - 5, contentWidth, rowH, 'F')

        pdf.setFontSize(9)
        pdf.setTextColor(50, 50, 50)
        pdf.text(item.source, iCol.source, yPos)
        pdf.setTextColor(5, 150, 105)
        pdf.text(pdfCurrency(item.amount), iCol.amount, yPos)
        pdf.setTextColor(80, 80, 80)
        pdf.text(`${item.percentage.toFixed(1)}%`, iCol.pct, yPos)
        yPos += rowH
      })
      yPos += 8
    }

    // ── Expense Breakdown (bar chart) ────────────────────────────────────────
    if (data.categoryBreakdown.length > 0) {
      checkPageBreak(30)
      sectionHeader('Expense Breakdown by Category')

      // Fixed column layout: dot | name | bar | amount+pct
      const nameColW = 55   // category name area
      const barStart = margin + nameColW + 6
      const barMaxW  = 68
      const labelStart = barStart + barMaxW + 3

      data.categoryBreakdown.forEach((cat) => {
        checkPageBreak(12)
        const [r, g, b] = hexToRgb(cat.color)

        // Dot
        pdf.setFillColor(r, g, b)
        pdf.circle(margin + 2.5, yPos - 1.5, 2, 'F')

        // Category name — truncate if needed
        pdf.setFontSize(9)
        pdf.setTextColor(55, 55, 55)
        const nameDisplay = cat.name.length > 22 ? cat.name.slice(0, 20) + '..' : cat.name
        pdf.text(nameDisplay, margin + 7, yPos)

        // Bar
        const barW = Math.max((cat.percentage / 100) * barMaxW, 0.5)
        pdf.setFillColor(220, 220, 220)
        pdf.rect(barStart, yPos - 4.5, barMaxW, 5, 'F')
        pdf.setFillColor(r, g, b)
        pdf.rect(barStart, yPos - 4.5, barW, 5, 'F')

        // Amount + pct — keep on same line
        pdf.setFontSize(8.5)
        pdf.setTextColor(70, 70, 70)
        pdf.text(`${pdfCurrency(cat.amount)}  (${cat.percentage.toFixed(1)}%)`, labelStart, yPos)

        yPos += 10
      })
      yPos += 5
    }

    // ── Category Details Table ────────────────────────────────────────────────
    if (data.categoryBreakdown.length > 0) {
      checkPageBreak(30)
      sectionHeader('Category Details')

      // Column positions
      const cCol = { name: margin + 2, amount: margin + 95, pct: margin + 145 }
      const rowH = 7

      const renderCatHdr = () => {
        pdf.setFillColor(13, 148, 136)
        pdf.rect(margin, yPos - 5, contentWidth, rowH, 'F')
        pdf.setFontSize(8.5)
        pdf.setTextColor(255, 255, 255)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Category', cCol.name, yPos)
        pdf.text('Amount', cCol.amount, yPos)
        pdf.text('% of Total Expense', cCol.pct, yPos)
        pdf.setFont('helvetica', 'normal')
        yPos += rowH
      }
      renderCatHdr()

      data.categoryBreakdown.forEach((cat, idx) => {
        checkPageBreak(rowH + 2)
        pdf.setFillColor(idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 250 : 255)
        pdf.rect(margin, yPos - 5, contentWidth, rowH, 'F')

        pdf.setFontSize(9)
        pdf.setTextColor(55, 55, 55)
        pdf.text(cat.name, cCol.name, yPos)
        pdf.setTextColor(220, 38, 38)
        pdf.text(pdfCurrency(cat.amount), cCol.amount, yPos)
        pdf.setTextColor(80, 80, 80)
        pdf.text(`${cat.percentage.toFixed(1)}%`, cCol.pct, yPos)
        yPos += rowH
      })
      yPos += 10
    }

    // ── Full Transaction List ────────────────────────────────────────────────
    checkPageBreak(30)
    sectionHeader('Transaction Details')

    // Column positions — carefully spaced to avoid overlap
    // A4 content = 182mm; date=22, desc=52, category=38, type=18, amount=rest
    const tCol = {
      date:     margin + 2,
      desc:     margin + 26,
      category: margin + 90,
      type:     margin + 132,
      amount:   margin + 152,
    }
    const txRowH = 7

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
      // Re-render header on new page (yPos resets to margin+6 after newPage)
      if (yPos < margin + 20 && idx > 0) renderTxHdr()

      const isIncome = tx.type === 'income'
      pdf.setFillColor(isIncome ? 240 : 255, isIncome ? 253 : 255, isIncome ? 244 : 255)
      pdf.rect(margin, yPos - 5, contentWidth, txRowH, 'F')

      const date = normalizeDateToYMD(tx.date)
      const dateStr = date.split('-').reverse().join('/')

      pdf.setFontSize(9)
      pdf.setTextColor(55, 55, 55)
      pdf.text(dateStr, tCol.date, yPos)

      // Description: truncate to fit desc column (≈60mm wide)
      const noteRaw = (tx.note || '-').replace(/\n/g, ' ')
      const noteDisplay = pdf.splitTextToSize(noteRaw, 60)[0]
      pdf.text(noteDisplay, tCol.desc, yPos)

      // Category: truncate to fit (≈36mm wide)
      const catRaw = tx.category || '-'
      const catDisplay = pdf.splitTextToSize(catRaw, 36)[0]
      pdf.text(catDisplay, tCol.category, yPos)

      pdf.text(tx.type, tCol.type, yPos)

      pdf.setTextColor(isIncome ? 5 : 220, isIncome ? 150 : 38, isIncome ? 105 : 38)
      pdf.text(pdfCurrency(tx.amount), tCol.amount, yPos)

      yPos += txRowH
    })

    // ── Final Footer ─────────────────────────────────────────────────────────
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
