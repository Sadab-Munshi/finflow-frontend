'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Mail, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import TurnstileWidget from './TurnstileWidget'
import { useInvisibleTurnstile } from './useInvisibleTurnstile'
import GoogleButton from './GoogleButton'
import MicrosoftButton from './MicrosoftButton'
import AuthField from './AuthField'
import AuthModeSwitcher from './AuthModeSwitcher'
import AuthPrimaryButton from './AuthPrimaryButton'
import AuthSuccessState from './AuthSuccessState'
import PasswordStrengthMeter from './PasswordStrengthMeter'
import SignupClosedCard, { type SignupBlockKind } from './SignupClosedCard'
import { getEmailSuggestion } from './emailSuggestion'
import { authSignupStatus, authVerifyTurnstile, type SignupStatus } from '@/lib/api-client'
import { track } from '@/lib/posthog'

// How an admin-set block is presented (§E of the auth overhaul): platform
// blocks REPLACE the form with a waitlist card; domain blocks are inline
// feedback on the email field. An active form never shows a warning banner,
// and a blocked user never sees a usable-looking form.
function blockKindFor(status: SignupStatus): SignupBlockKind | null {
  if (status.allowed) return null
  if (status.reason === 'closed') return 'closed'
  if (status.reason === 'invite_only') return 'invite_only'
  if (status.reason === 'domain') return null // handled inline, not as a card
  return 'capacity' // allowed:false with no reason = user cap fired
}

function domainMessageFor(status: SignupStatus): string | null {
  if (status.allowed || status.reason !== 'domain') return null
  return `This email domain can't register right now.${
    status.allowed_domains?.length
      ? ` Allowed domains: ${status.allowed_domains.join(', ')}.`
      : ''
  }`
}

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormData = z.infer<typeof schema>
type SubmitState = 'idle' | 'loading' | 'success'

