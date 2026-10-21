'use client'

import React, { useEffect, useState } from 'react'
import {
  Mic,
  ScanLine,
  CheckCircle2,
  TrendingUp,
  FileText,
  ShieldCheck,
  Wallet,
  Sparkles,
  Bot,
  PieChart,
  Bell,
} from 'lucide-react'

const LOOP_ITEMS = [
  {
    id: 'hi-voice',
    mode: 'Voice · हिंदी',
    input: '“सब्ज़ी और किराना ₹480”',
    merchant: 'Fresh Mart & Mandi',
    category: 'Groceries',
    amount: '₹480',
    budgetPct: 64,
    accent: 'from-teal-500 to-emerald-500',
  },
  {
    id: 'ocr-scan',
    mode: 'Camera · Receipt Scan',
    input: 'DMart Supermarts · 14 items',
    merchant: 'DMart Avenue Ltd.',
    category: 'Household',
    amount: '₹1,450',
    budgetPct: 72,
    accent: 'from-sky-500 to-teal-500',
  },
  {
    id: 'bn-voice',
    mode: 'Voice · বাংলা',
    input: '“সকালের বাজার আর অটো ₹৪৫০”',
    merchant: 'Bazaar & Commute',
    category: 'Daily Living',
    amount: '₹450',
    budgetPct: 68,
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'en-voice',
    mode: 'Voice · English',
    input: '“Spent ₹340 at Blue Tokai”',
    merchant: 'Blue Tokai Coffee',
    category: 'Food & Dining',
    amount: '₹340',
    budgetPct: 58,
    accent: 'from-teal-600 to-cyan-600',
  },
]

/**
 * 1. HERO ANIMATED CODE LOOP VISUALISATION
 * Replaces static hero image with a continuous, self-running FinFlow AI telemetry loop.
 */
export function HeroLedgerLoop() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % LOOP_ITEMS.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  const active = LOOP_ITEMS[step]

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <style>{`
        @keyframes pulseBar {
          0%, 100% { transform: scaleY(0.35); opacity: 0.55; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>

      {/* Ambient trust glow behind the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 rounded-[32px] bg-gradient-to-tr from-teal-500/20 via-emerald-500/15 to-sky-500/20 blur-2xl"
      />

      {/* Main Coded Glass Window */}
      <div className="relative rounded-3xl bg-[#0B132B] text-white border border-slate-700/80 shadow-[0_25px_70px_-15px_rgba(11,19,43,0.45)] overflow-hidden p-5 sm:p-6">
        {/* Window Top Status Bar */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
              FinFlow Live Engine
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {LOOP_ITEMS.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                aria-label={`View ${item.mode}`}
                onClick={() => setStep(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === step ? 'w-6 bg-teal-400' : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Net Balance Row + Live Sparkline */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 mb-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Monthly Tracked Balance
            </p>
            <div
              className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5 font-mono"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              ₹2,58,750
            </div>
            <div className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.4% savings rate</span>
            </div>
          </div>

          {/* Animated SVG Sparkline */}
          <div className="w-28 h-14 flex items-center">
            <svg viewBox="0 0 120 50" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M4 38 C 24 36, 32 22, 52 25 C 72 28, 84 12, 116 8 L 116 48 L 4 48 Z"
                fill="url(#sparkGrad)"
              />
              <path
                d="M4 38 C 24 36, 32 22, 52 25 C 72 28, 84 12, 116 8"
                fill="none"
                stroke="#2dd4bf"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="116" cy="8" r="4" className="fill-emerald-400 animate-ping" />
              <circle cx="116" cy="8" r="4" className="fill-emerald-400" />
            </svg>
          </div>
        </div>

        {/* Active Live Capture Stream Card */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/50 border border-teal-500/30 p-4 mb-4 transition-all duration-500">
          <div className="flex items-center justify-between mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/25">
              {active.mode.includes('Camera') ? (
                <ScanLine className="w-3 h-3" />
              ) : (
                <Mic className="w-3 h-3" />
              )}
              {active.mode}
            </span>

            {/* Animated 10-bar Equalizer */}
            <div className="flex items-center gap-1 h-4" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((bar) => (
                <span
                  key={bar}
                  className="w-1 h-full rounded-full bg-teal-400"
                  style={{
                    animation: `pulseBar ${0.7 + (bar % 3) * 0.2}s ease-in-out infinite`,
                    animationDelay: `${bar * 90}ms`,
                  }}
                />
              ))}
            </div>
          </div>

          <p className="text-sm sm:text-base font-medium text-slate-100 mb-3">
            {active.input}
          </p>

          {/* Parsed Output Pill */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800/90">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-white">{active.merchant}</div>
                <div className="text-[11px] text-teal-300 font-mono">{active.category}</div>
              </div>
            </div>
            <div
              className="text-base sm:text-lg font-bold text-emerald-400 font-mono"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              -{active.amount}
            </div>
          </div>
        </div>

        {/* Live Budget Guardrail Bar */}
        <div className="px-1">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Monthly Budget Guardrail</span>
            <span className="font-mono text-slate-200">{active.budgetPct}% used</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${active.accent} transition-all duration-700`}
              style={{ width: `${active.budgetPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 2. VOICE WAVE LOOP CARD (Pure Code Loop Visualisation)
 */
export function VoiceWaveLoopCard() {
  const phrases = [
    { lang: 'English', text: '“Spent ₹340 at Blue Tokai”', tag: 'Food & Dining · ₹340' },
    { lang: 'हिंदी', text: '“सब्ज़ी और फल ₹280”', tag: 'Groceries · ₹280' },
    { lang: 'বাংলা', text: '“আজ বাজার ₹৪৫০”', tag: 'Market · ₹450' },
  ]
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx((p) => (p + 1) % phrases.length), 2600)
    return () => clearInterval(t)
  }, [phrases.length])

  const current = phrases[idx]

  return (
    <div className="rounded-2xl bg-[#0B132B] text-white p-5 border border-slate-800 shadow-inner">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          {phrases.map((p, i) => (
            <span
              key={p.lang}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-colors ${
                i === idx
                  ? 'bg-teal-500 text-slate-950 font-bold'
                  : 'bg-slate-800/90 text-slate-400'
              }`}
            >
              {p.lang}
            </span>
          ))}
        </div>
        <Mic className="w-4 h-4 text-teal-400 animate-pulse" />
      </div>

      {/* Animated Equalizer Wave */}
      <div className="flex items-center justify-center gap-1.5 h-12 my-3" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="w-1.5 rounded-full bg-gradient-to-t from-teal-500 to-emerald-300"
            style={{
              height: `${28 + ((i * 17) % 65)}%`,
              animation: `pulseBar ${0.65 + (i % 4) * 0.18}s ease-in-out infinite`,
              animationDelay: `${i * 60}ms`,
            }}
          />
        ))}
      </div>

      <div className="text-center space-y-2 pt-2 border-t border-slate-800/80">
        <p className="text-sm font-medium text-slate-100">{current.text}</p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-mono">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {current.tag}
        </span>
      </div>
    </div>
  )
}

