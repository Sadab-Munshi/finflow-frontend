'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Menu,
  X,
  LogIn,
  UserPlus,
  HelpCircle,
  FileText,
  ShieldCheck,
  AlertCircle,
  BookOpen,
  ArrowRight,
} from 'lucide-react'

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  const [headerVisible, setHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  /* ── hide header on scroll down ── */
  useEffect(() => {
    const onScroll = () => {
      const cur = window.scrollY
      setHeaderVisible(cur < lastScrollY || cur < 60)
      setLastScrollY(cur)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [lastScrollY])

  /* ── close menu on outside click ── */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  /* ── close menu on Escape ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 selection:bg-teal-600 selection:text-white">
      {/* ── HEADER ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 border-b border-stone-200/80 bg-[#FAF8F5]/90 backdrop-blur-md transition-transform duration-300 ${
          headerVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0" aria-label="FinFlow home">
            <Image
              src="/finflow-logo.png"
              alt="FinFlow"
              width={160}
              height={51}
              sizes="160px"
              quality={80}
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Quick Actions + Hamburger Menu */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/user-guide"
              className="hidden md:inline-flex items-center px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-950 transition-colors"
            >
              User Guide
            </Link>
            <Link
              href="/support"
              className="hidden md:inline-flex items-center px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-950 transition-colors"
            >
              Support
            </Link>
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold text-stone-800 border border-stone-300/90 bg-white/80 hover:border-teal-700 hover:text-teal-800 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-stone-900 text-white hover:bg-teal-800 transition-colors shadow-xs"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Hamburger menu toggle */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-label="Open menu"
                className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 ${
                  menuOpen
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400 hover:text-stone-950'
                }`}
              >
                {menuOpen ? <X size={16} /> : <Menu size={16} />}
              </button>

              {/* ── DROPDOWN PANEL ── */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-stone-200/90 overflow-hidden z-50">
                  {/* Account */}
                  <div className="px-4 pt-4 pb-2">
                    <p className="text-[10px] font-mono font-semibold tracking-widest text-stone-400 uppercase mb-2">
                      Account
                    </p>
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition-colors"
                    >
                      <LogIn size={15} className="text-stone-400" />
                      Login
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition-colors"
                    >
                      <UserPlus size={15} className="text-stone-400" />
                      Sign Up
                    </Link>
                  </div>

                  <div className="h-px bg-stone-100 mx-4 my-2" />

                  {/* Info / Legal */}
                  <div className="px-4 pb-4">
                    <p className="text-[10px] font-mono font-semibold tracking-widest text-stone-400 uppercase mb-2">
                      Resources & Legal
                    </p>
                    {[
                      { href: '/support', label: 'Support', Icon: HelpCircle },
                      { href: '/user-guide', label: 'User Guide', Icon: BookOpen },
                      { href: '/privacy', label: 'Privacy', Icon: ShieldCheck },
                      { href: '/terms', label: 'Terms', Icon: FileText },
                      { href: '/disclaimer', label: 'Disclaimer', Icon: AlertCircle },
                    ].map(({ href, label, Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition-colors"
                      >
                        <Icon size={15} className="text-stone-400" />
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── PAGE CONTENT ── */}
      <main className="flex-1 pt-14">{children}</main>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0C1116] text-zinc-300 pt-16 pb-10 px-6 border-t border-zinc-800/80">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
            <div className="md:col-span-6 space-y-3">
              <Image
                src="/finflow-logo.png"
                alt="FinFlow"
                width={150}
                height={48}
                sizes="150px"
                className="h-8 w-auto object-contain brightness-110"
              />
              <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
                Personal financial clarity built for Indian households and creators. Log every rupee by voice, receipt photo, or Telegram in English, Hindi, and Bengali.
              </p>
              <p className="text-xs font-mono uppercase tracking-wider text-teal-400/90 pt-1">
                AES-256 Encrypted · Cloud Ledger · Built in India
              </p>
            </div>

            <div className="md:col-span-3">
              <p className="text-white font-semibold text-xs font-mono uppercase tracking-wider mb-4">
                Navigate
              </p>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link href="/support" className="inline-flex items-center min-h-[40px] text-zinc-400 hover:text-white transition-colors">
                    Support
                  </Link>
                </li>
                <li>
                  <Link href="/user-guide" className="inline-flex items-center min-h-[40px] text-zinc-400 hover:text-white transition-colors">
                    User Guide
                  </Link>
                </li>
                <li>
                  <a
                    href="https://status.app.sadabmunshi.me"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center min-h-[40px] text-zinc-400 hover:text-white transition-colors"
                  >
                    System Status
                  </a>
                </li>
                <li>
                  <a
                    href="https://sadabmunshi.me/blog/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center min-h-[40px] text-zinc-400 hover:text-white transition-colors"
                  >
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3">
              <p className="text-white font-semibold text-xs font-mono uppercase tracking-wider mb-4">
                Legal
              </p>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link href="/privacy" className="inline-flex items-center min-h-[40px] text-zinc-400 hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="inline-flex items-center min-h-[40px] text-zinc-400 hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/disclaimer" className="inline-flex items-center min-h-[40px] text-zinc-400 hover:text-white transition-colors">
                    Disclaimer
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-zinc-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <span>© 2026 Sadab Munshi. All rights reserved.</span>
            <span className="font-mono">English · हिंदी · বাংলা</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
