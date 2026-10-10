'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, User as UserIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { track } from '@/lib/posthog'

// Prefill helper: derive a display name from the email local-part.
// jane.doe@… → "Jane Doe", john123@… → "John".
function nameFromEmail(email: string): string {
  const local = email.split('@')[0] || ''
  return local
    .replace(/[^a-zA-Z]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Post-verification onboarding: where new users land right after clicking
 * the confirmation link (/auth/callback?type=signup → here, session kept).
 * One field (name) + Skip. Users who already have a display name (e.g. OAuth
 * providers set full_name) are sent straight to the dashboard.
 */
export default function OnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user
      if (!user) {
        router.replace('/login')
        return
      }
      const existingName = (user.user_metadata?.full_name as string | undefined)?.trim() || await getSettingsName(supabase, user.id)
      if (existingName) {
        router.replace('/dashboard')
        return
      }
      setName(nameFromEmail(user.email || ''))
      setLoading(false)
    })
  }, [router])

  async function getSettingsName(supabase: ReturnType<typeof createClient>, userId: string): Promise<string> {
    try {
      const { data } = await supabase
        .from('settings')
        .select('name')
        .eq('user_id', userId)
        .maybeSingle()
      return (data?.name as string | null) || ''
    } catch {
      return ''
    }
  }

  const onSave = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      toast.error('Name must be at least 2 characters')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user) {
      router.replace('/login')
      return
    }
    try {
      await supabase.auth.updateUser({ data: { full_name: trimmed } })
      await supabase.from('settings').upsert({ user_id: user.id, name: trimmed }, { onConflict: 'user_id' })
      track('onboarding_completed', { skipped: false })
      toast.success(`Welcome, ${trimmed.split(' ')[0]}!`)
      router.replace('/dashboard')
    } catch {
      toast.error('Could not save right now — you can set your name later in your profile.')
      router.replace('/dashboard')
    } finally {
      setSaving(false)
    }
  }

  const onSkip = () => {
    track('onboarding_completed', { skipped: true })
    router.replace('/dashboard')
  }

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </main>
    )
  }

  return (
    <main className="auth-dot-grid relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-50 px-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden="true">
        <div className="absolute -top-24 left-[12%] h-56 w-56 rounded-full bg-teal-200/50 blur-3xl" />
        <div className="absolute -top-16 right-[8%] h-52 w-52 rounded-full bg-violet-200/40 blur-3xl" />
      </div>

      <div className="auth-fade-up relative z-10 w-full max-w-[416px]">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-teal-300 shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 17 Q8 7 12 12 Q16 17 21 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            </svg>
          </span>
          <span className="text-xl font-black tracking-[-0.04em] text-slate-950">FinFlow</span>
        </div>

        <div className="mb-7 text-center">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-600">Almost there</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.07em] text-slate-950 sm:text-5xl">What should we call you?</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">Just your name — it personalizes your reports and greetings. One step and you&apos;re in.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-7">
          <label className="mb-1.5 block text-sm font-bold text-slate-700" htmlFor="onboarding-name">Name</label>
          <div className="relative">
            <UserIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="onboarding-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              autoComplete="name"
              autoFocus
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : 'Continue'}
          </button>

          <button
            type="button"
            onClick={onSkip}
            disabled={saving}
            className="mt-3 block w-full text-center text-sm font-semibold text-slate-400 underline decoration-slate-200 underline-offset-4 transition-colors hover:text-slate-600"
          >
            Skip for now
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          You can change this anytime in{' '}
          <Link href="/profile" className="font-semibold text-slate-500 underline underline-offset-2 hover:text-teal-700">your profile</Link>.
        </p>
      </div>
    </main>
  )
}