/**
 * 3. RECEIPT SCANNER LASER LOOP CARD (Pure Code Loop Visualisation)
 */
export function ReceiptScannerLoopCard() {
  return (
    <div className="relative rounded-2xl bg-[#0B132B] text-white p-5 border border-slate-800 overflow-hidden">
      <style>{`
        @keyframes laserSweep {
          0%, 100% { top: 14%; opacity: 0.9; }
          50% { top: 82%; opacity: 1; }
        }
      `}</style>

      {/* Moving Laser Beam */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_14px_2px_rgba(52,211,153,0.85)] z-20"
        style={{ animation: 'laserSweep 3.2s ease-in-out infinite' }}
      />

      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-mono uppercase tracking-wider text-teal-300">
          OCR Vision · Auto-Extract
        </span>
        <ScanLine className="w-4 h-4 text-emerald-400" />
      </div>

      {/* Coded Mini Receipt */}
      <div className="rounded-xl bg-slate-900/95 border border-slate-800 p-3.5 font-mono text-xs space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-700">
          <span className="text-white font-semibold">DMART AVENUE LTD</span>
          <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px]">
            MERCHANT
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>14 Grocery Items</span>
          <span>₹1,331.60</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>CGST + SGST (9%)</span>
          <span>₹118.40</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-emerald-400 font-bold">
          <span>TOTAL EXTRACTED</span>
          <span className="text-sm">₹1,450.00</span>
        </div>
      </div>
    </div>
  )
}

/**
 * 4. ANALYTICS & MONTHLY REPORT LOOP CARD (Pure Code Loop Visualisation)
 */
