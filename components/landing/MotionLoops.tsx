'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Mic,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  Lock,
} from 'lucide-react'
import { BorderBeam } from 'border-beam'

/**
 * 1. HERO VISUAL: Seamless Inline 60fps FinFlow Product Showcase Video (1200x900 4:3)
 * Replaces the stacked card box cleanly with instant WebP poster paint + WebM/MP4 looping video.
 */
export function HeroCardSwapLoop() {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.defaultMuted = true
    el.muted = true
    el.play().catch(() => {})
  }, [])

  return (
    <div className="relative w-full max-w-md md:max-w-none mx-auto">
      {/* Soft multi-tone ambient halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 lg:-inset-5 rounded-[36px] bg-gradient-to-tr from-teal-200/45 via-indigo-200/30 to-sky-200/40 blur-2xl"
      />

      {/* Full-bleed 4:3 Product Showcase Video Card */}
      <div className="relative rounded-3xl bg-white border border-slate-200/90 overflow-hidden shadow-[0_24px_60px_-15px_rgba(15,23,42,0.14),0_0_32px_-8px_rgba(13,148,136,0.12)]">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/assets/hero-preview-poster.webp"
          width={1200}
          height={900}
          aria-label="FinFlow live voice, receipt scan, budget, insights, and monthly summary preview"
          className="block w-full h-auto aspect-[4/3] object-cover bg-white pointer-events-none select-none"
        >
          <source src="/assets/hero-preview.webm" type="video/webm" />
          <source src="/assets/hero-preview.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  )
}

/**
 * FEATURE 1 VISUAL: ReactBits "Voice Pill" Acoustic Studio
 * Unique Palette: Soft Lavender & Royal Indigo
 */
export function VoicePillVisual() {
  const samples = [
    { lang: 'English', spoken: '“Coffee ₹340”', tag: 'Dining' },
    { lang: 'हिंदी', spoken: '“सब्ज़ी ₹280”', tag: 'Groceries' },
    { lang: 'বাংলা', spoken: '“বাজার ₹৪৫০”', tag: 'Market' },
  ]
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx((p) => (p + 1) % samples.length), 2400)
    return () => clearInterval(t)
  }, [samples.length])

  const s = samples[idx]

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-50/90 via-violet-50/60 to-white border border-indigo-100 p-4">
      <style>{`
        @keyframes eqSwell {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1); }
        }
      `}</style>

      <div className="flex items-center justify-between gap-1.5 mb-3">
        <div className="flex items-center gap-1">
          {samples.map((item, i) => (
            <span
              key={item.lang}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                i === idx
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-indigo-900/60 border border-indigo-100'
              }`}
            >
              {item.lang}
            </span>
          ))}
        </div>
        <span className="text-[11px] font-mono text-indigo-600 font-semibold">
          00:0{idx + 2}s
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-full bg-white border border-indigo-200/80 shadow-xs mb-3">
        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shrink-0">
          <Mic className="w-3.5 h-3.5" />
        </span>
        <div className="flex items-center gap-1 h-5 flex-1 justify-center" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-gradient-to-t from-indigo-500 to-violet-400"
              style={{
                height: `${35 + ((i * 19) % 60)}%`,
                animation: `eqSwell ${0.55 + (i % 3) * 0.2}s ease-in-out infinite`,
                animationDelay: `${i * 55}ms`,
              }}
            />
          ))}
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold shrink-0">
          {s.tag}
        </span>
      </div>

      <div className="text-center text-xs font-semibold text-indigo-950 h-4">
        {s.spoken}
      </div>
    </div>
  )
}

/**
 * FEATURE 2 VISUAL: ReactBits "Tear Ticket" Paper Receipt
 * Unique Palette: Warm Ivory Paper & Amber/Orange Stamp
 */
export function TearTicketReceiptVisual() {
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-white border border-amber-200/70 p-4 overflow-hidden">
      <style>{`
        @keyframes amberScan {
          0%, 100% { top: 18%; }
          50% { top: 78%; }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_10px_rgba(245,158,11,0.6)] z-10"
        style={{ animation: 'amberScan 3s ease-in-out infinite' }}
      />

      <div className="relative bg-[#FFFDF9] rounded-xl border border-amber-200/90 p-3 shadow-2xs font-mono text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-dashed border-amber-300">
          <span className="font-bold text-slate-800">DMART SUPERMARKET</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
            SCANNED
          </span>
        </div>
        <div className="py-2 space-y-1 text-[11px] text-slate-600">
          <div className="flex justify-between">
            <span>Groceries (14 items)</span>
            <span>₹1,331.60</span>
          </div>
          <div className="flex justify-between">
            <span>GST Included</span>
            <span>₹118.40</span>
          </div>
        </div>
        <div className="pt-2 border-t border-dashed border-amber-300 flex items-center justify-between font-bold text-amber-900">
          <span>TOTAL</span>
          <span className="text-sm text-orange-600">₹1,450.00</span>
        </div>
      </div>
    </div>
  )
}

