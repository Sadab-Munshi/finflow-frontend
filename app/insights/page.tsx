'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Loader2, AlertCircle, BarChart2, Lightbulb, AlertTriangle, Trophy, TrendingUp, AlertOctagon, FileText, RefreshCw } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { useUser } from '@/context/UserContext'
import { getTransactions } from '@/lib/db'
import { cn } from '@/lib/utils'
import { aiInsights } from '@/lib/api-client'
import InsightsSkeleton from '@/components/skeletons/InsightsSkeleton'
import { Transaction } from '@/lib/types'

// Type for insights
interface Insight {
  type: 'tip' | 'warning' | 'achievement' | 'trend' | 'alert'
  title: string
  description: string
}

// Card type styles with left border colors, card bg, and icon color
const insightStyles: Record<string, { bgColor: string; borderColor: string; iconColor: string; icon: React.ReactNode }> = {
  tip:         { bgColor: '#f0fdf9', borderColor: '#00b894', iconColor: '#00b894', icon: <Lightbulb style={{ width: 20, height: 20 }} /> },
  warning:     { bgColor: '#fff5f5', borderColor: '#ef4444', iconColor: '#ef4444', icon: <AlertTriangle style={{ width: 20, height: 20 }} /> },
  achievement: { bgColor: '#f0fdf4', borderColor: '#10b981', iconColor: '#10b981', icon: <Trophy style={{ width: 20, height: 20 }} /> },
  trend:       { bgColor: '#faf5ff', borderColor: '#8b5cf6', iconColor: '#8b5cf6', icon: <TrendingUp style={{ width: 20, height: 20 }} /> },
  alert:       { bgColor: '#fff5f5', borderColor: '#ef4444', iconColor: '#ef4444', icon: <AlertOctagon style={{ width: 20, height: 20 }} /> },
}

export default function InsightsPage() {
  const { t } = useLanguage()
  const { user } = useUser()
  const userId = user?.userId
  const [mounted, setMounted] = useState(false)
  const [insights, setInsights] = useState<Insight[]>([])
  const [savedTimestamp, setSavedTimestamp] = useState<string | null>(null)
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
      console.warn('Failed to load saved insights from localStorage', e)
    }
  }, [user])

  if (loading) return <InsightsSkeleton />
  if (!mounted) return null

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const last30DaysTx = transactions.filter(tx => new Date(tx.date) >= thirtyDaysAgo)

  const handleGenerate = async () => {
    setDataLoading(true); setError(null)
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const recentTx = transactions.filter(tx => new Date(tx.date) >= thirtyDaysAgo).map(tx => ({ amount: tx.amount, type: tx.type, category: tx.category, note: tx.note, date: tx.date }))
      const result = await aiInsights(recentTx)
      const timestamp = new Date().toLocaleString('en-IN')
      setInsights(result)
      setSavedTimestamp(timestamp)
      const key = userId ? 'finflow_insights_' + userId : 'finflow_insights_guest'
      localStorage.setItem(key, JSON.stringify({ insights: result, timestamp }))
    } catch (err: any) { 
      setError(err?.message || t('errorOccurred')) 
    } finally { setDataLoading(false) }
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
        <><Loader2 className="w-4 h-4 animate-spin" />Analysing...</>
      ) : insights.length > 0 ? (
        <><RefreshCw className="w-4 h-4" />Refresh</>
      ) : (
        <><Sparkles className="w-4 h-4" />Generate Insights</>
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

      <div className="space-y-4 pb-6">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0F172A]">Insights</h1>
            <Sparkles className="w-6 h-6 text-[#0A7B7B]" />
          </div>
          <p className="text-sm mt-1 text-[#6B7280]">AI-powered analysis of your last 30 days</p>
          {last30DaysTx.length > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-[#F0FDF9] text-[#0A7B7B] text-xs font-medium px-3 py-1 rounded-full mt-2">
              <FileText className="w-3.5 h-3.5" />
              {last30DaysTx.length} transactions analysed
            </span>
          )}
        </div>

        {/* Loading State - Full page skeleton */}
        {dataLoading ? (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="w-full h-1 rounded-full overflow-hidden bg-[#0A7B7B]/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0A7B7B] to-[#10B981]"
                style={{ animation: 'progress-bar 4s ease-in-out infinite' }}
              />
            </div>

            {/* Status text */}
            <p className="text-center text-sm font-medium text-[#475569]">
              AI is analysing your finances
              <span className="animate-pulse"> ...</span>
            </p>

            {/* Skeleton cards — match new card design */}
            <div className="grid gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm"
                  style={{ borderLeft: '3px solid #E2E8F0' }}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
                      <div
                        className="h-4 rounded-md bg-slate-100 animate-pulse"
                        style={{ width: `${120 + i * 20}px`, animationDelay: `${i * 0.1}s` }}
                      />
                    </div>
                    <div
                      className="h-5 w-14 rounded-full bg-slate-100 animate-pulse"
                      style={{ animationDelay: `${i * 0.1 + 0.05}s` }}
                    />
                  </div>
                  {/* Description lines */}
                  <div className="pl-10 space-y-2">
                    <div
                      className="h-3 rounded-md bg-slate-100 animate-pulse"
                      style={{ width: '95%', animationDelay: `${i * 0.1 + 0.1}s` }}
                    />
                    <div
                      className="h-3 rounded-md bg-slate-100 animate-pulse"
                      style={{ width: '80%', animationDelay: `${i * 0.1 + 0.15}s` }}
                    />
                    <div
                      className="h-3 rounded-md bg-slate-100 animate-pulse"
                      style={{ width: '60%', animationDelay: `${i * 0.1 + 0.2}s` }}
                    />
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
                <h3 className="text-lg font-semibold text-[#0F172A] mt-4">No insights yet</h3>
                <p className="text-sm text-[#475569] mt-1 max-w-xs mx-auto leading-relaxed">
                  Generate AI insights to understand your spending patterns
                </p>
                <div className="mt-6">
                  {generateButton}
                </div>
              </div>
            ) : (
              <>
              {/* Insight cards */}
              <div className="grid gap-3 md:grid-cols-2">
                {insights.map((insight, i) => {
                  const style = insightStyles[insight.type] || insightStyles.tip
                  return (
                    <div
                      key={i}
                      className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm"
                      style={{
                        borderLeft: `3px solid ${style.borderColor}`,
                        animation: `slideUp 0.4s ease forwards`,
                        animationDelay: `${i * 150}ms`,
                        opacity: 0,
                      }}
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: style.borderColor + '15', color: style.iconColor }}
                          >
                            {style.icon}
                          </div>
                          <p className="font-semibold text-[#0F172A] text-sm leading-snug">{insight.title}</p>
                        </div>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 capitalize"
                          style={{ backgroundColor: style.borderColor + '15', color: style.iconColor }}
                        >
                          {insight.type}
                        </span>
                      </div>
                      {/* Description */}
                      <p className="text-xs text-[#475569] leading-relaxed pl-10">{insight.description}</p>
                    </div>
                  )
                })}
              </div>

              {/* AI disclaimer */}
              <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#9CA3AF] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  AI-generated insights may not always be accurate. Always verify with a financial advisor before making major decisions.{' '}
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
      </div>
    </Layout>
  )
}
