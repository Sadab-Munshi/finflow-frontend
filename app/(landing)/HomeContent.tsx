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
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { BorderBeam } from 'border-beam'
import { createClient } from '@/lib/supabase/client'
import { BlurText } from '@/components/landing/reactbits/BlurText'
import { RotatingText } from '@/components/landing/reactbits/RotatingText'
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
      {/* ── HERO ── */}
      <section className="relative z-0 min-h-fit flex flex-col justify-center px-4 sm:px-6 pt-6 sm:pt-12 pb-16 sm:pb-24 bg-gradient-to-b from-[#f0f9f4] via-white to-[#e8f4fd]">
        {/* Ambient multi-layered glow backdrop */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[520px] h-[340px] bg-gradient-to-tr from-teal-200/45 via-emerald-200/35 to-sky-200/40 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-24 w-80 h-80 bg-teal-300/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 -right-24 w-80 h-80 bg-sky-300/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto w-full px-2 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left 7 Columns: Headline + CTA */}
            <div className="lg:col-span-7 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-teal-200/80 shadow-xs text-xs sm:text-sm font-medium text-teal-800 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Be among the first to manage money the smarter way</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12] mb-6">
                <BlurText text="Spend less time counting," delayStepMs={45} />
                <br />
                <span className="bg-gradient-to-r from-[#0F766E] via-[#059669] to-[#0284C7] bg-clip-text text-transparent">
                  more time living
                </span>
              </h1>

              <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                Track every rupee effortlessly. Voice, camera, or text in{' '}
                <RotatingText
                  items={[
                    'English · “₹340 Coffee”',
                    'हिंदी · “₹480 किराना”',
                    'বাংলা · “₹৪৫০ বাজার”',
                    'Seconds · “₹1,450 Receipt”',
                  ]}
                  className="font-semibold text-teal-800 bg-teal-50/90 px-2.5 py-0.5 rounded-lg border border-teal-200/80 text-sm sm:text-lg"
                />
              </p>

              <div className="flex flex-row items-center justify-center lg:justify-start gap-3.5 flex-wrap">
                <BorderBeam
                  size="sm"
                  colorVariant="colorful"
                  strength={0.85}
                  theme="dark"
                  borderRadius={999}
                >
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-slate-900 via-[#0F766E] to-slate-900 text-white px-7 py-3.5 rounded-full text-sm font-semibold shadow-lg shadow-teal-900/15 hover:opacity-95 transition-all"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </BorderBeam>

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center border border-slate-300/90 text-slate-800 px-7 py-3.5 rounded-full text-sm font-semibold hover:border-teal-600 hover:text-teal-800 transition-all bg-white/90 backdrop-blur-xs shadow-2xs"
                >
                  Login
                </Link>
              </div>
            </div>

            {/* Right 5 Columns: ReactBits 3D CardSwap + Voice Pill Loop */}
            <div className="lg:col-span-5">
              <HeroCardSwapLoop />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES (Each with its own unique visual format & color theme) ── */}
      <section className="py-20 sm:py-24 bg-gradient-to-b from-[#e8f4fd] via-white to-[#f0f9f4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 sm:mb-16">
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
                  className={`group rounded-3xl border border-slate-200/80 ${feature.cardAccent} bg-white p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center gap-3.5 mb-4">
                      <div
                        className={`w-11 h-11 flex items-center justify-center rounded-2xl bg-gradient-to-br ${feature.iconGradient} text-white shadow-md shrink-0 group-hover:scale-105 transition-transform`}
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
      <section className="py-20 sm:py-24 bg-gradient-to-b from-[#f0f9f4] to-[#e8f4fd]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 sm:mb-16">
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
                <div className="relative h-full rounded-3xl bg-white/95 backdrop-blur-xs border border-slate-200/80 p-6 sm:p-8 text-center shadow-sm hover:shadow-md transition-all">
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

      {/* ── FINAL CTA ── */}
      <section className="relative py-20 sm:py-24 bg-gradient-to-br from-[#042F2E] via-[#0F766E] to-[#0F172A] overflow-hidden">
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
            Start tracking your finances smarter — effortlessly, in your language, with your data securely stored.
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
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-[#0F766E] font-bold text-sm hover:bg-teal-50 shadow-xl transition-colors"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </BorderBeam>
          </div>
        </div>
      </section>
    </div>
  )
}
