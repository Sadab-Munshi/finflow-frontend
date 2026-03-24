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
} from 'lucide-react'

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  const [headerVisible, setHeaderVisible] = useState(true)
  const [lastScrollY,   setLastScrollY]   = useState(0)
  const [menuOpen,      setMenuOpen]      = useState(false)
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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#f0f9f4] to-[#e8f4fd]">

      {/* ── HEADER ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-2.5
          bg-white/85 backdrop-blur-md border-b border-gray-100 shadow-sm
          transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        {/* Logo — square icon only */}
        <Link href="/" className="flex items-center shrink-0" aria-label="FinFlow home">
          <Image
            src="/finflow-logo.png"
            alt="FinFlow"
            width={978}
            height={310}
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>

        {/* Hamburger menu toggle */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="Open menu"
            className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200
              ${menuOpen
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:text-gray-900'
              }`}
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          {/* ── DROPDOWN PANEL ── */}
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-3 w-56 bg-white rounded-2xl shadow-2xl
                border border-gray-100 overflow-hidden z-50"
            >
              {/* Account */}
              <div className="px-4 pt-4 pb-2">
                <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
                  Account
                </p>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-600
                    hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <LogIn size={15} className="text-gray-400" />
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-600
                    hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <UserPlus size={15} className="text-gray-400" />
                  Sign Up
                </Link>
              </div>

              <div className="h-px bg-gray-100 mx-4 my-2" />

              {/* Info / Legal */}
              <div className="px-4 pb-4">
                <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
                  Info
                </p>
                {[
                  { href: '/support',    label: 'Support',    Icon: HelpCircle  },
                  { href: '/privacy',    label: 'Privacy',    Icon: ShieldCheck },
                  { href: '/terms',      label: 'Terms',      Icon: FileText    },
                  { href: '/disclaimer', label: 'Disclaimer', Icon: AlertCircle },
                ].map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-600
                      hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    <Icon size={15} className="text-gray-400" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── PAGE CONTENT ── */}
      <main className="flex-1 pt-14">{children}</main>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-950 text-gray-400 pt-16 pb-8 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-10 mb-12">
            <div>
              <p className="text-white font-semibold text-sm mb-4">Navigate</p>
              <ul className="space-y-3 text-sm">
                <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
                <li><a href="/support" className="hover:text-white transition-colors">Support</a></li>
                <li><a href="https://sadabmunshi.online/blog/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-4">Legal</p>
              <ul className="space-y-3 text-sm">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/disclaimer" className="hover:text-white transition-colors">Disclaimer</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-sm text-gray-500">
            © 2026 FinFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
