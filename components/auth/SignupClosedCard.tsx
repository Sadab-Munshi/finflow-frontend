'use client'

import { useState, type FormEvent } from 'react'
import { Mail, MailCheck, Sparkles } from 'lucide-react'
import { authWaitlistJoin } from '@/lib/api-client'
import toast from 'react-hot-toast'

export type SignupBlockKind = 'closed' | 'invite_only' | 'capacity'

const copy: Record<SignupBlockKind, { badge: string; heading: string; body: string; reason: 'closed' | 'invite_only' | 'capacity' }> = {
  closed: {
    badge: 'Coming back soon',
    heading: 'Registrations are temporarily closed',
    body: 'We\u2019re polishing a few things. Leave your email and we\u2019ll let you know the moment signups reopen.',
    reason: 'closed',
  },
  invite_only: {
    badge: 'Invite-only right now',
    heading: 'We\u2019re inviting users gradually',
    body: 'FinFlow opens in small batches so everything stays calm and reliable. Drop your email and you\u2019ll hear from us when your invite is ready.',
    reason: 'invite_only',
  },
  capacity: {
    badge: 'Full for now',
    heading: 'We\u2019ve reached today\u2019s capacity',
    body: 'Spots open up regularly. Leave your email and we\u2019ll notify you as soon as there\u2019s room.',
    reason: 'capacity',
  },
}

/**
 * Replaces the signup form entirely when registrations are blocked at the
 * platform level (closed / invite-only / capacity reached). An active form
 * should never show a "you can't use this" warning — this IS the page.
 */
export default function SignupClosedCard({ kind }: { kind: SignupBlockKind }) {
  const active = copy[kind]
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = email.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(trimmed)) {
      toast.error('Please enter a valid email address')
      return
    }
    setState('loading')
    const result = await authWaitlistJoin(trimmed, active.reason)
    if (result.success) {
      setState('done')
    } else {
      setState('idle')
      toast.error(result.error || 'Could not join the waitlist')
    }
  }

  return (
    <div className="auth-fade-up" style={{ animationDelay: '90ms' }}>
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-9">
        <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700">
          <Sparkles className="h-3.5 w-3.5" />
          {active.badge}
        </span>

        <h2 className="mt-5 text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">
          {active.heading}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">{active.body}</p>

        {state === 'done' ? (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white">
              <MailCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-teal-800">You&apos;re on the list</p>
              <p className="text-xs text-teal-700/80">We&apos;ll email you when signups open.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <button
              type="submit"
              disabled={state === 'loading'}
              className="rounded-full bg-slate-950 px-6 py-3.5 text-sm font-black text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
            >
              {state === 'loading' ? 'Saving…' : 'Notify me'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
