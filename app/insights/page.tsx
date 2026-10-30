'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles, Loader2, AlertCircle, BarChart2, RefreshCw,
  AlertTriangle, TrendingUp, TrendingDown, ChevronDown, ArrowRight,
  Info, FileText, ShieldAlert,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { useTranslations } from 'next-intl'
import { useUser } from '@/context/UserContext'
import { getTransactions, getBudgets } from '@/lib/db'
import { aiInsights } from '@/lib/api-client'
import InsightsSkeleton from '@/components/skeletons/InsightsSkeleton'
import FeatureGate from '@/components/subscription/FeatureGate'
import type { Budget, Transaction } from '@/lib/types'
import {
  buildSnapshot, deriveFindings, isSufficient, validateAiFindings, sortFindings,
  formatRange, KIND_LABEL, MIN_TRANSACTIONS,
  type Finding, type FindingKind,
} from '@/lib/insights-model'

const KIND_STYLE: Record<FindingKind, {
  icon: typeof AlertTriangle
  fg: string; tint: string; line: string; dot: string
}> = {
  // Restrained accents: red only for something the user's own limit proves,
  // amber for a soft signal, teal for a positive state, purple for patterns.
  attention:   { icon: AlertTriangle, fg: '#9F1239', tint: '#FFF1F2', line: '#FECDD3', dot: '#E11D48' },
  opportunity: { icon: TrendingUp,    fg: '#92400E', tint: '#FFFBEB', line: '#FDE68A', dot: '#D97706' },
  positive:    { icon: TrendingDown,  fg: '#0F766E', tint: '#F0FDFA', line: '#99F6E4', dot: '#0D9488' },
  pattern:     { icon: BarChart2,     fg: '#5B21B6', tint: '#F5F3FF', line: '#DDD6FE', dot: '#7C3AED' },
}

