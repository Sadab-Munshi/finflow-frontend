'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, ScanLine, Brain, FileText, PiggyBank, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PhoneSlider from '@/components/landing/PhoneSlider'
import { BorderGlow } from '@/components/ui/border-glow'
import { Antigravity } from '@/components/ui/antigravity'

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
            <Image
              src="/hero-dashboard.webp"
              alt="FinFlow dashboard showing total balance of ₹2,58,750 with expense overview chart, spending categories breakdown and recent transactions"
              width={700}
              height={493}
              className="w-full max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto mb-8 drop-shadow-xl rounded-2xl"
              priority={true}
              quality={85}
            />
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 tracking-tight leading-tight mb-6 reveal">
              <span className="block">Spend less time counting,</span>
              <span className="block">more time living</span>
            </h1>
            <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto mb-10 reveal">
              Track every rupee effortlessly. Voice, camera or text — in your language, backed by a secured database.
            </p>
            <p className="text-sm text-neutral-400 mt-[-24px] mb-6 reveal">
              ✦ Join early users tracking their rupees smarter with FinFlow
            </p>
            <div className="mt-8 flex flex-row items-center justify-center gap-3 flex-wrap">
              <Link href="/signup" className="bg-gray-900 text-white px-7 py-3 rounded-full text-sm font-medium hover:bg-gray-700 transition-all">
                Get Started
              </Link>
              <Link href="/login" className="border border-gray-300 text-gray-800 px-7 py-3 rounded-full text-sm font-medium hover:border-gray-500 transition-all bg-white">
                Login
              </Link>
            </div>
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
                <BorderGlow
                  key={feature.title}
                  glowColor="teal"
                  borderRadius="16px"
                  className="reveal"
                >
                  <div className="group p-6 rounded-2xl bg-white h-full transition-all">
                    <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-4 group-hover:bg-teal-700 group-hover:text-white transition-colors">
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">{feature.title}</h3>
                    <p className="text-neutral-600 leading-relaxed">{feature.description}</p>
                  </div>
                </BorderGlow>
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
                <Antigravity key={step.number} className="reveal">
                  <div className="text-center p-6">
                    <div className="text-5xl font-bold text-neutral-200 mb-4">{step.number}</div>
                    <h3 className="text-xl font-semibold text-neutral-900 mb-3">{step.title}</h3>
                    <p className="text-neutral-600 leading-relaxed">{step.description}</p>
                  </div>
                </Antigravity>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-24 bg-gradient-to-b from-[#f0f9f4] to-[#e8f4fd]">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4 reveal">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="space-y-4">
              {[
                {
                  q: 'Is FinFlow free to use?',
                  a: 'Yes, FinFlow is completely free. Sign up and start tracking your expenses immediately with no hidden charges.',
                },
                {
                  q: 'Which languages does FinFlow support?',
                  a: 'FinFlow supports multiple Indian languages. You can speak your transactions naturally and FinFlow will understand your language and accent.',
                },
                {
                  q: 'Is my financial data secure?',
                  a: 'Absolutely. Your data is encrypted and stored in a secured database with industry-standard protection at all times.',
                },
                {
                  q: 'How do I add a transaction?',
                  a: 'You can add transactions by speaking naturally, scanning a receipt with your camera, or typing it manually — whichever is most convenient.',
                },
                {
                  q: 'Who made FinFlow?',
                  a: 'FinFlow is built by Sadab Munshi, designed to make personal finance effortless for everyone.',
                },
              ].map((item, i) => (
                <details
                  key={i}
                  className="group border border-neutral-200 rounded-2xl bg-white overflow-hidden reveal"
                >
                  <summary className="flex items-center justify-between px-6 py-4 font-semibold text-neutral-900 cursor-pointer list-none select-none hover:bg-neutral-50 transition-colors">
                    {item.q}
                    <span className="text-teal-600 text-xl group-open:rotate-45 transition-transform duration-200">+</span>
                  </summary>
                  <p className="px-6 pb-5 text-neutral-600 text-sm leading-relaxed border-t border-neutral-100 pt-3">
                    {item.a}
                  </p>
                </details>
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
