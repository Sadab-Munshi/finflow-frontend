import type { ReactNode } from 'react'
import Link from 'next/link'
import { CircleHelp, Home, ShieldCheck } from 'lucide-react'

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

// Single-column centered auth layout (post-overhaul): the heavy dark split
// hero panel was removed for the "calm brand" direction — soft backdrop
// blobs, logo neatly above the title, form is the primary focus.
export default function AuthShell({ mode, children }: AuthShellProps) {
  const activeCopy = copy[mode]

  return (
    <main className="auth-dot-grid relative flex min-h-[100dvh] flex-col overflow-hidden bg-slate-50 px-5 py-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-slate-950 sm:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden="true">
        <div className="absolute -top-24 left-[12%] h-56 w-56 rounded-full bg-teal-200/50 blur-3xl" />
        <div className="absolute -top-16 right-[8%] h-52 w-52 rounded-full bg-violet-200/40 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-[416px] items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Back to home"
          title="Back to home"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/75 text-slate-600 shadow-sm backdrop-blur transition-all hover:border-teal-200 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
        >
          <Home className="h-4 w-4" />
        </Link>

        <Link
          href="/support"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/75 px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur transition-all hover:border-teal-200 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
        >
          <CircleHelp className="h-4 w-4" />
          <span className="hidden sm:inline">Need help?</span>
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center py-8 sm:py-12 lg:py-14">
        <div className="w-full max-w-[416px]">
          <div className="auth-fade-up mb-7 text-center">
            {activeCopy.eyebrow && (
              <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-600">{activeCopy.eyebrow}</p>
            )}
            <h1 className={`${activeCopy.eyebrow ? 'mt-3' : ''} text-[clamp(1.9rem,3vw+1.2rem,2.5rem)] font-black tracking-[-0.06em] text-slate-950`}>
              {activeCopy.heading}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">{activeCopy.subtitle}</p>
          </div>

          {children}
        </div>
      </div>

      <footer className="relative z-10 flex flex-col gap-3 border-t border-slate-200/70 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:justify-start">
          <span>© 2026 FinFlow</span>
          <Link href="/privacy" className="font-semibold hover:text-slate-900">Privacy</Link>
          <Link href="/terms" className="font-semibold hover:text-slate-900">Terms</Link>
        </div>
        <div className="inline-flex items-center justify-center gap-2 font-semibold text-slate-600">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />
          </span>
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
          All systems normal
        </div>
      </footer>
    </main>
  )
}
