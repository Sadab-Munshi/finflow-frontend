'use client'

import React, { useState } from 'react'
import {
  Mic,
  Camera,
  Send,
  CheckCircle2,
  Sparkles,
  Receipt,
  Bot,
  ArrowUpRight,
} from 'lucide-react'

export interface ParsedExpenseItem {
  id: string
  rawInput: string
  languageLabel: string
  channel: 'voice' | 'receipt' | 'telegram'
  merchant: string
  category: string
  amount: number
  taxNote: string
  budgetImpactPct: number
  timestamp: string
}

const PRESET_SAMPLES: ParsedExpenseItem[] = [
  {
    id: 'sample-en',
    rawInput: '“Spent ₹340 at Blue Tokai Coffee, Khan Market”',
    languageLabel: 'English · Voice Note',
    channel: 'voice',
    merchant: 'Blue Tokai Coffee Roasters',
    category: 'Food & Dining',
    amount: 340,
    taxNote: 'CGST/SGST ₹16.20 included',
    budgetImpactPct: 62,
    timestamp: 'Just now · 0.6s AI parse',
  },
  {
    id: 'sample-hi',
    rawInput: '“सब्ज़ी और किराना के लिए चार सौ अस्सी रुपए दिए”',
    languageLabel: 'हिंदी · Voice Note',
    channel: 'voice',
    merchant: 'Local Mandi & Fresh Mart',
    category: 'Groceries & Household',
    amount: 480,
    taxNote: 'Zero-rated fresh produce',
    budgetImpactPct: 64,
    timestamp: 'Just now · Hindi ASR v3',
  },
  {
    id: 'sample-bn',
    rawInput: '“আজ সকালের বাজার আর অটো ভাড়া মিলিয়ে ₹৪৫০ খরচ হলো”',
    languageLabel: 'বাংলা · Voice Note',
    channel: 'telegram',
    merchant: 'Morning Bazaar + Auto Transit',
    category: 'Market & Daily Commute',
    amount: 450,
    taxNote: 'Synced via @FinFlowBot',
    budgetImpactPct: 63,
    timestamp: 'Just now · Bengali ASR v3',
  },
  {
    id: 'sample-receipt',
    rawInput: 'Scanned thermal receipt · DMart Avenue Supermarts Ltd.',
    languageLabel: 'OCR Vision · 14 Line Items',
    channel: 'receipt',
    merchant: 'DMart Avenue Supermarts',
    category: 'Monthly Provision & Home',
    amount: 1450,
    taxNote: 'GSTIN 27AAACA... · ₹118.40 GST',
    budgetImpactPct: 71,
    timestamp: 'Just now · Vision OCR 99.4%',
  },
]

function parseCustomExpenseInput(input: string): ParsedExpenseItem {
  const cleaned = input.trim()
  // Support Western digits and Bengali/Devanagari digits
  const digitMap: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  }
  const normalized = cleaned.replace(/[०-९০-৯]/g, (ch) => digitMap[ch] || ch)
  const numMatch = normalized.match(/(\d[\d,]*)/)
  const amount = numMatch
    ? Math.max(1, Math.min(999999, parseInt(numMatch[1].replace(/,/g, ''), 10)))
    : 320

  const lower = normalized.toLowerCase()
  let category = 'Daily Living'
  let merchant = 'Quick Expense Entry'

  if (/(coffee|cafe|tea|chai|dinner|lunch|breakfast|zomato|swiggy|food|restaurant|biryani)/.test(lower)) {
    category = 'Food & Dining'
    merchant = 'Dining & Refreshments'
  } else if (/(uber|ola|auto|metro|petrol|fuel|cab|train|bus|flight)/.test(lower)) {
    category = 'Transit & Fuel'
    merchant = 'City Commute'
  } else if (/(dmart|grocery|groceries|blinkit|zepto|instamart|milk|vegetables|market|bazaar|सब्ज़ी|বাজার)/.test(lower)) {
    category = 'Groceries & Household'
    merchant = 'Neighborhood Grocer'
  } else if (/(electricity|wifi|jio|airtel|bill|rent|recharge|gas)/.test(lower)) {
    category = 'Bills & Utilities'
    merchant = 'Utility Bill Desk'
  }

  return {
    id: `custom-${Date.now()}`,
    rawInput: `“${cleaned}”`,
    languageLabel: 'Live Custom Prompt · AI Parsed',
    channel: 'voice',
    merchant,
    category,
    amount,
    taxNote: 'Categorized automatically',
    budgetImpactPct: Math.min(96, Math.round(60 + amount / 250)),
    timestamp: 'Logged right now · Live Demo',
  }
}

