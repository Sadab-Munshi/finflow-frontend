'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthShell from '@/components/auth/AuthShell'
import { createClient } from '@/lib/supabase/client'
import { sanitizeInternalRedirect } from '@/lib/security'

// Invite / magic-link landing page.
//
// Admin-issued invites (supabase.auth.admin.inviteUserByEmail — the admin
// panel's waitlist "Send invite" button) DON'T use the PKCE code flow: GoTrue
// confirms (+ creates) the user at /auth/v1/verify and then 302-redirects
// here with the session tokens in the URL fragment:
//
//   /auth/complete#access_token=…&refresh_token=…&expires_in=…&token_type=bearer&type=invite
//
// URL fragments never reach the server, so the /auth/callback route handler
// (which only exchanges ?code=) can't touch them — it used to bounce invited
// users to /login?error=auth_callback_error even though their account was
// already created. This client page restores the session explicitly and
// sends them on to the dashboard, where OnboardingModal collects their name.
export default function AuthCompletePage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function complete() {
      try {
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        if (params.get('error')) {
          setError(params.get('error_description') || 'This link is invalid or has expired.')
          return
        }
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (!access_token || !refresh_token) {
          setError('Missing sign-in tokens — please request a fresh link.')
          return
        }
        const supabase = createClient()
        const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token })
        if (sessionError) {
          setError('This link has expired — please request a fresh one.')
          return
        }
        // Tokens are now in the session store — scrub them from the address bar.
        window.history.replaceState(null, '', '/auth/complete')
        // Invited users arrive with a session but NO password (inviteUserByEmail
        // never sets one), and this app is password-based — send them through
        // the mandatory set-password step before the dashboard.
        if (params.get('type') === 'invite') {
          router.replace('/auth/set-password')
          return
        }
        const rawNext = new URLSearchParams(window.location.search).get('next')
        router.replace(sanitizeInternalRedirect(rawNext, '/dashboard'))
      } catch {
        setError('Something went wrong while signing you in. Please try again.')
      }
    }
    complete()
  }, [router])

  return (
    <AuthShell mode="login">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-white/80 p-6 text-center shadow-sm backdrop-blur">
          <p className="text-sm font-semibold text-rose-600">Couldn&apos;t sign you in</p>
          <p className="mt-1 text-sm text-slate-600">{error}</p>
          <p className="mt-2 text-xs text-slate-500">
            Links are single-use. If you already accepted this invite, open{' '}
            <Link href="/forgot-password" className="font-semibold text-teal-700 hover:underline">
              Forgot password
            </Link>{' '}
            to create your password.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Go to sign in
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-teal-600 border-t-transparent" />
          <p className="text-sm text-slate-600">Finishing sign-in…</p>
        </div>
      )}
    </AuthShell>
  )
}
