'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Loader2, AlertCircle, BarChart3, Lightbulb, AlertTriangle, Trophy, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { getTransactions } from '@/lib/db'
import { cn } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { Transaction } from '@/lib/types'

// Type for insights
interface Insight {
  type: 'tip' | 'warning' | 'achievement' | 'trend'
  title: string
  description: string
}

export default function InsightsPage() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [insights, setInsights] = useState<Insight[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const data = await getTransactions()
      setTransactions(data)
      setLoading(false)
      setMounted(true)
    }
    load()
  }, [])

  if (loading) return <LoadingScreen />
  if (!mounted) return null

  const handleGenerate = async () => {
    setDataLoading(true); setError(null)
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const recentTx = transactions.filter(tx => new Date(tx.date) >= thirtyDaysAgo).map(tx => ({ amount: tx.amount, type: tx.type, category: tx.category, note: tx.note, date: tx.date }))
      const res = await fetch('/api/ai/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactions: recentTx }) })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Insights generation failed (${res.status})`)
      }
      const result = await res.json()
      setInsights(result)
    } catch (err: any) { 
      setError(err?.message || t('errorOccurred')) 
    } finally { setDataLoading(false) }
  }

  const insightStyles: Record<string, { bg: string; icon: React.ReactNode; iconColor: string }> = {
    tip: { bg: 'bg-cyan-50', icon: <Lightbulb className="w-5 h-5" />, iconColor: 'text-cyan-600' },
    warning: { bg: 'bg-red-50', icon: <AlertTriangle className="w-5 h-5" />, iconColor: 'text-red-500' },
    achievement: { bg: 'bg-emerald-50', icon: <Trophy className="w-5 h-5" />, iconColor: 'text-emerald-600' },
    trend: { bg: 'bg-purple-50', icon: <TrendingUp className="w-5 h-5" />, iconColor: 'text-purple-600' },
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('insights')}</h1>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Button onClick={handleGenerate} disabled={dataLoading} className="bg-emerald-600 hover:bg-emerald-700">
            {dataLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('analyzingFinances')}</> : <><Sparkles className="w-4 h-4 mr-2" />{t('generateInsights')}</>}
          </Button>
        </div>

        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2"><AlertCircle className="w-5 h-5" />{error}</div>}

        {insights.length === 0 ? (
          <Card className="border-gray-100"><CardContent className="p-8 text-center text-gray-500"><BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-200" /><p>{t('noInsightsYet')}</p><p className="text-sm">{t('clickGenerate')}</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {insights.map((insight, i) => {
              const style = insightStyles[insight.type] || insightStyles.tip
              return (
                <Card key={i} className={cn("border-0", style.bg)}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <div className={style.iconColor}>{style.icon}</div>
                      <div><p className="font-semibold text-gray-800">{insight.title}</p><p className="text-sm text-gray-600 mt-1">{insight.description}</p></div>
                    </div>
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