export function LiveExpenseDemo() {
  const [activeSample, setActiveSample] = useState<ParsedExpenseItem>(PRESET_SAMPLES[0])
  const [recentHistory, setRecentHistory] = useState<ParsedExpenseItem[]>([
    PRESET_SAMPLES[0],
    PRESET_SAMPLES[3],
    PRESET_SAMPLES[1],
  ])
  const [customText, setCustomText] = useState('')
  const [isParsing, setIsParsing] = useState(false)

  const triggerSelect = (item: ParsedExpenseItem) => {
    setIsParsing(true)
    setTimeout(() => {
      setActiveSample(item)
      setRecentHistory((prev) => {
        const filtered = prev.filter((p) => p.id !== item.id)
        return [item, ...filtered].slice(0, 4)
      })
      setIsParsing(false)
    }, 180)
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customText.trim()) return
    const parsed = parseCustomExpenseInput(customText)
    setCustomText('')
    triggerSelect(parsed)
  }

  const totalSampleSpend = recentHistory.reduce((acc, item) => acc + item.amount, 24800)

  return (
    <div
      data-ui="live-expense-sandbox"
      className="rounded-3xl border border-stone-200/90 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/95 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.08)] overflow-hidden"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-7 py-4 border-b border-stone-200/80 dark:border-zinc-800 bg-stone-50/80 dark:bg-zinc-950/60">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse" />
          <span className="text-xs font-mono uppercase tracking-[0.14em] text-stone-600 dark:text-zinc-400">
            Interactive AI Ledger Sandbox · Try It Live
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-zinc-400 font-mono">
          <span>English</span>
          <span>·</span>
          <span>हिंदी</span>
          <span>·</span>
          <span>বাংলা</span>
          <span>·</span>
          <span>Receipt OCR</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-stone-200/80 dark:divide-zinc-800">
        {/* Left column: Input selector + Live custom prompt bar */}
        <div className="lg:col-span-7 p-5 sm:p-7 space-y-5">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-1">
              1. Pick a real Indian spend scenario or type your own
            </p>
            <h3 className="text-lg sm:text-xl font-semibold text-stone-900 dark:text-zinc-100 tracking-tight">
              Speak naturally or snap a crumpled bill. FinFlow structures the rest.
            </h3>
          </div>

          {/* Preset pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PRESET_SAMPLES.map((sample) => {
              const selected = activeSample.id === sample.id
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => triggerSelect(sample)}
                  className={`group text-left p-3.5 rounded-2xl border transition-all duration-200 ${
                    selected
                      ? 'border-teal-600 dark:border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 shadow-sm'
                      : 'border-stone-200/90 dark:border-zinc-800 hover:border-stone-300 dark:hover:border-zinc-700 bg-stone-50/50 dark:bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-teal-700 dark:text-teal-400">
                      {sample.channel === 'receipt' ? (
                        <Camera className="w-3.5 h-3.5" />
                      ) : sample.channel === 'telegram' ? (
                        <Bot className="w-3.5 h-3.5" />
                      ) : (
                        <Mic className="w-3.5 h-3.5" />
                      )}
                      {sample.languageLabel}
                    </span>
                    <span
                      className="text-xs font-semibold text-stone-900 dark:text-zinc-100 font-mono"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      ₹{sample.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700 dark:text-zinc-300 line-clamp-1 font-medium">
                    {sample.rawInput}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Custom prompt input bar */}
          <form onSubmit={handleCustomSubmit} className="pt-1">
            <label htmlFor="live-expense-input" className="sr-only">
              Type any expense in English, Hindi, or Bengali
            </label>
            <div className="flex items-center gap-2 p-1.5 rounded-2xl border border-stone-300/90 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus-within:border-teal-600 dark:focus-within:border-teal-400 transition-colors">
              <div className="pl-3 text-stone-400 dark:text-zinc-500">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <input
                id="live-expense-input"
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder='Type e.g. "Paid 650 for Uber to airport" or "चाय 40"...'
                className="w-full bg-transparent text-sm text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-none py-2"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 dark:bg-teal-500 text-white dark:text-zinc-950 text-xs font-semibold hover:bg-stone-800 dark:hover:bg-teal-400 transition-colors shrink-0"
              >
                <span>Parse</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Right column: Structured Output Ledger Card */}
        <div className="lg:col-span-5 p-5 sm:p-7 bg-stone-50/60 dark:bg-zinc-950/40 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                2. Structured Ledger Entry
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified
              </span>
            </div>

            {/* Active parsed card */}
            <div
              className={`p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200/90 dark:border-zinc-800 shadow-sm transition-all duration-200 ${
                isParsing ? 'opacity-50 scale-[0.99]' : 'opacity-100 scale-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className="inline-block text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 mb-1.5">
                    {activeSample.category}
                  </span>
                  <h4 className="text-base font-semibold text-stone-900 dark:text-zinc-100">
                    {activeSample.merchant}
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                    {activeSample.taxNote}
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className="text-xl font-bold text-stone-900 dark:text-white font-mono"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    -₹{activeSample.amount.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-stone-400 dark:text-zinc-500 font-mono">
                    INR · Ledger
                  </span>
                </div>
              </div>

              {/* Monthly budget progress bar */}
              <div className="pt-3 border-t border-stone-100 dark:border-zinc-800/80">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-stone-500 dark:text-zinc-400">
                    Monthly Budget Pacing
                  </span>
                  <span
                    className="font-mono font-medium text-stone-800 dark:text-zinc-200"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    ₹{totalSampleSpend.toLocaleString('en-IN')} / ₹40,000 ({activeSample.budgetImpactPct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-200/80 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 transition-all duration-500"
                    style={{ width: `${activeSample.budgetImpactPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mini Recent Feed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-stone-400 dark:text-zinc-500">
              <span>Live Stream</span>
              <span>{activeSample.timestamp}</span>
            </div>
            <div className="space-y-1.5">
              {recentHistory.slice(0, 3).map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-white/70 dark:bg-zinc-900/60 border border-stone-200/60 dark:border-zinc-800/60"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Receipt className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span className="font-medium text-stone-700 dark:text-zinc-300 truncate">
                      {item.merchant}
                    </span>
                  </div>
                  <span
                    className="font-mono font-semibold text-stone-900 dark:text-zinc-100 shrink-0 ml-2"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    ₹{item.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