/**
 * FEATURE 3 VISUAL: Smart Insights Pulse Card
 * Unique Palette: Soft Rose & Coral Intelligence
 */
export function InsightPulseVisual() {
  const tips = [
    { label: 'Weekend Dining Spike', save: 'Save ₹1,800/mo', delta: '-14% target' },
    { label: 'Recurring Subscriptions', save: '2 unused found', delta: '₹699/mo' },
    { label: 'Grocery Bulk Savings', save: 'Best at DMart', delta: '+12% value' },
  ]
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % tips.length), 2800)
    return () => clearInterval(t)
  }, [tips.length])

  const item = tips[active]

  return (
    <div className="rounded-2xl bg-gradient-to-br from-rose-50/80 via-pink-50/40 to-white border border-rose-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700">
          <Sparkles className="w-3.5 h-3.5" />
          Smart Pattern Detected
        </span>
        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-mono font-semibold">
          {item.delta}
        </span>
      </div>

      <div className="p-3 rounded-xl bg-white border border-rose-100 shadow-2xs flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-800">{item.label}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-0.5">{item.save}</div>
        </div>
        <span className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <ArrowUpRight className="w-4 h-4" />
        </span>
      </div>
    </div>
  )
}

/**
 * FEATURE 4 VISUAL: Monthly Reports & Export Stack
 * Unique Palette: Crisp Ocean Sky Blue
 */
export function MonthlyReportVisual() {
  const bars = [45, 62, 54, 78, 68, 88]
  const [activeBar, setActiveBar] = useState(5)

  useEffect(() => {
    const t = setInterval(() => setActiveBar((p) => (p + 1) % bars.length), 1500)
    return () => clearInterval(t)
  }, [bars.length])

  return (
    <div className="rounded-2xl bg-gradient-to-br from-sky-50/90 via-blue-50/40 to-white border border-sky-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-sky-950">Monthly Summary</span>
        <span className="px-2.5 py-0.5 rounded-full bg-sky-600 text-white text-[10px] font-semibold">
          PDF &amp; CSV
        </span>
      </div>

      <div className="flex items-end justify-between gap-2 h-16 px-1 mb-2">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            <div
              className={`w-full rounded-t-md transition-all duration-500 ${
                i === activeBar
                  ? 'bg-gradient-to-t from-sky-600 to-cyan-400'
                  : 'bg-sky-200/70'
              }`}
              style={{ height: `${h}%` }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-sky-950 font-medium pt-2 border-t border-sky-100">
        <span>Net Saved: ₹42,500</span>
        <span className="text-sky-600 font-mono">1-Tap Download</span>
      </div>
    </div>
  )
}

/**
 * FEATURE 5 VISUAL: Interactive Budget Sliders
 * Unique Palette: Fresh Mint & Emerald
 */
export function BudgetGaugeVisual() {
  const [step, setStep] = useState(0)
  const budgets = [
    { cat: 'Groceries & Home', pct: 64, amount: '₹9,600 / ₹15,000', bar: 'from-emerald-500 to-teal-500' },
    { cat: 'Dining & Coffee', pct: 80, amount: '₹6,400 / ₹8,000', bar: 'from-amber-500 to-orange-500' },
  ]

  useEffect(() => {
    const t = setInterval(() => setStep((p) => (p + 1) % 2), 2600)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border border-emerald-100 p-4 space-y-3">
      {budgets.map((b, idx) => (
        <div key={b.cat} className="bg-white rounded-xl p-2.5 border border-emerald-100/80 shadow-2xs">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-bold text-slate-800">{b.cat}</span>
            <span className="font-mono text-slate-600 text-[11px]">{b.amount}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${b.bar} transition-all duration-700`}
              style={{ width: `${idx === step ? b.pct : b.pct - 8}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * FEATURE 6 VISUAL: Secured Cloud Vault with BorderBeam
 * Unique Palette: Clean Metallic Slate & Cyan Shield
 */
export function SecurityVaultVisual() {
  return (
    <BorderBeam size="sm" colorVariant="ocean" strength={0.65} theme="light" borderRadius={16}>
      <div className="rounded-2xl bg-gradient-to-br from-slate-100/90 via-white to-teal-50/40 border border-slate-200/90 p-4 flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            AES-256 Encrypted
          </div>
          <div className="text-xs font-bold text-slate-800">
            Row-Level Cloud Protection
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            TLS 1.3 · Automated Backups
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-teal-400 flex items-center justify-center shrink-0 shadow-md">
          <Lock className="w-5 h-5" />
        </div>
      </div>
    </BorderBeam>
  )
}
