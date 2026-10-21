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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 selection:bg-teal-600 selection:text-white">
      {/* ── HEADER ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-md transition-transform duration-300 ${
          headerVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2.5">
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

          {/* Hamburger menu toggle (clean header without redundant CTA button) */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="Open menu"
              className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 ${
                menuOpen
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:text-slate-950'
              }`}
            >
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>

            {/* ── DROPDOWN PANEL ── */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase mb-2">
                    Account
                  </p>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition-colors"
                  >
                    <LogIn size={15} className="text-slate-400" />
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition-colors"
                  >
                    <UserPlus size={15} className="text-slate-400" />
                    Sign Up
                  </Link>
                </div>

                <div className="h-px bg-slate-100 mx-4 my-2" />

                <div className="px-4 pb-4">
                  <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase mb-2">
                    Info
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
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition-colors"
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
      </nav>

      {/* ── PAGE CONTENT ── */}
      <main className="flex-1 pt-14">{children}</main>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0B132B] text-slate-300 pt-14 pb-8 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mb-10">
            <div className="col-span-2 sm:col-span-1 space-y-3">
              <Image
                src="/finflow-logo.png"
                alt="FinFlow"
                width={140}
                height={44}
                sizes="140px"
                className="h-7 w-auto object-contain brightness-110"
              />
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xs">
                Smart rupee tracking by voice, camera, and Telegram. Encrypted and built for India.
              </p>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-3">Navigate</p>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link href="/support" className="inline-flex items-center min-h-[40px] text-slate-400 hover:text-white transition-colors">
                    Support
                  </Link>
                </li>
                <li>
                  <Link href="/user-guide" className="inline-flex items-center min-h-[40px] text-slate-400 hover:text-white transition-colors">
                    User Guide
                  </Link>
                </li>
                <li>
                  <a href="https://status.app.sadabmunshi.me" target="_blank" rel="noreferrer" className="inline-flex items-center min-h-[40px] text-slate-400 hover:text-white transition-colors">
                    System Status
                  </a>
                </li>
                <li>
                  <a href="https://sadabmunshi.me/blog/" target="_blank" rel="noreferrer" className="inline-flex items-center min-h-[40px] text-slate-400 hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-3">Legal</p>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link href="/privacy" className="inline-flex items-center min-h-[40px] text-slate-400 hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="inline-flex items-center min-h-[40px] text-slate-400 hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/disclaimer" className="inline-flex items-center min-h-[40px] text-slate-400 hover:text-white transition-colors">
                    Disclaimer
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© 2026 Sadab Munshi. All rights reserved.</span>
            <span className="font-mono text-teal-400">AES-256 Encrypted · English · हिंदी · বাংলা</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
