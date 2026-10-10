'use client'

import { useEffect, useState } from 'react'
import { Loader2, User as UserIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { authWelcomeEmail } from '@/lib/api-client'
import toast from 'react-hot-toast'
import { track } from '@/lib/posthog'

function nameFromEmail(email: string): string {
  const local = email.split('@')[0] || ''
  return local
    .replace(/[^a-zA-Z]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * First-sign-in name popup (mounted globally in the root layout). Appears on
 * the dashboard right after a new user confirms their email — and catches
 * social signups too, since OAuth keeps the same dashboard path. Users who
 * already have a display name (e.g. provider-supplied full_name) never see it.
 * The welcome email is sent HERE, once the name exists (audiovisual aside:
 * previously it fired on first login with a raw-email greeting).
 */
export default function OnboardingModal() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user
      if (!user) return

      // Gate on `welcome_email_sent`, NOT on name presence: social signups get
      // a full_name from the provider, but they still must pass through this
      // step (it is what triggers the welcome email). New social signups have
      // no settings row at all → row missing ⇒ flag false ⇒ modal shows,
      // prefilled with the provider name. Users welcomed by the old first-login
      // flow have flag=true and never see this.
      let name = (user.user_metadata?.full_name as string | undefined)?.trim() || ''
      let welcomed = true
      try {
        const { data: settingsData } = await supabase
          .from('settings')
          .select('name, welcome_email_sent')
          .eq('user_id', user.id)
          .maybeSingle()
        welcomed = !!settingsData?.welcome_email_sent
        if (!welcomed) {
          name = name || ((settingsData?.name as string | null) || '').trim()
        }
      } catch {
        welcomed = false
      }
      if (welcomed) return
      if (!name) name = nameFromEmail(user.email || '')

      setUserId(user.id)
      setEmail(user.email || '')
      setName(name)
      setOpen(true)
    })
  }, [])

  const onSave = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      toast.error('Name must be at least 2 characters')
      return
    }
    setSaving(true)
    const supabase = createClient()
    try {
      await supabase.auth.updateUser({ data: { full_name: trimmed } })
      await supabase
        .from('settings')
        .upsert({ user_id: userId, name: trimmed, welcome_email_sent: true }, { onConflict: 'user_id' })
      // Welcome email now that the greeting has a real name in it.
      if (email) {
        authWelcomeEmail(trimmed, email).catch(() => {})
      }
      track('onboarding_completed', { skipped: false })
      toast.success(`Welcome, ${trimmed.split(' ')[0]}!`)
      setOpen(false)
    } catch {
      toast.error('Could not save right now — you can set your name later in your profile.')
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 px-5 backdrop-blur-sm">
      <div className="auth-fade-up w-full max-w-[416px]">
        <div className="mb-7 text-center">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-200">Almost there</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl">What should we call you?</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">Just your name — it personalizes your reports and greetings.</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(2,6,23,0.35)] sm:p-7">
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

        </div>
      </div>
    </div>
  )
}
