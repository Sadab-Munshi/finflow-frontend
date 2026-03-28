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
import { EXPENSE_CATEGORY_COLORS, getTransactionDescription } from '@/lib/pdf-constants'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { Transaction } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { generatePDF } from '@/lib/generatePDF'
import type { PdfReportData } from '@/lib/pdf-html-template'

interface AISummaryStructured {
  sections?: {
    overall: string;
    spending: string;
    income: string;
    recommendations: string[];
  };
  summary?: string;
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
    const categoryBreakdown = Object.entries(categoryTotals).map(([catName, amt]) => ({
      category: catName,
      amount: amt,
      percentage: totalExpense > 0 ? (amt / totalExpense) * 100 : 0,
    })).sort((a, b) => b.amount - a.amount)

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
      percentage: totalIncome > 0 ? (amt / totalIncome) * 100 : 0,
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
          categories: categoryBreakdown.slice(0, 5).map(c => ({ name: c.category, amount: c.amount })),
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
    } catch {
      console.error('Failed to generate summary for PDF')
    } finally {
      setLoadingSummary(null)
    }

    // Fallback: use previously generated legacy summary
    if (!aiSummary && summaries[monthKey]) {
      aiSummary = { summary: summaries[monthKey] }
    }

    setGeneratingPdf(monthKey)

    // Build AI summary in the format expected by PdfReportData
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

    const generatedAt = formatIST(new Date().toISOString())
    const sortedTx = [...monthTx].sort((a, b) =>
      new Date(normalizeDateToYMD(b.date)).getTime() - new Date(normalizeDateToYMD(a.date)).getTime()
    )

    const pdfData: PdfReportData = {
      userName,
      month: monthName,
      generatedAt,
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      aiSummary: pdfAiSummary,
      incomeBreakdown,
      expenseBreakdown: categoryBreakdown,
      transactions: sortedTx.map(tx => ({
        date: normalizeDateToYMD(tx.date).split('-').reverse().join('/'),
        description: getTransactionDescription(tx.note, tx.category),
        category: tx.category || '-',
        type: tx.type,
        amount: tx.amount,
      })),
    }

    try {
      await generatePDF(pdfData)
    } catch (err) {
      console.error('PDF generation failed:', err)
    }
    setGeneratingPdf(null)
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
