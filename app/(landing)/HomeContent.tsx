'use client'

import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Fraunces, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import {
  Mic,
  ScanLine,
  FileSpreadsheet,
  ShieldCheck,
  ArrowRight,
  Bot,
  Sparkles,
  CheckCircle2,
  BellRing,
  Lock,
  Layers,
} from 'lucide-react'
import { BorderBeam } from 'border-beam'
import { createClient } from '@/lib/supabase/client'
import { BlurText } from '@/components/landing/reactbits/BlurText'
import { RotatingText } from '@/components/landing/reactbits/RotatingText'
import { SpotlightCard } from '@/components/landing/reactbits/SpotlightCard'
import { CountUpText } from '@/components/landing/reactbits/CountUpText'
import { LiveExpenseDemo } from '@/components/landing/LiveExpenseDemo'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-editorial-serif',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-editorial-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-editorial-mono',
})

const PhoneSlider = dynamic(() => import('@/components/landing/PhoneSlider'), {
  ssr: false,
  loading: () => (
    <div className="w-full py-10 flex justify-center">
      <div
        style={{
          width: 'clamp(220px, 28vw, 276px)',
          aspectRatio: '9/19',
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.06)',
        }}
      />
    </div>
  ),
})

export default function LandingPage() {
  const router = useRouter()

  /* ── auth redirect ── */
  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) router.push('/dashboard')
    }
    check()
  }, [router])

  return (
    <div
      className={`${jakarta.variable} ${fraunces.variable} ${jetbrainsMono.variable} font-sans overflow-x-hidden`}
    >
      {/* ════════════════════════════════════════════════════════════════════════
          CHAPTER 01 — WARM EDITORIAL PAPER HERO (#FAF8F5)
          Asymmetric 12-column composition + hero-finflow-editorial.webp
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-[#FAF8F5] pt-8 sm:pt-14 pb-16 sm:pb-24 border-b border-stone-200/80 overflow-hidden">
        {/* Subtle warm ambient radial light */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 w-[540px] h-[420px] rounded-full bg-gradient-to-bl from-teal-500/10 via-amber-400/8 to-transparent blur-3xl"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left 7 columns: Editorial thesis + Rotating trilingual ticker + CTA */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Eyebrow index */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-stone-900/[0.04] border border-stone-300/80">
                <span className="h-2 w-2 rounded-full bg-teal-600" />
                <span className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.14em] text-stone-700 font-medium">
                  INDIA&apos;S MULTILINGUAL AI EXPENSE LEDGER
                </span>
              </div>

              {/* 1-2 line editorial headline at all viewports */}
              <h1
                className="font-bold text-stone-950 tracking-[-0.03em] leading-[1.06]"
                style={{ fontSize: 'clamp(2.15rem, 4.6vw, 4.1rem)' }}
              >
                <BlurText text="Say the rupee." delayStepMs={50} />{' '}
                <span
                  className="text-teal-800 italic font-semibold"
                  style={{ fontFamily: 'var(--font-editorial-serif), Georgia, serif' }}
                >
                  Consider it tracked.
                </span>
              </h1>

              {/* Concrete body copy with live RotatingText */}
              <p className="text-base sm:text-lg text-stone-600 max-w-[58ch] leading-relaxed">
                Log daily expenses by voice, receipt photo, or Telegram in English, Hindi, or Bengali. Zero manual spreadsheets—just say{' '}
                <RotatingText
                  items={[
                    '“₹340 Blue Tokai coffee”',
                    '“हिंदी · ₹480 सब्ज़ी और किराना”',
                    '“বাংলা · ₹৪৫০ সকালের বাজার”',
                    '“DMart receipt · ₹1,450”',
                  ]}
                  className="font-mono text-sm sm:text-base font-semibold text-teal-800 bg-teal-500/10 px-2.5 py-0.5 rounded-lg border border-teal-600/20"
                />
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <BorderBeam
                  size="sm"
                  colorVariant="colorful"
                  strength={0.85}
                  theme="dark"
                  borderRadius={999}
                >
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2.5 bg-stone-950 hover:bg-teal-900 text-white px-7 py-3.5 rounded-full text-sm font-semibold shadow-lg shadow-stone-950/15 transition-colors"
                  >
                    <span>Start Tracking</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </BorderBeam>

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center border border-stone-300 text-stone-800 px-6 py-3.5 rounded-full text-sm font-semibold hover:border-stone-900 hover:bg-white transition-all bg-white/70"
                >
                  Sign In to Ledger
                </Link>
              </div>

              {/* Concrete capability strip */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-stone-200/90 max-w-lg">
                <div>
                  <div
                    className="text-base sm:text-lg font-bold text-stone-900 font-mono"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    EN · HI · BN
                  </div>
                  <div className="text-xs text-stone-500">Native voice AI</div>
                </div>
                <div>
                  <div
                    className="text-base sm:text-lg font-bold text-stone-900 font-mono"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    &lt; 1.8 sec
                  </div>
                  <div className="text-xs text-stone-500">Receipt OCR parse</div>
                </div>
                <div>
                  <div
                    className="text-base sm:text-lg font-bold text-stone-900 font-mono"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    AES-256
                  </div>
                  <div className="text-xs text-stone-500">Cloud encrypted</div>
                </div>
              </div>
            </div>

            {/* Right 5 columns: Bespoke Hero Visual (/landing/hero-finflow-editorial.webp) */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                <div className="relative rounded-3xl overflow-hidden border border-stone-200/90 shadow-[0_28px_70px_-15px_rgba(15,23,42,0.18)] bg-stone-900">
                  <Image
                    src="/landing/hero-finflow-editorial.webp"
                    alt="FinFlow multilingual Indian rupee ledger showing ₹2,58,750 balance and voice recognition in English, Hindi, and Bengali"
                    width={960}
                    height={720}
                    sizes="(max-width: 1024px) 95vw, 42vw"
                    quality={90}
                    priority
                    className="w-full h-auto object-cover"
                  />
                  {/* Subtle glass bottom caption bar */}
                  <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-stone-950/85 backdrop-blur-md border-t border-white/10 text-white">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-mono text-zinc-300">
                        NET TRACKED BALANCE
                      </span>
                    </div>
                    <CountUpText
                      end={258750}
                      prefix="₹"
                      className="text-sm sm:text-base font-mono font-bold text-emerald-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          CHAPTER 02 — THE "ONE LIVE THING" INTERACTIVE SANDBOX (#F3EFEA)
          Visitors test voice/receipt parsing right inside the page
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-24 bg-[#F3EFEA] border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.14em] text-teal-800 font-semibold mb-2">
                00 / LIVE AI PARSER SANDBOX
              </p>
              <h2
                className="font-bold text-stone-950 tracking-[-0.025em] leading-[1.1]"
                style={{ fontSize: 'clamp(1.65rem, 3.2vw, 2.65rem)' }}
              >
                Test the ledger right here.
              </h2>
            </div>
            <p className="text-sm sm:text-base text-stone-600 max-w-md">
              Tap a preset in English, Hindi, or Bengali—or type any expense below—to see how FinFlow structures raw input into a verified ledger row.
            </p>
          </div>

          <LiveExpenseDemo />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          CHAPTER 03 — ASYMMETRIC EDITORIAL FEATURE REPORT (#FAF8F5)
          Featuring all 3 bespoke uploaded feature visuals with SpotlightCards
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 bg-[#FAF8F5] border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 sm:space-y-28">
          {/* Chapter Header */}
          <div className="max-w-2xl">
            <p className="text-xs font-mono uppercase tracking-[0.14em] text-teal-800 font-semibold mb-2">
              FIELD REPORT · BUILT FOR INDIA
            </p>
            <h2
              className="font-bold text-stone-950 tracking-[-0.025em] leading-[1.1]"
              style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.85rem)' }}
            >
              Built around real rupee habits.
            </h2>
          </div>

          {/* ── ROW 01: MULTILINGUAL VOICE AI (/landing/feature-voice-multilingual.webp) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-teal-800 font-semibold">
                <Mic className="w-4 h-4" />
                <span>01 / TRILINGUAL VOICE ENGINE</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-stone-950 tracking-tight leading-tight">
                Speak in English, Hindi, or Bengali. Never type a category again.
              </h3>
              <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
                Whether you are paying the local sabzi mandi, splitting a cab, or ordering filter coffee, FinFlow’s acoustic pipeline recognizes Indian accents, mixed-script phrasing, and rupee amounts automatically.
              </p>

              <div className="space-y-2.5 pt-2">
                {[
                  {
                    lang: 'EN',
                    spoken: '“Spent ₹340 at Blue Tokai Coffee”',
                    parsed: 'Food & Dining · -₹340',
                  },
                  {
                    lang: 'HI',
                    spoken: '“सब्ज़ी और फल के लिए ₹280 दिए”',
                    parsed: 'Groceries · -₹280',
                  },
                  {
                    lang: 'BN',
                    spoken: '“আজ বাজার ₹৪৫০ খরচ হলো”',
                    parsed: 'Market & Home · -₹450',
                  },
                ].map((row) => (
                  <div
                    key={row.lang}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white border border-stone-200/90 text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-800 font-mono font-semibold text-[11px]">
                        {row.lang}
                      </span>
                      <span className="text-stone-700 truncate">{row.spoken}</span>
                    </div>
                    <span
                      className="font-mono font-semibold text-stone-900 shrink-0"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {row.parsed}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              <SpotlightCard
                className="rounded-3xl border border-stone-200/90 bg-stone-950 shadow-xl"
                spotlightColor="rgba(20, 184, 166, 0.22)"
              >
                <Image
                  src="/landing/feature-voice-multilingual.webp"
                  alt="FinFlow Multilingual Voice Expense AI waveform in English, Hindi, and Bengali"
                  width={960}
                  height={640}
                  sizes="(max-width: 1024px) 95vw, 55vw"
                  quality={88}
                  className="w-full h-auto object-cover"
                />
              </SpotlightCard>
            </div>
          </div>

          {/* ── ROW 02: INSTANT RECEIPT VISION (/landing/feature-receipt-scanner.webp) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 order-2 lg:order-1">
              <SpotlightCard
                className="rounded-3xl border border-stone-200/90 bg-stone-900 shadow-xl"
                spotlightColor="rgba(245, 158, 11, 0.18)"
              >
                <Image
                  src="/landing/feature-receipt-scanner.webp"
                  alt="FinFlow AI Vision scanning an Indian DMart grocery receipt and extracting ₹1,450 total and GST breakdown"
                  width={960}
                  height={640}
                  sizes="(max-width: 1024px) 95vw, 55vw"
                  quality={88}
                  className="w-full h-auto object-cover"
                />
              </SpotlightCard>
            </div>

            <div className="lg:col-span-5 order-1 lg:order-2 space-y-5">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-amber-800 font-semibold">
                <ScanLine className="w-4 h-4" />
                <span>02 / CAMERA RECEIPT OCR</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-stone-950 tracking-tight leading-tight">
                Point your camera at any crumpled bill. Extracted in 1.8 seconds.
              </h3>
              <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
                From long DMart supermarket slips to chemist bills and restaurant invoices, FinFlow’s vision model reads merchant names, GSTIN taxes, line items, and the final rupee total without manual entry.
              </p>

              <ul className="space-y-2.5 pt-1 text-sm text-stone-700">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Extracts merchant name, date, CGST/SGST, and grand total</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Auto-maps supermarket, fuel, dining, and utility categories</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Works directly from mobile camera or forwarded bill photos</span>
                </li>
              </ul>
            </div>
          </div>

          {/* ── ROW 03: MONTHLY BRIEFINGS & BUDGET ALERTS (/landing/feature-monthly-report.webp) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-teal-800 font-semibold">
                <FileSpreadsheet className="w-4 h-4" />
                <span>03 / MONTHLY BRIEFINGS &amp; BUDGETS</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-stone-950 tracking-tight leading-tight">
                Executive monthly statements and proactive 80% budget guardrails.
              </h3>
              <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
                Don’t wait until your bank balance runs dry to discover where your money went. FinFlow alerts you the moment any category crosses 80% of its monthly cap and compiles clean PDF &amp; CSV reports at month-end.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-white border border-stone-200/90">
                  <div className="text-xs font-mono uppercase text-stone-500 mb-1">
                    Pacing Guardrail
                  </div>
                  <CountUpText
                    end={80}
                    suffix="% Threshold"
                    indianFormat={false}
                    className="text-lg sm:text-xl font-bold text-stone-950 font-mono"
                  />
                  <p className="text-xs text-stone-500 mt-1">
                    Instant alert before overspending
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-stone-200/90">
                  <div className="text-xs font-mono uppercase text-stone-500 mb-1">
                    Audit Ready
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-stone-950 font-mono">
                    PDF &amp; CSV
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    1-tap monthly ledger export
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <SpotlightCard
                className="rounded-3xl border border-stone-200/90 bg-stone-900 shadow-xl"
                spotlightColor="rgba(20, 184, 166, 0.2)"
              >
                <Image
                  src="/landing/feature-monthly-report.webp"
                  alt="FinFlow Monthly Executive Financial Statement and PDF Analytics Report"
                  width={960}
                  height={640}
                  sizes="(max-width: 1024px) 95vw, 55vw"
                  quality={88}
                  className="w-full h-auto object-cover"
                />
              </SpotlightCard>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          CHAPTER 04 — DEEP OBSIDIAN CHAPTER (#0C1116)
          "Many Into One" Convergence Diagram + Live Mobile Workspace Slider
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 bg-[#0C1116] text-zinc-100 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          {/* Part A: Many Into One Convergence */}
          <div>
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-mono uppercase tracking-[0.14em] text-teal-400 font-semibold mb-2">
                04 / UNIFIED ARCHITECTURE
              </p>
              <h2
                className="font-bold text-white tracking-[-0.025em] leading-[1.1]"
                style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.85rem)' }}
              >
                Four channels. One clean ledger.
              </h2>
              <p className="text-sm sm:text-base text-zinc-400 mt-3 leading-relaxed">
                Capture expenses wherever they happen—on the road via Telegram, at the kitchen counter by voice, or at the checkout counter via camera. Everything syncs into one encrypted PostgreSQL ledger.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: Mic,
                  tag: 'INPUT 01',
                  title: 'Trilingual Voice',
                  desc: 'Natural speech recognition in English, Hindi, and Bengali with instant rupee extraction.',
                },
                {
                  icon: ScanLine,
                  tag: 'INPUT 02',
                  title: 'Vision Receipt OCR',
                  desc: 'Camera bill scanning that extracts merchant, taxes, and line-item totals automatically.',
                },
                {
                  icon: Bot,
                  tag: 'INPUT 03',
                  title: 'Telegram Bot Sync',
                  desc: 'Send a quick message or voice note to @FinFlowBot and see it on your dashboard in real time.',
                },
                {
                  icon: ShieldCheck,
                  tag: 'CORE LEDGER',
                  title: 'Encrypted Cloud Vault',
                  desc: 'Row-level security, daily budget guardrails, and exportable monthly statements.',
                },
              ].map((card) => (
                <SpotlightCard
                  key={card.title}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6"
                  spotlightColor="rgba(20, 184, 166, 0.16)"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-teal-400">
                      {card.tag}
                    </span>
                    <card.icon className="w-5 h-5 text-teal-400" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">
                    {card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    {card.desc}
                  </p>
                </SpotlightCard>
              ))}
            </div>
          </div>

          {/* Part B: Interactive Mobile App Showcase (PhoneSlider) */}
          <div className="pt-8 border-t border-zinc-800/80">
            <div className="text-center max-w-2xl mx-auto mb-6">
              <p className="text-xs font-mono uppercase tracking-[0.14em] text-teal-400 font-semibold mb-2">
                05 / MOBILE WORKSPACE TOUR
              </p>
              <h2
                className="font-bold text-white tracking-[-0.025em] leading-[1.1]"
                style={{ fontSize: 'clamp(1.65rem, 3.2vw, 2.65rem)' }}
              >
                Inside the live mobile workspace.
              </h2>
            </div>

            <PhoneSlider />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          CHAPTER 05 — EMERALD CLOSING STATEMENT (#062825)
          Clean editorial closing CTA — zero pricing clutter
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-28 bg-gradient-to-br from-[#042421] via-[#083833] to-[#0C1116] text-white overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[560px] h-[280px] rounded-full bg-teal-400/15 blur-3xl"
        />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-mono uppercase tracking-wider text-teal-200">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>READY IN 30 SECONDS · ENGLISH · हिंदी · বাংলা</span>
          </div>

          <h2
            className="font-bold text-white tracking-[-0.025em] leading-[1.08]"
            style={{ fontSize: 'clamp(1.9rem, 4vw, 3.35rem)' }}
          >
            Own your financial clarity today.
          </h2>

          <p className="text-base sm:text-lg text-teal-100/85 max-w-xl mx-auto leading-relaxed">
            Stop wondering where your salary went. Speak, snap, or message your next rupee spend and watch FinFlow organize your entire month.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <BorderBeam
              size="sm"
              colorVariant="colorful"
              strength={0.9}
              theme="dark"
              borderRadius={999}
            >
              <Link
                href="/signup"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-white text-stone-950 font-bold text-sm hover:bg-teal-50 transition-colors shadow-xl"
              >
                <span>Create Your Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </BorderBeam>

            <Link
              href="/user-guide"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full border border-white/25 text-white/90 hover:text-white hover:bg-white/10 text-sm font-semibold transition-colors"
            >
              <span>Read the User Guide</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
