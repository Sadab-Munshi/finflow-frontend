'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, ScanLine, Brain, FileText, PiggyBank, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PhoneSlider from '@/components/landing/PhoneSlider'

export default function LandingPage() {
  const router = useRouter()
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => { document.title = 'FinFlow | Home' }, [])

  /* ── auth redirect ── */
  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.push('/dashboard')
    }
    check()
  }, [])

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
    { title: 'Voice in Any Language', description: 'Simply speak your transactions naturally. FinFlow understands multiple languages and accents.', icon: Mic },
    { title: 'Scan Receipts', description: 'Point your camera at any receipt. We extract the details automatically, no typing needed.', icon: ScanLine },
    { title: 'AI Insights', description: 'Get personalized insights about your spending patterns and opportunities to save.', icon: Brain },
    { title: 'Monthly Reports', description: 'Beautiful, easy-to-understand reports delivered to you every month.', icon: FileText },
    { title: 'Budget Tracking', description: 'Set budgets for different categories and track your progress in real-time.', icon: PiggyBank },
    { title: 'Secured Database', description: 'Your financial data is encrypted and stored securely in the cloud. Industry-standard protection keeps it safe at all times.', icon: Shield },
  ]

  const steps = [
    { number: '01', title: 'Speak, Scan, or Type', description: 'Add transactions however you prefer. Use your voice, scan a receipt, or type it out.' },
    { number: '02', title: 'Review and Confirm', description: 'Our AI organizes everything for you. Just review and confirm the details.' },
    { number: '03', title: 'Track and Grow', description: 'Watch your financial picture come together with insights and reports.' },
  ]

  return (
    <>
      <style jsx global>{`
        .reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
      `}</style>

      <div className="overflow-hidden">

        {/* ── HERO ── */}
        <section
          ref={heroRef}
          className="relative z-0 min-h-fit flex flex-col items-center justify-center text-center px-6 pb-16"
        >
          <div className="hero-content max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-neutral-900 tracking-tight leading-tight mb-6 reveal">
              Spend less time counting,
              <br />
              more time living
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto mb-6 reveal">
              Track every rupee effortlessly. Voice, camera or text — in your language, backed by a secured database.
            </p>
            <p className="text-sm text-neutral-400 text-center mb-8">✦ Be among the first to manage money the smarter way</p>
            <div className="mt-0 flex flex-row items-center justify-center gap-3 flex-wrap">
              <Link href="/signup" className="bg-gray-900 text-white px-7 py-3 rounded-full text-sm font-medium hover:bg-gray-700 transition-all">
                Get Started
              </Link>
              <Link href="/login" className="border border-gray-300 text-gray-800 px-7 py-3 rounded-full text-sm font-medium hover:border-gray-500 transition-all bg-white">
                Login
              </Link>
            </div>
            <Image
              src="/hero-dashboard.webp"
              alt="FinFlow Dashboard"
              width={384}
              height={384}
              className="w-full max-w-sm mx-auto mt-10 drop-shadow-sm"
              priority
            />
          </div>

          {/* Background blobs */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neutral-100 rounded-full blur-3xl opacity-50" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neutral-100 rounded-full blur-3xl opacity-50" />
          </div>
        </section>

        {/* ── PHONE SLIDER ── */}
        <PhoneSlider />

        {/* ── FEATURES ── */}
        <section className="py-24 bg-gradient-to-b from-[#f0f9f4] to-[#e8f4fd]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4 reveal">Everything you need</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto reveal">
                Simple, powerful features to help you understand and improve your finances.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group p-6 rounded-2xl border border-neutral-100 hover:border-neutral-200 hover:shadow-lg transition-all bg-white reveal"
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-4 group-hover:bg-teal-700 group-hover:text-white transition-colors">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">{feature.title}</h3>
                  <p className="text-neutral-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="py-24 bg-gradient-to-b from-[#e8f4fd] to-[#f0f9f4]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4 reveal">How it works</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto reveal">
                Getting started is simple. Three steps to better financial clarity.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step) => (
                <div key={step.number} className="text-center reveal">
                  <div className="text-5xl font-bold text-neutral-200 mb-4">{step.number}</div>
                  <h3 className="text-xl font-semibold text-neutral-900 mb-3">{step.title}</h3>
                  <p className="text-neutral-600 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="py-24 bg-teal-700">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 reveal">
              Ready to take control of your finances?
            </h2>
            <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto reveal">
              Start tracking your finances smarter — effortlessly, in your language, with your data securely stored.
            </p>
            <Button size="lg" className="px-8 bg-white text-teal-700 hover:bg-neutral-100 reveal" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </section>

      </div>
    </>
  )
}
