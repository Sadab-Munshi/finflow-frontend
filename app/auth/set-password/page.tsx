'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
import { createClient } from '@/lib/supabase/client'

// Final step of the admin waitlist invite flow (see app/auth/complete):
//   invite email → GoTrue /verify (account created) → /auth/complete
//   (session restored from fragment tokens) → /auth/set-password
//
// auth.admin.inviteUserByEmail creates the account WITHOUT a password, and
// this app is password-based — so this screen is mandatory for invited
// users. Set the password, keep the session, land on the dashboard.
export default function SetPasswordPage() {
  const router = useRouter()
  const [state, setState] = useState<'checking' | 'ready' | 'no-session' | 'done'>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(session ? 'ready' : 'no-session')
    })
  }, [])

  const valid = password.length >= 8 && password === confirm

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error: updErr } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setState('done')
    router.replace('/dashboard')
  }

  return (
    <AuthShell mode="set-password">
      {state === 'checking' && (
        <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-teal-600 border-t-transparent" />
          <p className="text-sm text-slate-600">Checking your session…</p>
        </div>
      )}

      {state === 'no-session' && (
        <div className="rounded-2xl border border-rose-200 bg-white/80 p-6 text-center shadow-sm backdrop-blur">
          <p className="text-sm font-semibold text-rose-600">Your invite link has expired</p>
          <p className="mt-1 text-sm text-slate-600">
            Invite links are single-use. If you already accepted yours, you can set a
            password with Forgot password on the sign-in page — otherwise ask for a new invite.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Go to sign in
          </Link>
        </div>
      )}

      {(state === 'ready' || state === 'done') && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Password <span className="font-normal text-slate-400">(8+ characters)</span>
              </label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</label>
              <input
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="Repeat the password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
              {confirm.length > 0 && password !== confirm && (
                <p className="mt-1.5 text-xs text-rose-600">Passwords don&apos;t match</p>
              )}
              {confirm.length > 0 && password === confirm && (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Match
                </p>
              )}
            </div>

            {error && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={!valid || busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Save password &amp; continue
            </button>
          </div>
        </div>
      )}
    </AuthShell>
  )
}
