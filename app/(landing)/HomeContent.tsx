'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  Mic,
  ScanLine,
  FileText,
  PiggyBank,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Bot,
} from 'lucide-react'
import { BorderBeam } from 'border-beam'
import { createClient } from '@/lib/supabase/client'
import { BlurText } from '@/components/landing/reactbits/BlurText'
import { RotatingText } from '@/components/landing/reactbits/RotatingText'
import { SpotlightCard } from '@/components/landing/reactbits/SpotlightCard'
import {
  HeroLedgerLoop,
  VoiceWaveLoopCard,
  ReceiptScannerLoopCard,
  AnalyticsReportLoopCard,
  WorkspacePreviewLoop,
} from '@/components/landing/MotionLoops'

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
    <div className="overflow-x-hidden bg-[#F8FAFC] text-slate-900">
      {/* ════════════════════════════════════════════════════════════════════════
          1. HERO — TRUSTWORTHY FINTECH PALETTE + LIVE CODE LOOP VISUALISATION
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-8 sm:pt-14 pb-16 sm:pb-24 overflow-hidden bg-gradient-to-b from-[#F0FDF9] via-[#F8FAFC] to-white border-b border-slate-200/80">
        {/* Subtle trustworthy emerald/sky radial glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[680px] h-[360px] rounded-full bg-gradient-to-tr from-teal-300/25 via-emerald-200/20 to-sky-300/20 blur-3xl"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left 7 Columns: Clean, Direct Value Proposition */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-teal-200/90 shadow-2xs text-xs font-semibold text-teal-800">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Smart Personal Finance for India</span>
              </div>

              <h1
                className="font-extrabold text-slate-900 tracking-tight leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 4.8vw, 4.1rem)' }}
              >
                <BlurText text="Spend less time counting," delayStepMs={45} />
                <br />
                <span className="bg-gradient-to-r from-[#0F766E] via-[#059669] to-[#0284C7] bg-clip-text text-transparent">
                  more time living.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Track every rupee by voice, camera, or Telegram in{' '}
                <RotatingText
                  items={[
                    'English · “₹340 Coffee”',
                    'हिंदी · “₹480 किराना”',
                    'বাংলা · “₹৪৫০ বাজার”',
                    'Camera · “₹1,450 Receipt”',
                  ]}
                  className="font-mono text-sm sm:text-base font-semibold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200"
                />
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-1">
                <BorderBeam
                  size="sm"
                  colorVariant="colorful"
                  strength={0.85}
                  theme="dark"
                  borderRadius={999}
                >
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0F172A] via-[#0F766E] to-[#0F172A] text-white px-7 py-3.5 rounded-full text-sm font-semibold shadow-lg shadow-teal-900/15 hover:opacity-95 transition-all"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </BorderBeam>

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center border border-slate-300 text-slate-800 px-7 py-3.5 rounded-full text-sm font-semibold hover:border-teal-600 hover:text-teal-800 transition-all bg-white shadow-2xs"
                >
                  Login
                </Link>
              </div>

              {/* Concise Trust Badges */}
              <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  English, हिंदी &amp; বাংলা
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-teal-600" />
                  Instant Receipt OCR
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-600" />
                  AES-256 Encrypted Cloud
                </span>
              </div>
            </div>

            {/* Right 5 Columns: Animated Code Loop Visualisation */}
            <div className="lg:col-span-5">
              <HeroLedgerLoop />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          2. LIVE CODE-LOOP CAPABILITIES BENTO GRID
          Replaces static feature images with continuous animated code visualisations
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="inline-block px-3.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80 text-xs font-bold uppercase tracking-wider mb-3">
              Automated Finance
            </span>
            <h2
              className="font-extrabold text-slate-900 tracking-tight"
              style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)' }}
            >
              Everything happens automatically.
            </h2>
          </div>

          {/* Top Row: 3 Live Animated Code Loop Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <SpotlightCard
              className="rounded-3xl border border-slate-200/90 bg-slate-50/70 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow"
              spotlightColor="rgba(13, 148, 136, 0.12)"
            >
              <div className="mb-5">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700 mb-2">
                  <Mic className="w-4 h-4" />
                  <span>Voice in Any Language</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Speak naturally in English, Hindi, or Bengali.
                </h3>
              </div>
              <VoiceWaveLoopCard />
            </SpotlightCard>

            <SpotlightCard
              className="rounded-3xl border border-slate-200/90 bg-slate-50/70 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow"
              spotlightColor="rgba(13, 148, 136, 0.12)"
            >
              <div className="mb-5">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700 mb-2">
                  <ScanLine className="w-4 h-4" />
                  <span>Instant Receipt Scanner</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Point your camera. Merchant &amp; GST extracted in seconds.
                </h3>
              </div>
              <ReceiptScannerLoopCard />
            </SpotlightCard>

            <SpotlightCard
              className="rounded-3xl border border-slate-200/90 bg-slate-50/70 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow"
              spotlightColor="rgba(13, 148, 136, 0.12)"
            >
              <div className="mb-5">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700 mb-2">
                  <FileText className="w-4 h-4" />
                  <span>Reports &amp; Insights</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Visual monthly trends with 1-tap PDF &amp; CSV exports.
                </h3>
              </div>
              <AnalyticsReportLoopCard />
            </SpotlightCard>
          </div>

          {/* Bottom Row: 3 Concise Trust Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: PiggyBank,
                title: 'Smart Budget Alerts',
                desc: 'Set category caps and get notified automatically at 80% usage.',
                color: 'from-teal-600 to-emerald-600',
              },
              {
                icon: Bot,
                title: 'Telegram Bot Sync',
                desc: 'Log expenses on the go via @FinFlowBot with instant dashboard sync.',
                color: 'from-sky-600 to-blue-600',
              },
              {
                icon: ShieldCheck,
                title: 'Bank-Grade Security',
                desc: 'Protected with AES-256 cloud encryption and strict row-level privacy.',
                color: 'from-emerald-600 to-teal-700',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 p-6 rounded-3xl border border-slate-200/90 bg-white shadow-2xs"
              >
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center shrink-0 shadow-sm`}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          3. INTERACTIVE CODED WORKSPACE LOOP (Replaces mobile screenshot slider)
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-24 bg-[#0B132B] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-block px-3.5 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 text-xs font-mono uppercase tracking-wider mb-3">
              Live Workspace Loop
            </span>
            <h2
              className="font-extrabold text-white tracking-tight"
              style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)' }}
            >
              One clean ledger across every device.
            </h2>
          </div>

          <WorkspacePreviewLoop />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          4. THREE SIMPLE STEPS
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-[#F8FAFC] border-t border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'Speak, Scan, or Message',
                desc: 'Use your voice, snap a receipt, or message our Telegram bot.',
              },
              {
                num: '02',
                title: 'AI Organizes Instantly',
                desc: 'Amount, merchant, and category are structured automatically.',
              },
              {
                num: '03',
                title: 'Stay Ahead Every Month',
                desc: 'Track budgets in real time and export clean monthly reports.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-7 text-center shadow-2xs"
              >
                <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#059669] text-white text-base font-mono font-bold flex items-center justify-center mb-4 shadow-sm">
                  {step.num}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1.5">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          5. FINAL CTA — DEEP TRUST EMERALD & NAVY
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-br from-[#042F2E] via-[#0F766E] to-[#0B132B] text-white overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-teal-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-sky-400/15 blur-3xl"
        />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2
            className="font-extrabold text-white tracking-tight"
            style={{ fontSize: 'clamp(1.85rem, 3.6vw, 2.85rem)' }}
          >
            Ready to take control of your finances?
          </h2>
          <p className="text-base sm:text-lg text-teal-100/90 max-w-xl mx-auto leading-relaxed">
            Start tracking your expenses effortlessly—in your language, backed by a secured cloud database.
          </p>
          <div className="pt-1 inline-block">
            <BorderBeam
              size="sm"
              colorVariant="colorful"
              strength={0.9}
              theme="dark"
              borderRadius={999}
            >
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-[#0F766E] font-bold text-sm hover:bg-teal-50 transition-colors shadow-xl"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </BorderBeam>
          </div>
        </div>
      </section>
    </div>
  )
}