export default function InsightsPage() {
  const t = useTranslations('insights')
  const { user } = useUser()
  const userId = user?.userId

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // AI output is kept separately from the deterministic findings: the former is
  // advisory, the latter is arithmetic and cannot be wrong.
  const [aiAccepted, setAiAccepted] = useState<Finding[]>([])
  const [aiWithheld, setAiWithheld] = useState<{ title: string; reason: string }[]>([])
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [announcement, setAnnouncement] = useState('')

  // One request at a time, and it survives re-renders so a double tap cannot
  // start two analyses.
  const inFlight = useRef(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [txs, buds] = await Promise.all([getTransactions(), getBudgets()])
      if (cancelled) return
      setTransactions(txs)
      setBudgets(buds)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Restore the last AI result so returning to the page does not look empty.
  useEffect(() => {
    const key = userId ? 'finflow_insights_' + userId : 'finflow_insights_guest'
    try {
      const saved = localStorage.getItem(key)
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed?.insights)) {
        if (parsed.timestamp) setLastRefreshed(new Date(parsed.timestamp))
      }
    } catch { /* corrupt cache is not worth surfacing */ }
  }, [userId])

  const snapshot = useMemo(() => buildSnapshot(transactions, 30), [transactions])
  const deterministic = useMemo(
    () => deriveFindings(transactions, snapshot, budgets),
    [transactions, snapshot, budgets]
  )

  const handleRefresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setRefreshing(true)
    setError(null)

    try {
      const payload = transactions
        .filter((tx) => new Date(tx.date) >= new Date(Date.now() - 30 * 86400000))
        .map((tx) => ({
          amount: tx.amount, type: tx.type, category: tx.category, note: tx.note, date: tx.date,
        }))

      const raw = await aiInsights(payload)
      const { accepted, withheld } = validateAiFindings(
        Array.isArray(raw) ? raw : [],
        snapshot
      )
      setAiAccepted(accepted)
      setAiWithheld(withheld)
      setLastRefreshed(new Date())
      setAnnouncement(
        `Insights refreshed. ${deterministic.length + accepted.length} findings shown` +
        (withheld.length ? `, ${withheld.length} withheld.` : '.')
      )

      const key = userId ? 'finflow_insights_' + userId : 'finflow_insights_guest'
      try {
        localStorage.setItem(key, JSON.stringify({ insights: raw, timestamp: new Date().toISOString() }))
      } catch { /* storage full or blocked: the page still works */ }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errorOccurred')
      setError(message)
      setAnnouncement(`Refresh failed. ${message}`)
    } finally {
      inFlight.current = false
      setRefreshing(false)
    }
  }, [transactions, snapshot, deterministic.length, userId, t])

  const findings = useMemo(
    () => sortFindings([...deterministic, ...aiAccepted]),
    [deterministic, aiAccepted]
  )

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) return <Layout hideFab><InsightsSkeleton /></Layout>

  const sufficient = isSufficient(snapshot)
  const hasAny = findings.length > 0
  const counts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.kind] = (acc[f.kind] ?? 0) + 1
    return acc
  }, {})

  return (
    <Layout hideFab>
      <div className="mx-auto w-full max-w-[1180px] pb-4">
        {/* ── Compact header ─────────────────────────────────────────── */}
        <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold tracking-tight text-[#0F172A] sm:text-2xl">
              {t('title')}
            </h1>
            {/* Every value here comes from the one snapshot. */}
            <p className="mt-0.5 text-xs leading-5 text-[#475569] sm:text-sm">
              <span className="font-medium text-[#334155]">{formatRange(snapshot)}</span>
              <span aria-hidden="true"> · </span>
              {t('txCountMeta', { count: snapshot.txCount })}
              {lastRefreshed && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span>{t('updatedAt')} {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex shrink-0 items-center">
            <button
              onClick={handleRefresh}
              disabled={refreshing || !sufficient}
              aria-label={t('refresh')}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 bg-[#0F766E] text-white hover:bg-[#115E59]"
            >
              {refreshing ? (
                <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{t('analysing')}</>
              ) : (
                <><RefreshCw className="h-4 w-4" aria-hidden="true" />{t('refresh')}</>
              )}
            </button>
          </div>
        </div>

        <p aria-live="polite" role="status" className="sr-only">{announcement}</p>

        <FeatureGate feature="ai_summaries" title="AI Summaries & Insights">
          {/* Error */}
          {error && (
            <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-[#FECDD3] bg-[#FFF1F2] p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#9F1239]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#9F1239]">{t('errorTitle')}</p>
                <p className="mt-0.5 text-xs leading-5 text-[#831843]">{error}</p>
              </div>
            </div>
          )}

          {/* Insufficient data — distinct from "no insights yet" */}
          {!sufficient ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-8 text-center sm:p-10">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F0FDFA]">
                <FileText className="h-6 w-6 text-[#0F766E]" aria-hidden="true" />
              </div>
              <h2 className="mt-3 text-base font-semibold text-[#0F172A]">{t('insufficientTitle')}</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-5 text-[#475569]">
                {t('insufficientBody', { count: snapshot.txCount, min: MIN_TRANSACTIONS })}
              </p>
              <Link
                href="/add?tab=manual"
                className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#0F766E] px-4 text-sm font-semibold text-white hover:bg-[#115E59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
              >
                Add a transaction
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : !hasAny ? (
            /* Empty — enough data, but nothing generated and nothing to assert */
            <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-8 text-center sm:p-10">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F0FDFA]">
                <Sparkles className="h-6 w-6 text-[#0F766E]" aria-hidden="true" />
              </div>
              <h2 className="mt-3 text-base font-semibold text-[#0F172A]">{t('noInsightsTitle')}</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-5 text-[#475569]">{t('noInsightsBody')}</p>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#0F766E] px-4 text-sm font-semibold text-white hover:bg-[#115E59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                {t('generate')}
              </button>
            </div>
          ) : (
            <>
              {/* Kind summary — the ordering rule, stated */}
              <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#475569]">
                {(Object.keys(counts) as FindingKind[])
                  .sort((a, b) => ['attention','opportunity','positive','pattern'].indexOf(a) - ['attention','opportunity','positive','pattern'].indexOf(b))
                  .map((k) => (
                    <span key={k} className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: KIND_STYLE[k].dot }} aria-hidden="true" />
                      {counts[k]} {KIND_LABEL[k].toLowerCase()}
                    </span>
                  ))}
              </div>

              {/* 1 column on phones, 2 from md. Refreshing keeps cards in place. */}
              <div
                className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3"
                aria-busy={refreshing}
              >
                {findings.map((f, index) => {
                  const s = KIND_STYLE[f.kind]
                  const Icon = s.icon
                  const isOpen = expanded.has(f.id)
                  // An odd number of findings leaves the last grid cell empty on
                  // desktop. Rather than a hole, that card takes the full row and
                  // caps its prose measure so it does not stretch into a ribbon.
                  const fillsRow = findings.length % 2 === 1 && index === findings.length - 1
                  return (
                    <article
                      key={f.id}
                      className={`flex h-full flex-col rounded-xl border border-[#E2E8F0] bg-white p-3.5 sm:p-4 xl:p-5${
                        fillsRow ? ' md:col-span-2' : ''
                      }`}
                      style={{ borderLeft: `3px solid ${s.dot}` }}
                    >
                      {/* 1 · label + icon (and basis, which never hides) */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                          style={{ background: s.tint, color: s.fg }}
                        >
                          <Icon className="h-3 w-3" aria-hidden="true" />
                          {KIND_LABEL[f.kind]}
                        </span>
                        <span className="text-[11px] font-medium text-[#64748B]">
                          {f.basis === 'observed' ? t('basisObserved') : t('basisEstimate')}
                        </span>
                        {f.correctedFrom && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#92400E]">
                            <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                            {t('reworded')}
                          </span>
                        )}
                      </div>

                      {/* 2 · headline */}
                      <h2 className="mt-1.5 text-[15px] font-semibold leading-5 text-[#0F172A] xl:text-base xl:leading-6">
                        {f.headline}
                      </h2>

                      {/* 3 · the number */}
                      <p className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold tabular-nums tracking-tight text-[#0F172A] xl:text-[28px]">
                          {f.metric.value}
                        </span>
                        <span className="text-xs font-medium text-[#64748B]">{f.metric.label}</span>
                      </p>

                      {/* 4 · body, full width on phones — no indent under the icon */}
                      <p
                        className={`mt-1 text-sm leading-5 text-[#475569]${
                          fillsRow ? ' md:max-w-[72ch]' : ''
                        }`}
                      >
                        {f.body}
                      </p>

                      {/* 5 · action + 6 · details, wrapping rather than colliding */}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-2">
                        {f.action ? (
                          <Link
                            href={f.action.href}
                            className="-my-2 inline-flex min-h-[44px] items-center gap-0.5 rounded-md px-1 text-xs font-semibold text-[#0F766E] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                          >
                            {f.action.label}
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        ) : <span />}

                        {f.evidence.length > 0 && (
                          <button
                            onClick={() => toggle(f.id)}
                            aria-expanded={isOpen}
                            aria-controls={`ev-${f.id}`}
                            className="-my-2 inline-flex min-h-[44px] items-center gap-1 rounded-md px-1 text-xs font-semibold text-[#475569] hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                          >
                            {isOpen ? t('hideDetails') : t('showDetails')}
                            <ChevronDown
                              className="h-3.5 w-3.5 transition-transform"
                              style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
                              aria-hidden="true"
                            />
                          </button>
                        )}
                      </div>

                      {isOpen && f.evidence.length > 0 && (
                        // Label never breaks mid-word; a long value drops to its
                        // own right-aligned line on narrow phones.
                        <dl id={`ev-${f.id}`} className="mt-2 space-y-1 border-t border-[#E2E8F0] pt-2">
                          {f.evidence.map((e) => (
                            <div key={e.label} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                              <dt className="whitespace-nowrap text-xs text-[#64748B]">{e.label}</dt>
                              <dd className="ml-auto text-right text-xs font-medium tabular-nums text-[#0F172A]">{e.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </article>
                  )
                })}
              </div>

              {/* Withheld AI claims — stated, not silently dropped */}
              {aiWithheld.length > 0 && (
                <div className="mt-2.5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-[#92400E]">
                    <Info className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('withheldTitle', { count: aiWithheld.length })}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {aiWithheld.map((w, i) => (
                      <li key={i} className="text-xs leading-5 text-[#78350F]">
                        <span className="font-medium">{w.title}</span> — {w.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* ── Footer ─────────────────────────────────────────────── */}
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#64748B]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs leading-5 text-[#475569]">{t('footerNote')}</p>
              {/* Its own 44px target rather than a 14px inline link inside the
                  sentence — same words, but reachable with a thumb. */}
              <Link
                href="/disclaimer"
                className="-mb-2 mt-0.5 inline-flex min-h-[44px] items-center gap-0.5 rounded-md text-xs font-semibold text-[#0F766E] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
              >
                {t('learnMore')}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </FeatureGate>
      </div>
    </Layout>
  )
}