export default function SignupForm() {
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const [emailValue, setEmailValue] = useState('')
  const [passwordValue, setPasswordValue] = useState('')
  // Platform block → full waitlist card replaces the form.
  const [blockKind, setBlockKind] = useState<SignupBlockKind | null>(null)
  // Domain block → inline error under the email field.
  const [domainError, setDomainError] = useState<string | null>(null)
  const { turnstileRef, warmUp, acquireToken, reset: resetTurnstile, turnstileCallbacks, fallbackVisible: turnstileFallback } = useInvisibleTurnstile()

  // Prefetch the admin-set registration controls; on any block the form is
  // swapped for the waitlist card. Failed fetch = allowed (DB trigger is the
  // hard gate).
  useEffect(() => {
    let cancelled = false
    authSignupStatus()
      .then((status) => {
        if (cancelled) return
        setBlockKind(blockKindFor(status))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Live domain gate — debounced re-check against the admin's allowed-domain
  // list as the user types; editing away from a rejected domain clears it.
  // Platform-level blocks take precedence and are left untouched here.
  useEffect(() => {
    const email = emailValue.trim()
    const valid = z.string().email().safeParse(email).success
    if (!valid) {
      setDomainError(null)
      return
    }
    const timer = setTimeout(() => {
      authSignupStatus(email)
        .then((status) => {
          setDomainError(domainMessageFor(status))
        })
        .catch(() => {})
    }, 400)
    return () => clearTimeout(timer)
  }, [emailValue])

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const emailSuggestion = getEmailSuggestion(emailValue)
  const emailLooksValid = z.string().email().safeParse(emailValue).success

  const onSubmit = async (data: FormData) => {
    setSubmitState('loading')
    try {
      // Soft gate — re-check right before signup so limits set minutes ago
      // are honored; errors here must not block signups (trigger is the gate).
      try {
        const status = await authSignupStatus(data.email)
        const kind = blockKindFor(status)
        const domainMsg = domainMessageFor(status)
        if (kind || domainMsg) {
          setBlockKind(kind)
          setDomainError(domainMsg)
          if (domainMsg) toast.error(domainMsg)
          setSubmitState('idle')
          return
        }
      } catch { /* status check unavailable → proceed */ }

      // Invisible Turnstile — challenge only fires now, on user intent.
      const token = await acquireToken()
      if (!token) {
        toast.error('Security check failed. Please try again.')
        resetTurnstile()
        setSubmitState('idle')
        return
      }
      const { success } = await authVerifyTurnstile(token)
      if (!success) {
        toast.error('Security check failed. Please try again.')
        resetTurnstile()
        setSubmitState('idle')
        return
      }

      const supabase = createClient()
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
        },
      })

      if (error) {
        // DB trigger rejection (race between status check and insert)
        if (error.message?.includes('signup_limit_reached')) {
          setBlockKind('capacity')
        } else {
          toast.error(error.message)
        }
        resetTurnstile()
        setSubmitState('idle')
        return
      }

      if (signUpData.user) {
        const { error: settingsError } = await supabase.from('settings').upsert({
          user_id: signUpData.user.id,
          monthly_report: true,
          budget_alerts: true,
          need_help: true,
          welcome_email_sent: false,
        }, { onConflict: 'user_id' })
        if (settingsError) {
          console.error('Failed to create settings row:', settingsError)
        }
      }

      track('signup_completed', { method: 'email' })
      toast.success('Check your email to confirm your account!')
      setSubmitState('success')
      setSuccessEmail(data.email)
    } catch {
      toast.error('Something went wrong. Please try again.')
      resetTurnstile()
      setSubmitState('idle')
    }
  }

  if (successEmail) {
    return <AuthSuccessState email={successEmail} />
  }

  // Platform-level block — the waitlist card IS the page (no form visible).
  if (blockKind) {
    return <SignupClosedCard kind={blockKind} />
  }

  return (
    <div className="auth-fade-up space-y-5" style={{ animationDelay: '90ms' }} onFocusCapture={warmUp}>
      <AuthModeSwitcher mode="signup" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <GoogleButton />
        <MicrosoftButton />
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">or with email</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
      </div>

      {/* eslint-disable-next-line react-hooks/refs -- react-hook-form handleSubmit is safe as a form submit handler. */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <AuthField
          {...register('email', {
            onChange: (event: ChangeEvent<HTMLInputElement>) => setEmailValue(event.target.value),
          })}
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message ?? (domainError || undefined)}
          isValid={emailLooksValid && !domainError}
          suggestion={emailSuggestion ? {
            label: emailSuggestion,
            onApply: () => {
              setValue('email', emailSuggestion, { shouldValidate: true, shouldDirty: true })
              setEmailValue(emailSuggestion)
            },
          } : null}
          reserveHelperSpace={false}
        />

        <div className="space-y-3">
          <AuthField
            {...register('password', {
              onChange: (event: ChangeEvent<HTMLInputElement>) => setPasswordValue(event.target.value),
            })}
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            icon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            reserveHelperSpace={false}
          />

          <PasswordStrengthMeter password={passwordValue} />
        </div>

        <AuthPrimaryButton
          type="submit"
          status={submitState}
          idleLabel="Create account"
          loadingLabel="Creating account…"
          successLabel="Check your inbox"
        />

        <p className="text-center text-xs leading-5 text-slate-400">
          By creating an account, you agree to our{' '}
          <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-teal-700">Terms</Link>
          {' & '}
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-teal-700">Privacy Policy</Link>.
        </p>
      </form>

      <p className="flex items-center justify-center gap-2 text-center text-xs font-medium text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
        Read-only connections and full data deletion controls keep you in charge.
      </p>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="font-black text-slate-900 underline decoration-teal-300 underline-offset-4 hover:text-teal-700">
          Sign in
        </Link>
      </p>

      {/* Invisible Turnstile — fires on "Create account"; a visible check appears only if the silent pass is not possible (e.g. Managed site key). */}
      <TurnstileWidget
        key={turnstileFallback ? 'visible' : 'invisible'}
        ref={turnstileRef}
        invisible={!turnstileFallback}
        theme="light"
        className={turnstileFallback ? 'mt-1 flex justify-center' : 'mt-2'}
        {...turnstileCallbacks}
      />
      {turnstileFallback && submitState === 'loading' && (
        <p className="text-center text-xs font-medium text-slate-500">
          Complete the quick check above — we&apos;ll continue automatically.
        </p>
      )}
    </div>
  )
}
