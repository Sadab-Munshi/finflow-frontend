'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Loader2, AlertCircle, BarChart2, Lightbulb, AlertTriangle, Trophy, TrendingUp, AlertOctagon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { getTransactions } from '@/lib/db'
import { cn } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { Transaction } from '@/lib/types'

// Type for insights
interface Insight {
  type: 'tip' | 'warning' | 'achievement' | 'trend' | 'alert'
  title: string
  description: string
}

// Card type styles with left border colors and icon bg
const insightStyles: Record<string, { borderColor: string; iconBg: string; iconColor: string; icon: React.ReactNode }> = {
  tip:         { borderColor: 'rgba(0,184,148,0.7)',   iconBg: 'rgba(0,184,148,0.07)',   iconColor: '#00b894', icon: <Lightbulb style={{ width: 18, height: 18 }} /> },
  warning:     { borderColor: 'rgba(245,158,11,0.7)',  iconBg: 'rgba(245,158,11,0.07)',  iconColor: '#f59e0b', icon: <AlertTriangle style={{ width: 18, height: 18 }} /> },
  achievement: { borderColor: 'rgba(16,185,129,0.7)',  iconBg: 'rgba(16,185,129,0.07)',  iconColor: '#10b981', icon: <Trophy style={{ width: 18, height: 18 }} /> },
  trend:       { borderColor: 'rgba(139,92,246,0.7)',  iconBg: 'rgba(139,92,246,0.07)',  iconColor: '#8b5cf6', icon: <TrendingUp style={{ width: 18, height: 18 }} /> },
  alert:       { borderColor: 'rgba(239,68,68,0.7)',   iconBg: 'rgba(239,68,68,0.07)',   iconColor: '#ef4444', icon: <AlertOctagon style={{ width: 18, height: 18 }} /> },
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

  const generateButton = (
    <button
      onClick={handleGenerate}
      disabled={dataLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl text-white',
        'w-full transition-all duration-200',
        dataLoading ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'
      )}
      style={{
        background: dataLoading ? '#6b7280' : '#00b894',
        height: 48,
        fontSize: 15,
        fontWeight: 600,
        boxShadow: dataLoading ? 'none' : '0 4px 12px rgba(0,184,148,0.25)',
      }}
    >
      {dataLoading ? (
        <><Loader2 className="w-5 h-5 animate-spin" />{t('analyzingFinances')}</>
      ) : (
        <><Sparkles className="w-5 h-5" />{t('generateInsights')}</>
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

      <div className="space-y-3 px-4">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold" style={{ color: '#0d1117' }}>{t('insights')}</h1>
            <Sparkles className="w-6 h-6" style={{ color: '#00b894' }} />
          </div>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>AI-powered financial analysis</p>
        </div>

        {/* Loading State - Full page skeleton */}
        {dataLoading ? (
          <div className="space-y-4">
            {/* Teal progress bar */}
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,184,148,0.15)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #00b894, #00d2a8)',
                  animation: 'progress-bar 4s ease-in-out infinite',
                }}
              />
            </div>

            {/* Typing text */}
            <p className="text-center text-sm font-medium" style={{ color: '#6b7280' }}>
              AI is reading your finances
              <span className="inline-block w-6 text-left">
                <span className="animate-pulse">...</span>
              </span>
            </p>

            {/* Shimmer skeleton cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border p-6"
                  style={{
                    borderLeft: '4px solid #e5e7eb',
                    borderColor: '#f3f4f6',
                    background: '#fff',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex-shrink-0"
                      style={{
                        background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s ease-in-out infinite',
                      }}
                    />
                    <div className="flex-1 space-y-3">
                      <div
                        className="h-4 rounded-md"
                        style={{
                          width: '60%',
                          background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 1.5s ease-in-out infinite',
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                      <div
                        className="h-3 rounded-md"
                        style={{
                          width: '90%',
                          background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 1.5s ease-in-out infinite',
                          animationDelay: `${i * 0.15 + 0.1}s`,
                        }}
                      />
                      <div
                        className="h-3 rounded-md"
                        style={{
                          width: '75%',
                          background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 1.5s ease-in-out infinite',
                          animationDelay: `${i * 0.15 + 0.2}s`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Generate button (shown when not loading) */}
            {!dataLoading && (
              <div>
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
              <div
                className="rounded-xl border p-10 text-center"
                style={{ borderColor: '#f3f4f6', background: '#fff' }}
              >
                <div className="flex justify-center mb-4">
                  <BarChart2
                    style={{ width: 48, height: 48, color: '#00b894' }}
                  />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#0d1117' }}>
                  Your financial story awaits
                </h3>
                <p className="text-sm max-w-md mx-auto" style={{ color: '#6b7280', lineHeight: 1.6 }}>
                  Tap Generate Insights to get AI-powered analysis of your spending
                </p>
              </div>
            ) : (
              /* Insight cards */
              <div className="grid md:grid-cols-2" style={{ gap: 10 }}>
                {insights.map((insight, i) => {
                  const style = insightStyles[insight.type] || insightStyles.tip
                  return (
                    <div
                      key={i}
                      className="rounded-xl"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #f3f4f6',
                        borderLeft: `3px solid ${style.borderColor}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        opacity: 0,
                        animation: `slideUp 0.4s ease forwards`,
                        animationDelay: `${i * 150}ms`,
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                      }}
                    >
                      <div style={{ padding: '14px 16px' }}>
                        <div className="flex items-start gap-3">
                          <div
                            className="rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ width: 36, height: 36, backgroundColor: style.iconBg, color: style.iconColor }}
                          >
                            {style.icon}
                          </div>
                          <div>
                            <p className="font-bold" style={{ fontSize: 15, color: '#0d1117', marginBottom: 4 }}>
                              {insight.title}
                            </p>
                            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.55 }}>
                              {insight.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