export function AnalyticsReportLoopCard() {
  const [highlightBar, setHighlightBar] = useState(4)

  useEffect(() => {
    const t = setInterval(() => setHighlightBar((p) => (p + 1) % 6), 1400)
    return () => clearInterval(t)
  }, [])

  const bars = [42, 58, 49, 72, 64, 86]

  return (
    <div className="rounded-2xl bg-[#0B132B] text-white p-5 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-teal-300">
            Monthly Cashflow &amp; PDF
          </span>
          <div className="text-sm font-semibold text-white mt-0.5">
            ₹42,500 Net Saved
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-mono">
          PDF · CSV
        </span>
      </div>

      {/* Animated 6-Month Bar Loop */}
      <div className="flex items-end justify-between gap-2 h-24 pt-4 px-2">
        {bars.map((h, i) => {
          const active = i === highlightBar
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${
                  active
                    ? 'bg-gradient-to-t from-teal-500 to-emerald-300 shadow-[0_0_12px_rgba(45,212,191,0.45)]'
                    : 'bg-slate-800'
                }`}
                style={{ height: `${h}%` }}
              />
              <span className="text-[10px] font-mono text-slate-400">
                M{i + 1}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-amber-400" />
          80% Budget Guardrail Active
        </span>
        <span className="font-mono text-emerald-400">On Track</span>
      </div>
    </div>
  )
}

/**
 * 5. INTERACTIVE CODED WORKSPACE LOOP (Replaces static PhoneSlider screenshots)
 */
export function WorkspacePreviewLoop() {
  const [activeTab, setActiveTab] = useState(0)

  const tabs = [
    {
      title: 'Live Dashboard',
      icon: Wallet,
      metric: '₹2,58,750',
      sub: 'Total Balance · +18.4% vs last month',
      rows: [
        { name: 'Blue Tokai Coffee', cat: 'Food & Dining · Voice (EN)', val: '-₹340' },
        { name: 'Fresh Mandi & Grocery', cat: 'Groceries · Voice (हिंदी)', val: '-₹480' },
        { name: 'DMart Supermarts', cat: 'Household · Receipt OCR', val: '-₹1,450' },
      ],
    },
    {
      title: 'Smart Budgets',
      icon: PieChart,
      metric: '64% Used',
      sub: '₹25,600 of ₹40,000 Monthly Target',
      rows: [
        { name: 'Groceries & Home', cat: '₹11,200 / ₹15,000', val: '74%' },
        { name: 'Food & Dining', cat: '₹6,400 / ₹8,000 (Alert at 80%)', val: '80%' },
        { name: 'Transit & Fuel', cat: '₹4,200 / ₹7,000', val: '60%' },
      ],
    },
    {
      title: 'Telegram & Voice Sync',
      icon: Bot,
      metric: '< 1.2 sec',
      sub: 'Real-time Cloud Sync across Web & @FinFlowBot',
      rows: [
        { name: '“আজ সকালের বাজার ₹৪৫০”', cat: 'Synced via Telegram Bot', val: '-₹450' },
        { name: '“Uber to Airport ₹680”', cat: 'Synced via Web Voice', val: '-₹680' },
        { name: 'Electricity Bill Receipt', cat: 'Synced via Camera OCR', val: '-₹2,140' },
      ],
    },
    {
      title: 'Monthly Statements',
      icon: FileText,
      metric: '1-Tap Export',
      sub: 'Audit-ready PDF & CSV Financial Reports',
      rows: [
        { name: 'October Executive Summary.pdf', cat: 'Income, Spend & Tax Breakdown', val: 'Ready' },
        { name: 'Category Ledger Export.csv', cat: 'Compatible with Excel & Sheets', val: 'Ready' },
        { name: 'AES-256 Cloud Backup', cat: 'Encrypted PostgreSQL Vault', val: 'Verified' },
      ],
    },
  ]

  useEffect(() => {
    const t = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % tabs.length)
    }, 3800)
    return () => clearInterval(t)
  }, [tabs.length])

  const current = tabs[activeTab]

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Tab pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon
          const selected = idx === activeTab
          return (
            <button
              key={tab.title}
              type="button"
              onClick={() => setActiveTab(idx)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                selected
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.title}</span>
            </button>
          )
        })}
      </div>

      {/* Coded App Showcase Panel */}
      <div className="rounded-3xl bg-slate-900/95 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-teal-400">
              {current.title}
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">
              {current.metric}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">{current.sub}</p>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-mono self-start sm:self-center">
            <ShieldCheck className="w-4 h-4" />
            <span>Live Encrypted Sync</span>
          </div>
        </div>

        <div className="space-y-3">
          {current.rows.map((r) => (
            <div
              key={r.name}
              className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-teal-500/40 transition-colors"
            >
              <div>
                <div className="text-sm sm:text-base font-semibold text-white">
                  {r.name}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{r.cat}</div>
              </div>
              <div
                className="text-sm sm:text-base font-bold text-teal-400 font-mono shrink-0"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {r.val}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
