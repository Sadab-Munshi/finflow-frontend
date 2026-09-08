import { Activity, CheckCircle2, LockKeyhole, Quote, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'

type AuthMode = 'login' | 'signup'

interface AuthBrandPanelProps {
  mode: AuthMode
}

const copy = {
  login: {
    badge: 'Your money story is waiting',
    heading: 'Return to calm, confident spending.',
    highlight: 'spending.',
    body: 'Pick up exactly where you left off with budgets, trends, and every rupee neatly organized.',
  },
  signup: {
    badge: '',
    heading: 'Know where your money goes in minutes.',
    highlight: 'minutes.',
    body: 'Start with a clean dashboard, smart categories, and a calmer way to understand daily expenses.',
  },
}

const bars = [42, 68, 50, 78, 62, 88, 72]

export default function AuthBrandPanel({ mode }: AuthBrandPanelProps) {
  const activeCopy = copy[mode]
  const headingPrefix = activeCopy.heading.replace(activeCopy.highlight, '')

  return (
    <aside className="relative hidden min-h-[100dvh] overflow-hidden bg-[#071112] px-10 py-10 text-white lg:flex xl:px-14">
      <div className="auth-blob auth-blob-one" />
      <div className="auth-blob auth-blob-two" />
      <div className="auth-blob auth-blob-three" />
      <div className="auth-grain" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,18,0.42),rgba(7,17,18,0.92)),linear-gradient(135deg,rgba(20,184,166,0.08),transparent_48%,rgba(124,58,237,0.08))]" />

      <div className="relative z-10 flex w-full flex-col">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-300/25 bg-teal-300/10 shadow-[0_0_35px_rgba(45,212,191,0.18)] transition-transform duration-300 hover:rotate-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 17 Q8 7 12 12 Q16 17 21 7" stroke="#5eead4" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          <span className="text-xl font-black tracking-[-0.04em]">FinFlow</span>
        </div>

        <div className="my-auto max-w-xl py-12">
          {activeCopy.badge && (
            <div className="auth-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-teal-100 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-teal-300" />
              {activeCopy.badge}
            </div>
          )}

          <h2 className={`${activeCopy.badge ? 'mt-7' : 'mt-0'} auth-fade-up text-5xl font-black leading-[0.96] tracking-[-0.08em] xl:text-6xl`} style={{ animationDelay: '70ms' }}>
            {headingPrefix}
            <span className="block bg-gradient-to-r from-teal-200 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
              {activeCopy.highlight}
            </span>
          </h2>

          <p className="auth-fade-up mt-6 max-w-lg text-base leading-7 text-white/70" style={{ animationDelay: '120ms' }}>
            {activeCopy.body}
          </p>

          <div className="auth-fade-up mt-10 hidden max-w-md xl:block" style={{ animationDelay: '170ms' }}>
            <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Safe to spend</p>
                  <p className="mt-2 text-4xl font-black tracking-[-0.06em]">₹18,420</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-teal-300/20 bg-teal-300/10 px-2.5 py-1 text-xs font-bold text-teal-200">
                  <TrendingUp className="h-3.5 w-3.5" />
                  12%
                </span>
              </div>

              <div className="mt-7 flex h-28 items-end gap-2 rounded-3xl bg-black/20 p-4">
                {bars.map((height, index) => (
                  <div key={height} className="flex flex-1 items-end">
                    <div
                      className="auth-bar-rise w-full rounded-t-xl bg-gradient-to-t from-teal-500 to-teal-200"
                      style={{ height: `${height}%`, animationDelay: `${index * 80}ms` }}
                    />
                  </div>
                ))}
              </div>

              <div className="absolute -right-8 bottom-7 max-w-[210px] rounded-3xl border border-white/10 bg-white/90 p-4 text-slate-900 shadow-2xl backdrop-blur">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Auto-categorized</p>
                    <p className="text-[11px] text-slate-500">Coffee · Food</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/60">
            <ShieldCheck className="h-4 w-4 text-teal-300" />
            Bank-grade encryption
            <span className="h-1 w-1 rounded-full bg-white/30" />
            Read-only insights
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
            <Quote className="h-5 w-5 text-teal-300" />
            <p className="mt-4 text-sm leading-6 text-white/75">
              FinFlow made my daily spending obvious without making finance feel heavy.
            </p>
            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-300 to-violet-300 text-sm font-black text-slate-950">
                  AM
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Aarav Mehta</p>
                  <p className="text-xs text-white/50">Product designer · Mumbai</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="h-2 w-6 rounded-full bg-teal-300" />
                <span className="h-2 w-2 rounded-full bg-white/25" />
                <span className="h-2 w-2 rounded-full bg-white/25" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-white/60">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-300" />
              Secure auth
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5">
              <LockKeyhole className="h-3.5 w-3.5 text-teal-300" />
              Private by design
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
