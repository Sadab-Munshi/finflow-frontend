'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Loader2, AlertCircle, BarChart2, Lightbulb, AlertTriangle, Trophy, TrendingUp, AlertOctagon, FileText, RefreshCw, Search, PenLine } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { useTranslations } from 'next-intl'
import { useUser } from '@/context/UserContext'
import { getTransactions } from '@/lib/db'
import { cn } from '@/lib/utils'
import { aiInsights } from '@/lib/api-client'
import InsightsSkeleton from '@/components/skeletons/InsightsSkeleton'
import FeatureGate from '@/components/subscription/FeatureGate'
import { Transaction } from '@/lib/types'

// Type for insights
interface Insight {
  type: 'tip' | 'warning' | 'achievement' | 'trend' | 'alert'
  title: string
  description: string
}

// Card presentation per insight type. The cards themselves are white; the
// type is carried only by the 3px left edge, the round icon tile and the
// badge — and those keep exactly the colours the page has always used.
//  `color` – the left rule and the icon/badge ink
// The tile and badge backdrops are that same colour at hex alpha `15` (8%),
// the tint the page already shipped with, so no new hue is introduced.
const insightStyles: Record<string, { color: string; icon: React.ReactNode }> = {
  tip:         { color: '#00b894', icon: <Lightbulb style={{ width: 20, height: 20 }} /> },
  warning:     { color: '#ef4444', icon: <AlertTriangle style={{ width: 20, height: 20 }} /> },
  achievement: { color: '#10b981', icon: <Trophy style={{ width: 20, height: 20 }} /> },
  trend:       { color: '#8b5cf6', icon: <TrendingUp style={{ width: 20, height: 20 }} /> },
  alert:       { color: '#ef4444', icon: <AlertOctagon style={{ width: 20, height: 20 }} /> },
}

