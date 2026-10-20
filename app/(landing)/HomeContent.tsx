'use client'

import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, ScanLine, Brain, FileText, PiggyBank, Shield, ArrowRight, Sparkles } from 'lucide-react'
import { BorderBeam } from 'border-beam'
import { createClient } from '@/lib/supabase/client'

const PhoneSlider = dynamic(() => import('@/components/landing/PhoneSlider'), {
  ssr: false,
  loading: () => (
    <section style={{ width: '100%', background: '#ffffff', padding: '3rem 1rem 2.5rem', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 'clamp(220px, 30vw, 280px)', aspectRatio: '9/19', borderRadius: '16px', background: '#f3f4f6' }} />
    </section>
  ),
})

export default function LandingPage() {
  const router = useRouter()
  const heroRef = useRef<HTMLDivElement>(null)

  /* ── auth redirect ── */
  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.push('/dashboard')
    }
    check()
  }, [router])

  /* ── scroll reveal ── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible') })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const features = [
    {
      title: 'Voice in Any Language',
      description: 'Simply speak your transactions naturally. FinFlow understands multiple languages and accents.',
      icon: Mic,
      iconGradient: 'from-teal-500 to-emerald-600 shadow-teal-500/25',
      cardAccent: 'hover:border-teal-300/80',
      badgeBg: 'from-teal-50/80 to-emerald-50/40',
    },
    {
      title: 'Scan Receipts',
      description: 'Point your camera at any receipt. We extract the details automatically, no typing needed.',
      icon: ScanLine,
      iconGradient: 'from-indigo-500 to-violet-600 shadow-indigo-500/25',
      cardAccent: 'hover:border-indigo-300/80',
      badgeBg: 'from-indigo-50/80 to-violet-50/40',
    },
    {
      title: 'AI Insights',
      description: 'Get personalized insights about your spending patterns and opportunities to save.',
      icon: Brain,
      iconGradient: 'from-amber-500 to-orange-600 shadow-amber-500/25',
      cardAccent: 'hover:border-amber-300/80',
      badgeBg: 'from-amber-50/80 to-orange-50/40',
    },
    {
      title: 'Monthly Reports',
      description: 'Beautiful, easy-to-understand reports delivered to you every month.',
      icon: FileText,
      iconGradient: 'from-sky-500 to-blue-600 shadow-sky-500/25',
      cardAccent: 'hover:border-sky-300/80',
      badgeBg: 'from-sky-50/80 to-blue-50/40',
    },
    {
      title: 'Budget Tracking',
      description: 'Set budgets for different categories and track your progress in real-time.',
      icon: PiggyBank,
      iconGradient: 'from-rose-500 to-pink-600 shadow-rose-500/25',
      cardAccent: 'hover:border-rose-300/80',
      badgeBg: 'from-rose-50/80 to-pink-50/40',
    },
    {
      title: 'Secured Database',
      description: 'Your financial data is encrypted and stored securely in the cloud. Industry-standard protection keeps it safe at all times.',
      icon: Shield,
      iconGradient: 'from-emerald-600 to-teal-700 shadow-emerald-600/25',
      cardAccent: 'hover:border-emerald-300/80',
      badgeBg: 'from-emerald-50/80 to-teal-50/40',
    },
  ]

  const steps = [
    {
      number: '01',
      title: 'Speak, Scan, or Type',
      description: 'Add transactions however you prefer. Use your voice, scan a receipt, or type it out.',
      gradient: 'from-teal-600 to-emerald-500',
    },
    {
      number: '02',
      title: 'Review and Confirm',
      description: 'Our AI organizes everything for you. Just review and confirm the details.',
      gradient: 'from-indigo-600 to-sky-500',
    },
    {
      number: '03',
      title: 'Track and Grow',
      description: 'Watch your financial picture come together with insights and reports.',
      gradient: 'from-amber-500 to-orange-500',
    },
  ]

  return (
    <>
      <style jsx global>{`
        .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .reveal.visible { opacity: 1; transform: translateY(0); }
      `}</style>

      <div className="overflow-hidden">

        {/* ── HERO ── */}
        <section
          ref={heroRef}
          className="relative z-0 min-h-fit flex flex-col items-center justify-center text-center px-5 sm:px-6 pt-4 pb-16 sm:pb-20"
        >
          {/* Ambient multi-layered glow backdrop */}
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[520px] h-[340px] bg-gradient-to-tr from-teal-200/45 via-emerald-200/35 to-sky-200/40 rounded-full blur-3xl" />
            <div className="absolute top-1/3 -left-24 w-80 h-80 bg-teal-300/20 rounded-full blur-3xl" />
            <div className="absolute bottom-10 -right-24 w-80 h-80 bg-sky-300/20 rounded-full blur-3xl" />
          </div>

          <div className="hero-content max-w-5xl mx-auto px-2 sm:px-6 lg:px-8 text-center">
            {/* Hero Illustration with soft floating glow */}
            <div className="relative mx-auto w-full max-w-[320px] sm:max-w-sm mb-8 sm:mb-10">
              <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-teal-400/20 to-sky-400/20 blur-2xl -z-10" />
              <Image
                src="/hero-dashboard.webp"
                alt="FinFlow Dashboard"
                width={384}
                height={384}
                sizes="(max-width: 640px) 85vw, 384px"
                quality={85}
                className="w-full h-auto mx-auto drop-shadow-md"
                priority
                fetchPriority="high"
              />
            </div>

            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-teal-200/80 shadow-xs text-xs sm:text-sm font-medium text-teal-800 mb-6 reveal">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Be among the first to manage money the smarter way</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.12] mb-6 reveal">
              Spend less time counting,
              <br />
              <span className="bg-gradient-to-r from-[#0F766E] via-[#059669] to-[#0284C7] bg-clip-text text-transparent">
                more time living
              </span>
            </h1>

            <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed reveal">
              Track every rupee effortlessly. Voice, camera or text — in your language, backed by a secured database.
            </p>

            <div className="flex flex-row items-center justify-center gap-3.5 flex-wrap reveal">
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
        </section>

        {/* ── PHONE SLIDER ── */}
        <PhoneSlider />

        {/* ── FEATURES ── */}
        <section className="py-20 sm:py-24 bg-gradient-to-b from-[#f0f9f4] via-white to-[#e8f4fd]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14 sm:mb-16">
              <span className="inline-block px-3.5 py-1 rounded-full bg-teal-100/80 text-teal-800 text-xs font-bold uppercase tracking-wider mb-3 reveal">
                Smart Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4 reveal">
                Everything you need
              </h2>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto reveal">
                Simple, powerful features to help you understand and improve your finances.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
              {features.map((feature, idx) => (
                <div
                  key={feature.title}
                  className={`group relative p-6 sm:p-7 rounded-3xl border border-slate-200/80 ${feature.cardAccent} bg-gradient-to-br ${feature.badgeBg} via-white to-white shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 reveal`}
                  style={{ transitionDelay: `${idx * 40}ms` }}
                >
                  <div
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-br ${feature.iconGradient} text-white shadow-md mb-5 group-hover:scale-105 transition-transform`}
                  >
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="py-20 sm:py-24 bg-gradient-to-b from-[#e8f4fd] to-[#f0f9f4]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14 sm:mb-16">
              <span className="inline-block px-3.5 py-1 rounded-full bg-sky-100/90 text-sky-800 text-xs font-bold uppercase tracking-wider mb-3 reveal">
                Quick Setup
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4 reveal">
                How it works
              </h2>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto reveal">
                Getting started is simple. Three steps to better financial clarity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="relative rounded-3xl bg-white/90 backdrop-blur-xs border border-slate-200/80 p-6 sm:p-8 text-center shadow-sm hover:shadow-md transition-all reveal"
                >
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
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-5 reveal">
              Ready to take control of your finances?
            </h2>
            <p className="text-base sm:text-lg text-teal-100/90 mb-9 max-w-2xl mx-auto leading-relaxed reveal">
              Start tracking your finances smarter — effortlessly, in your language, with your data securely stored.
            </p>
            <div className="inline-block reveal">
              <BorderBeam
                size="sm"
                colorVariant="colorful"
                strength={0.9}
                theme="dark"
                borderRadius={999}
              >
                <Button
                  size="lg"
                  className="px-8 py-6 rounded-full bg-white text-[#0F766E] font-bold hover:bg-teal-50 shadow-xl"
                  asChild
                >
                  <Link href="/signup" className="inline-flex items-center gap-2">
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </BorderBeam>
            </div>
          </div>
        </section>

      </div>
    </>
  )
}
