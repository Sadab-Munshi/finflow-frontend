import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, CircleHelp, ShieldCheck } from 'lucide-react'
import AuthBrandPanel from './AuthBrandPanel'

type AuthMode = 'login' | 'signup'

interface AuthShellProps {
  mode: AuthMode
  children: ReactNode
}

const copy = {
  login: {
    eyebrow: 'Welcome back',
    heading: 'Sign in to FinFlow',
    subtitle: 'Your dashboard, budgets, and spending history are ready when you are.',
  },
  signup: {
    eyebrow: '',
    heading: 'Create your account',
    subtitle: 'Set up your personal finance workspace in just a few calm minutes.',
  },
}

function LogoMark() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-teal-300 shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 17 Q8 7 12 12 Q16 17 21 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      </svg>
    </span>
  )
}

export default function AuthShell({ mode, children }: AuthShellProps) {
  const activeCopy = copy[mode]

  return (
    <main className="min-h-[100dvh] bg-slate-50 text-slate-950 lg:grid lg:grid-cols-[48%_52%]">
      <AuthBrandPanel mode={mode} />

      <section className="auth-dot-grid relative flex min-h-[100dvh] flex-col overflow-hidden px-5 py-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 lg:hidden" aria-hidden="true">
          <div className="absolute -top-24 left-4 h-56 w-56 rounded-full bg-teal-200/50 blur-3xl" />
          <div className="absolute -top-16 right-2 h-52 w-52 rounded-full bg-violet-200/40 blur-3xl" />
        </div>

        <header className="relative z-10 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-full text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to site</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <Link
            href="/support"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/75 px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur transition-all hover:border-teal-200 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
          >
            <CircleHelp className="h-4 w-4" />
            <span className="hidden sm:inline">Need help?</span>
          </Link>
        </header>

        <div className="relative z-10 flex flex-1 items-center justify-center py-10 sm:py-12 lg:py-8">
          <div className="w-full max-w-[416px]">
            <div className="auth-fade-up mb-7 hidden items-center gap-3 lg:flex">
              <LogoMark />
              <span className="text-xl font-black tracking-[-0.04em] text-slate-950">FinFlow</span>
            </div>

            <div className="auth-fade-up mb-8" style={{ animationDelay: '40ms' }}>
              {activeCopy.eyebrow && (
                <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-600">{activeCopy.eyebrow}</p>
              )}
              <h1 className={`${activeCopy.eyebrow ? 'mt-3' : ''} text-4xl font-black tracking-[-0.07em] text-slate-950 sm:text-5xl`}>
                {activeCopy.heading}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">{activeCopy.subtitle}</p>
            </div>

            {children}
          </div>
        </div>

        <footer className="relative z-10 flex flex-col gap-3 border-t border-slate-200/70 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>© 2026 FinFlow</span>
            <Link href="/privacy" className="font-semibold hover:text-slate-900">Privacy</Link>
            <Link href="/terms" className="font-semibold hover:text-slate-900">Terms</Link>
          </div>
          <div className="inline-flex items-center gap-2 font-semibold text-slate-600">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />
            </span>
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            All systems normal
          </div>
        </footer>
      </section>
    </main>
  )
}
