'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  Mic,
  ScanLine,
  Brain,
  FileText,
  PiggyBank,
  Shield,
  Sparkles,
} from 'lucide-react'
import { BorderBeam } from 'border-beam'
import { createClient } from '@/lib/supabase/client'
import { SpotlightCard } from '@/components/landing/reactbits/SpotlightCard'
import {
  HeroCardSwapLoop,
  VoicePillVisual,
  TearTicketReceiptVisual,
  InsightPulseVisual,
  MonthlyReportVisual,
  BudgetGaugeVisual,
  SecurityVaultVisual,
} from '@/components/landing/MotionLoops'

export default function LandingPage() {
  const router = useRouter()

  /* ── auth redirect ── */
  useEffect(() => {
    const check = async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return
      }
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) router.push('/dashboard')
    }
    check()
  }, [router])

  const features = [
    {
      title: 'Voice in Any Language',
      description:
        'Simply speak your transactions naturally. FinFlow understands multiple languages and accents.',
      icon: Mic,
      iconGradient: 'from-indigo-500 to-violet-600 shadow-indigo-500/25',
      cardAccent: 'hover:border-indigo-300/80',
      spotlight: 'rgba(99, 102, 241, 0.10)',
      Visual: VoicePillVisual,
    },
    {
      title: 'Scan Receipts',
      description:
        'Point your camera at any receipt. We extract the details automatically, no typing needed.',
      icon: ScanLine,
      iconGradient: 'from-amber-500 to-orange-600 shadow-amber-500/25',
      cardAccent: 'hover:border-amber-300/80',
      spotlight: 'rgba(245, 158, 11, 0.12)',
      Visual: TearTicketReceiptVisual,
    },
    {
      title: 'AI Insights',
      description:
        'Get personalized insights about your spending patterns and opportunities to save.',
      icon: Brain,
      iconGradient: 'from-rose-500 to-pink-600 shadow-rose-500/25',
      cardAccent: 'hover:border-rose-300/80',
      spotlight: 'rgba(244, 63, 94, 0.10)',
      Visual: InsightPulseVisual,
    },
    {
      title: 'Monthly Reports',
      description:
        'Beautiful, easy-to-understand reports delivered to you every month.',
      icon: FileText,
      iconGradient: 'from-sky-500 to-blue-600 shadow-sky-500/25',
      cardAccent: 'hover:border-sky-300/80',
      spotlight: 'rgba(14, 165, 233, 0.10)',
      Visual: MonthlyReportVisual,
    },
    {
      title: 'Budget Tracking',
      description:
        'Set budgets for different categories and track your progress in real-time.',
      icon: PiggyBank,
      iconGradient: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
      cardAccent: 'hover:border-emerald-300/80',
      spotlight: 'rgba(16, 185, 129, 0.10)',
      Visual: BudgetGaugeVisual,
    },
    {
      title: 'Secured Database',
      description:
        'Your financial data is encrypted and stored securely in the cloud at all times.',
      icon: Shield,
      iconGradient: 'from-slate-700 to-slate-900 shadow-slate-700/25',
      cardAccent: 'hover:border-slate-300/80',
      spotlight: 'rgba(15, 23, 42, 0.08)',
      Visual: SecurityVaultVisual,
    },
  ]

  const steps = [
    {
      number: '01',
      title: 'Speak, Scan, or Type',
      description:
        'Add transactions however you prefer. Use your voice, scan a receipt, or type it out.',
      gradient: 'from-teal-600 to-emerald-500',
      beamVariant: 'ocean' as const,
    },
    {
      number: '02',
      title: 'Review and Confirm',
      description:
        'Our AI organizes everything for you. Just review and confirm the details.',
      gradient: 'from-indigo-600 to-sky-500',
      beamVariant: 'colorful' as const,
    },
    {
      number: '03',
      title: 'Track and Grow',
      description:
        'Watch your financial picture come together with insights and reports.',
      gradient: 'from-amber-500 to-orange-500',
      beamVariant: 'sunset' as const,
    },
  ]

  return (
    <div className="overflow-x-hidden">
      {/* ── HERO (Instant static text rendering, 2-col on tablet, balanced full-width container on desktop) ── */}
      <section className="relative z-0 min-h-fit flex flex-col justify-center pt-4 pb-10 md:py-14 lg:py-20 bg-gradient-to-b from-[#f0f9f4] via-white to-[#e8f4fd]">
        {/* Ambient multi-layered glow backdrop */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[520px] h-[340px] bg-gradient-to-tr from-teal-200/45 via-emerald-200/35 to-sky-200/40 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-24 w-80 h-80 bg-teal-300/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 -right-24 w-80 h-80 bg-sky-300/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 lg:gap-12 items-center">
            {/* Left 6 Columns (Tablet & Desktop): Static Headline + Action Hierarchy */}
            <div className="md:col-span-6 text-center md:text-left">
              {/* Crisp static badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-teal-200/90 shadow-2xs text-xs sm:text-sm font-semibold text-teal-800 mb-3.5 sm:mb-4 whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Manage your money the smarter way</span>
              </div>

              <h1 className="text-[2rem] sm:text-4xl md:text-[2.55rem] lg:text-[3.35rem] xl:text-[3.65rem] font-extrabold text-slate-900 tracking-tight leading-[1.12] mb-3.5 sm:mb-4">
                Spend less time counting,
                <br />
                <span className="bg-gradient-to-r from-[#0F766E] via-[#059669] to-[#0284C7] bg-clip-text text-transparent">
                  more time living
                </span>
              </h1>

              {/* Static main tagline with zero delay */}
              <p className="text-[15px] sm:text-lg text-slate-600 max-w-xl mx-auto md:mx-0 mb-3.5 sm:mb-4 leading-relaxed">
                Track every rupee effortlessly by voice, camera, or text in your language, backed by a secured database.
              </p>

              {/* Static multilingual capability pill (zero timed reveal or text cycling) */}
              <div className="h-9 flex items-center justify-center md:justify-start mb-5 sm:mb-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50/90 border border-teal-200/80 text-xs sm:text-sm font-semibold text-teal-800 whitespace-nowrap shadow-2xs">
                  <span className="h-2 w-2 rounded-full bg-teal-600 shrink-0" />
                  <span className="font-mono">
                    English · हिंदी · বাংলা · Receipt Scan
                  </span>
                </div>
              </div>

              {/* Action Hierarchy: Low-profile text-only Login on LEFT + Elevated Start Tracking CTA on RIGHT */}
              <div className="flex flex-row items-center justify-center md:justify-start gap-3 sm:gap-5 flex-wrap">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center h-12 sm:h-[52px] px-4 bg-transparent border-0 shadow-none text-[15px] font-semibold text-slate-600 hover:text-teal-700 underline-offset-4 hover:underline transition-colors"
                >
                  Login
                </Link>

                <BorderBeam
                  size="sm"
                  colorVariant="colorful"
                  strength={0.85}
                  theme="dark"
                  borderRadius={999}
                >
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center h-12 sm:h-[52px] px-8 sm:px-9 rounded-full bg-gradient-to-b from-[#14B8A6] via-[#0D9488] to-[#0F766E] text-white text-[15px] font-bold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_12px_28px_-6px_rgba(13,148,136,0.48),0_4px_12px_-2px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_18px_36px_-6px_rgba(20,184,166,0.62),0_6px_16px_-2px_rgba(15,23,42,0.15)] active:translate-y-0 transition-all duration-200"
                  >
                    Start Tracking
                  </Link>
                </BorderBeam>
              </div>
            </div>

            {/* Right 6 Columns (Tablet & Desktop): Prominent Interactive Dashboard Preview Card */}
            <div className="md:col-span-6">
              <HeroCardSwapLoop />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES (Aligned to exact same max-w-7xl container width as Hero) ── */}
      <section
        id="features"
        className="scroll-mt-20 py-16 sm:py-24 bg-gradient-to-b from-[#e8f4fd] via-white to-[#f0f9f4]"
      >
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-3.5 py-1 rounded-full bg-teal-100/80 text-teal-800 text-xs font-bold uppercase tracking-wider mb-3">
              Smart Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Everything you need
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
              Simple, powerful features to help you understand and improve your finances.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {features.map((feature) => {
              const VisualComponent = feature.Visual
              return (
                <SpotlightCard
                  key={feature.title}
                  spotlightColor={feature.spotlight}
                  className={`group rounded-3xl border border-slate-200/80 ${feature.cardAccent} bg-white p-6 sm:p-7 shadow-xs hover:shadow-xl transition-shadow duration-200 flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center gap-3.5 mb-4">
                      <div
                        className={`w-11 h-11 flex items-center justify-center rounded-2xl bg-gradient-to-br ${feature.iconGradient} text-white shadow-md shrink-0`}
                      >
                        <feature.icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-5">
                      {feature.description}
                    </p>
                  </div>

                  {/* Unique Interactive Code Loop Visual for this specific capability */}
                  <VisualComponent />
                </SpotlightCard>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how-it-works"
        className="scroll-mt-20 py-16 sm:py-24 bg-gradient-to-b from-[#f0f9f4] to-[#e8f4fd]"
      >
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-3.5 py-1 rounded-full bg-sky-100/90 text-sky-800 text-xs font-bold uppercase tracking-wider mb-3">
              Quick Setup
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              How it works
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
              Getting started is simple. Three steps to better financial clarity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {steps.map((step) => (
              <BorderBeam
                key={step.number}
                size="sm"
                colorVariant={step.beamVariant}
                strength={0.65}
                theme="light"
                borderRadius={24}
              >
                <div className="relative h-full rounded-3xl bg-white/95 backdrop-blur-xs border border-slate-200/80 p-6 sm:p-8 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div
                    className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${step.gradient} text-white text-xl font-black flex items-center justify-center shadow-md mb-5`}
                  >
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2.5">
                    {step.title}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </BorderBeam>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRE-FOOTER CTA BANNER (Clean em-dash-free copy) ── */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-br from-[#042F2E] via-[#0F766E] to-[#0F172A] overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-teal-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-amber-400/15 blur-3xl"
        />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-5">
            Ready to take control of your finances?
          </h2>
          <p className="text-base sm:text-lg text-teal-100/90 mb-9 max-w-2xl mx-auto leading-relaxed">
            Start tracking your finances smarter, effortlessly in your language, with your data securely stored.
          </p>
          <div className="inline-block">
            <BorderBeam
              size="sm"
              colorVariant="colorful"
              strength={0.9}
              theme="dark"
              borderRadius={999}
            >
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-12 sm:h-[52px] px-9 rounded-full bg-white text-[#0F766E] font-bold text-[15px] shadow-[0_14px_32px_-6px_rgba(0,0,0,0.35),0_0_24px_rgba(45,212,191,0.32)] hover:-translate-y-0.5 hover:bg-teal-50 hover:shadow-[0_20px_40px_-6px_rgba(0,0,0,0.42),0_0_34px_rgba(45,212,191,0.52)] active:translate-y-0 transition-all duration-200"
              >
                Start Tracking
              </Link>
            </BorderBeam>
          </div>
        </div>
      </section>
    </div>
  )
}