export default function InsightsPage() {
  const t = useTranslations('insights')
  const { user } = useUser()
  const userId = user?.userId
  const [mounted, setMounted] = useState(false)
  const [insights, setInsights] = useState<Insight[]>([])
  const [savedTimestamp, setSavedTimestamp] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [insightsHydrating, setInsightsHydrating] = useState(true)
  const [analysisStage, setAnalysisStage] = useState(0)

  const analysisStages = [
    { messageKey: 'stage0' as const, icon: 'FileText' },
    { messageKey: 'stage1' as const, icon: 'Search' },
    { messageKey: 'stage2' as const, icon: 'BarChart2' },
    { messageKey: 'stage3' as const, icon: 'PenLine' },
    { messageKey: 'stage4' as const, icon: 'Sparkles' },
  ]

  useEffect(() => {
    const load = async () => {
      const data = await getTransactions()
      setTransactions(data)
      setLoading(false)
      setMounted(true)
    }
    load()
  }, [])

  // Load saved insights from localStorage once userId is available
  useEffect(() => {
    const key = userId ? 'finflow_insights_' + userId : 'finflow_insights_guest'
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.insights && Array.isArray(parsed.insights)) {
          setInsights(parsed.insights)
          setSavedTimestamp(parsed.timestamp || null)
        }
      }
    } catch (e) {
      console.warn('Failed to load saved insights', e)
    } finally {
      setInsightsHydrating(false)
    }
  }, [user])

  if (loading) return <InsightsSkeleton />
  if (insightsHydrating) return <InsightsSkeleton />
  if (!mounted) return null

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const last30DaysTx = transactions.filter(tx => new Date(tx.date) >= thirtyDaysAgo)

  const handleGenerate = async () => {
    setDataLoading(true)
    setError(null)
    setAnalysisStage(0)

    // Stage progression timer
    const stageTimers = [
      setTimeout(() => setAnalysisStage(1), 2500),
      setTimeout(() => setAnalysisStage(2), 5000),
      setTimeout(() => setAnalysisStage(3), 7000),
      setTimeout(() => setAnalysisStage(4), 9000),
    ]

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const recentTx = transactions
        .filter(tx => new Date(tx.date) >= thirtyDaysAgo)
        .map(tx => ({ amount: tx.amount, type: tx.type, category: tx.category, note: tx.note, date: tx.date }))

      // Enforce minimum 10 second experience
      const [result] = await Promise.all([
        aiInsights(recentTx),
        new Promise(resolve => setTimeout(resolve, 10000))
      ])

      const timestamp = new Date().toLocaleString('en-IN')
      setInsights(result)
      setSavedTimestamp(timestamp)
      const key = userId ? 'finflow_insights_' + userId : 'finflow_insights_guest'
      localStorage.setItem(key, JSON.stringify({ insights: result, timestamp }))
    } catch (err: any) {
      setError(err?.message || t('errorOccurred'))
    } finally {
      stageTimers.forEach(clearTimeout)
      setDataLoading(false)
      setAnalysisStage(0)
    }
  }

  const generateButton = (
    <button
      onClick={handleGenerate}
      disabled={dataLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200',
        dataLoading
          ? 'bg-[#6B7280] text-white cursor-not-allowed px-5 py-2.5'
          : insights.length > 0
            ? 'bg-[#F0FDF9] text-[#0A7B7B] border border-[#0A7B7B]/20 px-5 py-2.5 active:scale-[0.98]'
            : 'bg-[#0A7B7B] text-white px-5 py-2.5 active:scale-[0.98]'
      )}
    >
      {dataLoading ? (
        <><Loader2 className="w-4 h-4 animate-spin" />{t('analysing')}</>
      ) : insights.length > 0 ? (
        <><RefreshCw className="w-4 h-4" />{t('refresh')}</>
      ) : (
        <><Sparkles className="w-4 h-4" />{t('generate')}</>
      )}
    </button>
  )

  return (
    <Layout>
      {/* CSS keyframes */}
      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes progress-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 95%; }
        }
        @keyframes pulse-btn {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,184,148,0.4); }
          50% { box-shadow: 0 0 0 10px rgba(0,184,148,0); }
        }
        @keyframes pulse-icon {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes typing-dots {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60%, 100% { content: '...'; }
        }
      `}</style>

      {/* Capped and centred on large displays: without this the cards ran the
          full 1900px+ and each body line became an unreadably long measure. */}
      <div className="mx-auto w-full max-w-[1280px] space-y-4 pb-6">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0F172A]">{t('title')}</h1>
            <Sparkles className="w-6 h-6 text-[#0A7B7B]" />
          </div>
          <p className="text-sm mt-1 text-[#6B7280]">{t('subtitle')}</p>
          {last30DaysTx.length > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-[#F0FDF9] text-[#0A7B7B] text-xs font-medium px-3 py-1 rounded-full mt-2">
              <FileText className="w-3.5 h-3.5" />
              {t('txAnalysed', { count: last30DaysTx.length })}
            </span>
          )}
        </div>

        {/* Feature Gate around AI Summaries */}
        <FeatureGate feature="ai_summaries" title="AI Summaries & Insights">
        {/* Loading State - Staged AI analysis */}
        {dataLoading ? (
          <div className="space-y-5">
            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#0A7B7B]/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0A7B7B] to-[#10B981] transition-all duration-1000"
                style={{
                  width: `${[10, 30, 55, 75, 92][analysisStage]}%`,
                }}
              />
            </div>

            {/* Stage message with icon */}
            <div className="flex flex-col items-center gap-3 py-2">
              {/* Pulsing icon circle */}
              <div
                className="w-14 h-14 rounded-full bg-[#F0FDF9] flex items-center justify-center"
                style={{ animation: 'pulse-icon 1.5s ease-in-out infinite' }}
              >
                {analysisStage === 0 && <FileText className="w-6 h-6 text-[#0A7B7B]" />}
                {analysisStage === 1 && <Search className="w-6 h-6 text-[#0A7B7B]" />}
                {analysisStage === 2 && <BarChart2 className="w-6 h-6 text-[#0A7B7B]" />}
                {analysisStage === 3 && <PenLine className="w-6 h-6 text-[#0A7B7B]" />}
                {analysisStage === 4 && <Sparkles className="w-6 h-6 text-[#0A7B7B]" />}
              </div>

              {/* Stage message — fades between stages */}
              <p
                key={analysisStage}
                className="text-sm font-medium text-[#0F172A] text-center"
                style={{ animation: 'slideUp 0.4s ease forwards' }}
              >
                {t(analysisStages[analysisStage].messageKey)}
              </p>

              {/* Stage dots indicator */}
              <div className="flex items-center gap-1.5">
                {analysisStages.map((_, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-500"
                    style={{
                      width: i === analysisStage ? 20 : 6,
                      height: 6,
                      backgroundColor: i <= analysisStage ? '#0A7B7B' : '#E2E8F0',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Skeleton cards */}
            <div className="grid gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[#E7EDEC] bg-white p-3.5 sm:p-4 md:p-[18px]"
                  style={{
                    borderLeft: '3px solid #E2E8F0',
                    boxShadow: '0 1px 2px rgba(15,118,110,0.04), 0 4px 12px -6px rgba(15,118,110,0.10)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 animate-pulse" />
                      <div className="mt-1.5 h-4 rounded-md bg-slate-100 animate-pulse" style={{ width: `${110 + i * 25}px` }} />
                    </div>
                    <div className="h-5 w-16 shrink-0 rounded-full bg-slate-100 animate-pulse" />
                  </div>
                  <div className="mt-2 space-y-2 md:mt-2.5">
                    <div className="h-3 rounded-md bg-slate-100 animate-pulse" style={{ width: '92%' }} />
                    <div className="h-3 rounded-md bg-slate-100 animate-pulse" style={{ width: '78%' }} />
                    <div className="h-3 rounded-md bg-slate-100 animate-pulse" style={{ width: '55%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Refresh button row — only when insights exist */}
            {insights.length > 0 && (
              <div className="flex items-center justify-between gap-3">
                {savedTimestamp && (
                  <p className="text-xs text-[#9CA3AF]">Last generated: {savedTimestamp}</p>
                )}
                {generateButton}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Empty state */}
            {insights.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center">
                <div className="w-20 h-20 rounded-full bg-[#F0FDF9] flex items-center justify-center mx-auto">
                  <BarChart2 className="w-10 h-10 text-[#0A7B7B]" />
                </div>
                <h3 className="text-lg font-semibold text-[#0F172A] mt-4">{t('noInsightsTitle')}</h3>
                <p className="text-sm text-[#475569] mt-1 max-w-xs mx-auto leading-relaxed">
                  {t('noInsightsBody')}
                </p>
                <div className="mt-6">
                  {generateButton}
                </div>
              </div>
            ) : (
              <>
              {/* Insight cards */}
              <div className="grid gap-3 md:grid-cols-2 xl:gap-4">
                {insights.map((insight, i) => {
                  const style = insightStyles[insight.type] || insightStyles.tip
                  return (
                    <div
                      key={i}
                      className="rounded-2xl border border-[#E7EDEC] bg-white p-3.5 sm:p-4 md:p-[18px] xl:p-6"
                      style={{
                        borderLeft: `3px solid ${style.color}`,
                        boxShadow:
                          '0 1px 2px rgba(15,118,110,0.04), 0 4px 12px -6px rgba(15,118,110,0.10)',
                        animation: `slideUp 0.4s ease forwards`,
                        animationDelay: `${i * 150}ms`,
                        opacity: 0,
                      }}
                    >
                      {/* Top row — icon, title, badge. The title column is the
                          only flexible one, so a long title wraps inside it and
                          can never push into the badge. */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <div
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                            style={{ backgroundColor: `${style.color}15`, color: style.color }}
                          >
                            {style.icon}
                          </div>
                          <p className="min-w-0 flex-1 pt-0.5 text-[15px] font-semibold leading-snug text-[#0F172A] md:text-[17px] md:leading-6 xl:text-[18px] xl:leading-7">
                            {insight.title}
                          </p>
                        </div>
                        <span
                          className="mt-1 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize md:text-[12px]"
                          style={{
                            backgroundColor: `${style.color}15`,
                            color: style.color,
                          }}
                        >
                          {insight.type}
                        </span>
                      </div>
                      {/* Description — full card width at every size. The old
                          pl-10 indent pushed the text into a narrow column and
                          cost several extra lines on phones and landscape. */}
                      <p className="mt-2 text-[13px] leading-relaxed text-[#475569] md:mt-2.5 md:text-[15px] md:leading-6 xl:mt-3 xl:text-base xl:leading-[26px]">
                        {insight.description}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* AI disclaimer */}
              <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#9CA3AF] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  These insights are generated from your recorded transactions and are not financial advice.{' '}
                  <a
                    href="/disclaimer"
                    className="text-[#0A7B7B] font-medium underline-offset-2 hover:underline"
                  >
                    Learn More
                  </a>
                </p>
              </div>
              </>
            )}
          </>
        )}
        </FeatureGate>
      </div>
    </Layout>
  )
}
