'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Menu,
  X,
  HelpCircle,
  FileText,
  ShieldCheck,
  AlertCircle,
  BookOpen,
  Sparkles,
  Layers,
  Cookie,
} from 'lucide-react'

const DESKTOP_NAV_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/user-guide', label: 'User Guide' },
  { href: '/support', label: 'About Us' },
]

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 selection:bg-teal-600 selection:text-white">
      {/* ── HEADER (Static instant visibility, zero scroll listeners) ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/75 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto w-full h-[68px] flex items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center shrink-0 min-h-[48px]" aria-label="FinFlow home">
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

          {/* ── DESKTOP / TABLET HORIZONTAL NAVIGATION (replaces mobile hamburger) ── */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-5 lg:gap-8"
          >
            {DESKTOP_NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center min-h-[48px] text-sm font-medium text-slate-600 hover:text-teal-700 transition-colors whitespace-nowrap"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* ── DESKTOP / TABLET ANCHORED SECONDARY + PRIMARY ACTIONS ── */}
          <div className="hidden md:flex items-center gap-4 lg:gap-5 shrink-0">
            <Link
              href="/login"
              className="inline-flex items-center justify-center min-h-[48px] px-3 bg-transparent border-0 shadow-none text-sm font-semibold text-slate-600 hover:text-teal-700 transition-colors whitespace-nowrap"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="hidden lg:inline-flex items-center justify-center h-12 px-6 rounded-full bg-gradient-to-b from-[#14B8A6] via-[#0D9488] to-[#0F766E] text-white text-sm font-semibold whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_20px_-4px_rgba(13,148,136,0.42),0_2px_6px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_14px_28px_-4px_rgba(20,184,166,0.55),0_4px_10px_rgba(15,23,42,0.12)] active:translate-y-0 transition-all duration-200"
            >
              Start Tracking
            </Link>
          </div>

          {/* ── MOBILE RIGHT CONTROLS: Low-profile Login + 48x48 Hamburger Menu Toggle ── */}
          <div ref={menuRef} className="flex md:hidden items-center gap-2 relative">
            <Link
              href="/login"
              className="inline-flex items-center justify-center min-h-[48px] px-3 bg-transparent border-0 shadow-none text-sm font-semibold text-slate-600 hover:text-teal-700 transition-colors"
            >
              Login
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="Open menu"
              className={`flex items-center justify-center w-12 h-12 rounded-full border transition-all duration-200 ${
                menuOpen
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:text-slate-950'
              }`}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* ── MOBILE DROPDOWN PANEL ── */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                <div className="px-3 pt-3 pb-2">
                  <p className="px-3 text-[10px] font-semibold tracking-widest text-slate-400 uppercase mb-1">
                    Explore
                  </p>
                  <Link
                    href="/#features"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 min-h-[48px] rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition-colors"
                  >
                    <Sparkles size={15} className="text-teal-600" />
                    Features
                  </Link>
                  <Link
                    href="/#how-it-works"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 min-h-[48px] rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition-colors"
                  >
                    <Layers size={15} className="text-teal-600" />
                    How It Works
                  </Link>
                </div>

                <div className="h-px bg-slate-100 mx-4 my-1" />

                <div className="px-3 pb-3">
                  <p className="px-3 pt-1 text-[10px] font-semibold tracking-widest text-slate-400 uppercase mb-1">
                    Resources
                  </p>
                  {[
                    { href: '/user-guide', label: 'User Guide', Icon: BookOpen },
                    { href: '/support', label: 'About Us & Support', Icon: HelpCircle },
                    { href: '/privacy', label: 'Privacy Policy', Icon: ShieldCheck },
                    { href: '/terms', label: 'Terms of Service', Icon: FileText },
                    { href: '/cookies', label: 'Cookie Policy', Icon: Cookie },
                    { href: '/disclaimer', label: 'Disclaimer', Icon: AlertCircle },
                  ].map(({ href, label, Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 min-h-[48px] rounded-xl text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition-colors"
                    >
                      <Icon size={15} className="text-slate-400" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── PAGE CONTENT ── */}
      <main className="flex-1 pt-[68px]">{children}</main>

      {/* ── CLEAN LIGHT FOOTER (Aligned to site's light off-white aesthetic & max-w-7xl container) ── */}
      <footer id="about" className="bg-[#F8FAFC] text-slate-600 pt-14 pb-8 border-t border-slate-200/90">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-8 mb-10">
            <div className="col-span-2 md:col-span-6 space-y-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 min-h-[48px] sm:min-h-[40px] group"
                aria-label="FinFlow home"
              >
                <Image
                  src="/android-chrome-192x192.png"
                  alt="FinFlow mark"
                  width={36}
                  height={36}
                  sizes="36px"
                  className="h-8 w-8 object-contain shrink-0"
                />
                <span className="text-xl font-extrabold tracking-tight text-slate-950">
                  FinFlow
                </span>
              </Link>
              <p className="text-sm text-slate-600 leading-relaxed">
                Smart expense tracking built for effortless daily finances.
              </p>
            </div>

            <div className="col-span-1 md:col-span-3">
              <p className="text-slate-900 font-semibold text-sm mb-3">Navigate</p>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link
                    href="/support"
                    className="inline-flex items-center min-h-[48px] sm:min-h-[40px] text-slate-600 hover:text-teal-700 transition-colors"
                  >
                    About Us &amp; Support
                  </Link>
                </li>
                <li>
                  <Link
                    href="/user-guide"
                    className="inline-flex items-center min-h-[48px] sm:min-h-[40px] text-slate-600 hover:text-teal-700 transition-colors"
                  >
                    User Guide
                  </Link>
                </li>
                <li>
                  <a
                    href="https://status.app.sadabmunshi.me"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center min-h-[48px] sm:min-h-[40px] text-slate-600 hover:text-teal-700 transition-colors"
                  >
                    System Status
                  </a>
                </li>
                <li>
                  <a
                    href="https://sadabmunshi.me/blog/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center min-h-[48px] sm:min-h-[40px] text-slate-600 hover:text-teal-700 transition-colors"
                  >
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            <div className="col-span-1 md:col-span-3">
              <p className="text-slate-900 font-semibold text-sm mb-3">Legal</p>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link
                    href="/privacy"
                    className="inline-flex items-center min-h-[48px] sm:min-h-[40px] text-slate-600 hover:text-teal-700 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="inline-flex items-center min-h-[48px] sm:min-h-[40px] text-slate-600 hover:text-teal-700 transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cookies"
                    className="inline-flex items-center min-h-[48px] sm:min-h-[40px] text-slate-600 hover:text-teal-700 transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/disclaimer"
                    className="inline-flex items-center min-h-[48px] sm:min-h-[40px] text-slate-600 hover:text-teal-700 transition-colors"
                  >
                    Disclaimer
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200/80 pt-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© 2026 Sadab Munshi. All rights reserved.</span>
            <span className="font-mono font-medium text-teal-700">
              AES-256 Encrypted · English · हिंदी · বাংলা
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
