'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Lock, Mail, ShieldCheck, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import TurnstileWidget, { TurnstileInstance } from './TurnstileWidget'
import GoogleButton from './GoogleButton'
import MicrosoftButton from './MicrosoftButton'
import AuthField from './AuthField'
import AuthModeSwitcher from './AuthModeSwitcher'
import AuthPrimaryButton from './AuthPrimaryButton'
import AuthSuccessState from './AuthSuccessState'
import PasswordStrengthMeter from './PasswordStrengthMeter'
import { getEmailSuggestion } from './emailSuggestion'
import { authSignupStatus, authVerifyTurnstile, type SignupStatus } from '@/lib/api-client'

export const SIGNUP_FULL_MESSAGE =
  'Signups are temporarily closed — the user limit has been reached. Please try again later.'

const SIGNUP_CLOSED_MESSAGE =
  'Registrations are currently closed. Please check back later.'
const SIGNUP_INVITE_MESSAGE =
  'Signups are currently invite-only. Please contact us for an invitation.'

// Maps an API signup-status response to a user-facing block reason. A
// response of allowed:false without a `reason` means the user cap fired
// (legacy behavior, kept as the default).
function blockMessageFor(status: SignupStatus): string | null {
  if (status.allowed) return null
  switch (status.reason) {
    case 'closed':
      return SIGNUP_CLOSED_MESSAGE
    case 'invite_only':
      return SIGNUP_INVITE_MESSAGE
    case 'domain':
      return `This email domain cannot register right now.${
        status.allowed_domains?.length
          ? ` Allowed domains: ${status.allowed_domains.join(', ')}.`
          : ''
      }`
    default:
      return SIGNUP_FULL_MESSAGE
  }
}

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>
type SubmitState = 'idle' | 'loading' | 'success'

export default function SignupForm() {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileError, setTurnstileError] = useState(false)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [termsError, setTermsError] = useState(false)
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const [fullNameValue, setFullNameValue] = useState('')
  const [emailValue, setEmailValue] = useState('')
  const [passwordValue, setPasswordValue] = useState('')
  const [signupBlockMessage, setSignupBlockMessage] = useState<string | null>(null)
  const blockCauseRef = useRef<string | null>(null)
  const signupClosed = !!signupBlockMessage
  const turnstileRef = useRef<TurnstileInstance>(null)

  // Prefetch the admin-set signup cap so the form can show the closed state
  // up front (the DB trigger still enforces on race). Failed fetch = allowed.
  useEffect(() => {
    let cancelled = false
    authSignupStatus()
      .then((status) => {
        if (cancelled) return
        const msg = blockMessageFor(status)
        blockCauseRef.current = status.reason ?? (status.allowed ? null : 'limit')
        setSignupBlockMessage(msg)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Live domain gate — once the typed email parses, re-check it against the
  // admin's allowed-domain list (debounced). Platform-level blocks (closed /
  // invite-only / cap) take precedence over domain feedback.
  useEffect(() => {
    const email = emailValue.trim()
    const valid = z.string().email().safeParse(email).success
    if (!valid) {
      // Editing away from a rejected domain shouldn't keep the form blocked.
      if (blockCauseRef.current === 'domain') {
        blockCauseRef.current = null
        setSignupBlockMessage(null)
      }
      return
    }
    const timer = setTimeout(() => {
      authSignupStatus(email)
        .then((status) => {
          const platformBlocked =
            !status.allowed && status.reason && status.reason !== 'domain'
          if (platformBlocked) return // keep the platform-level message
          blockCauseRef.current = status.allowed ? null : (status.reason ?? 'limit')
          setSignupBlockMessage(blockMessageFor(status))
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
  const nameLooksValid = z.string().min(2).safeParse(fullNameValue).success

  const onSubmit = async (data: FormData) => {
    setTurnstileError(false)

    if (!agreedToTerms) {
      setTermsError(true)
      toast.error('Please agree to the Privacy Policy, Terms of Service, and Disclaimer')
      return
    }
    setTermsError(false)

    if (!turnstileToken) {
      setTurnstileError(true)
      toast.error('Please complete the security verification')
      return
    }

    setSubmitState('loading')
    try {
      // Soft gate — re-check right before signup so the cap set minutes ago
      // is honored; errors here must not block signups (trigger is the gate).
      try {
        const status = await authSignupStatus(data.email)
        const msg = blockMessageFor(status)
        if (msg) {
          blockCauseRef.current = status.reason ?? 'limit'
          setSignupBlockMessage(msg)
          toast.error(msg)
          setSubmitState('idle')
          return
        }
      } catch { /* status check unavailable → proceed */ }

      const { success } = await authVerifyTurnstile(turnstileToken)
      if (!success) {
        toast.error('Security check failed. Please try again.')
        setTurnstileError(true)
        turnstileRef.current?.reset()
        setTurnstileToken(null)
        setSubmitState('idle')
        return
      }

      const supabase = createClient()
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
        },
      })

      if (error) {
        // DB trigger rejection (race between status check and insert)
        if (error.message?.includes('signup_limit_reached')) {
          setSignupBlockMessage(SIGNUP_FULL_MESSAGE)
          toast.error(SIGNUP_FULL_MESSAGE)
        } else {
          toast.error(error.message)
        }
        turnstileRef.current?.reset()
        setTurnstileToken(null)
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

      toast.success('Check your email to confirm your account!')
      setSubmitState('success')
      setSuccessEmail(data.email)
    } catch {
      toast.error('Something went wrong. Please try again.')
      turnstileRef.current?.reset()
      setTurnstileToken(null)
      setSubmitState('idle')
    }
  }

  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token)
    setTurnstileError(false)
    toast.success('Security verified', { duration: 2000 })
  }

  const handleTurnstileError = () => {
    setTurnstileToken(null)
    setTurnstileError(true)
  }

  const handleTurnstileExpire = () => {
    setTurnstileToken(null)
    setTurnstileError(false)
    turnstileRef.current?.reset()
  }

  const handleTermsChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAgreedToTerms(event.target.checked)
    if (event.target.checked) setTermsError(false)
  }

  const linkClassName = 'font-semibold text-teal-700 underline decoration-teal-300 underline-offset-2 hover:text-teal-800'

  if (successEmail) {
    return <AuthSuccessState email={successEmail} />
  }

  return (
    <div className="auth-fade-up space-y-5" style={{ animationDelay: '90ms' }}>
      <AuthModeSwitcher mode="signup" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <GoogleButton disabled={!agreedToTerms || signupClosed} />
        <MicrosoftButton disabled={!agreedToTerms || signupClosed} />
      </div>
      {!agreedToTerms && (
        <p className="text-center text-xs font-medium text-slate-500">Accept the terms below to continue with social sign up.</p>
      )}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">or with email</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
      </div>

      {/* eslint-disable-next-line react-hooks/refs -- react-hook-form handleSubmit is safe as a form submit handler. */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-[25px] sm:space-y-[29px]">
          <AuthField
            {...register('fullName', {
              onChange: (event: ChangeEvent<HTMLInputElement>) => setFullNameValue(event.target.value),
            })}
            label="Full name"
            placeholder="John Doe"
            autoComplete="name"
            icon={<User className="h-4 w-4" />}
            error={errors.fullName?.message}
            isValid={nameLooksValid}
            reserveHelperSpace={false}
          />

          <AuthField
            {...register('email', {
              onChange: (event: ChangeEvent<HTMLInputElement>) => setEmailValue(event.target.value),
            })}
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            icon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            isValid={emailLooksValid}
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

          <AuthField
            {...register('confirmPassword')}
            label="Confirm password"
            type="password"
            placeholder="Repeat password"
            autoComplete="new-password"
            icon={<Lock className="h-4 w-4" />}
            error={errors.confirmPassword?.message}
            reserveHelperSpace={false}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              Verify you are human
            </span>
            <span className={turnstileToken ? 'text-teal-600' : 'text-slate-400'}>
              {turnstileToken ? 'Success' : 'Security check'}
            </span>
          </div>
          <TurnstileWidget
            ref={turnstileRef}
            theme="light"
            className="mt-2"
            onSuccess={handleTurnstileSuccess}
            onError={handleTurnstileError}
            onExpire={handleTurnstileExpire}
          />
          {turnstileError && (
            <p className="mt-2 text-xs font-medium text-amber-600">Please wait for verification to finish.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={handleTermsChange}
              className="peer sr-only"
            />
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-white transition-all peer-checked:border-teal-500 peer-checked:bg-teal-500 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-400 peer-focus-visible:ring-offset-2">
              <Check className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs leading-5 text-slate-600">
              I agree to the{' '}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className={linkClassName}>Privacy Policy</Link>
              {', '}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className={linkClassName}>Terms of Service</Link>
              {', and '}
              <Link href="/disclaimer" target="_blank" rel="noopener noreferrer" className={linkClassName}>Disclaimer</Link>
            </span>
          </label>
          {termsError && (
            <p className="mt-2 text-xs font-medium text-rose-600">You must agree to the terms before creating an account.</p>
          )}
        </div>

        {signupBlockMessage && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">
            {signupBlockMessage}
          </p>
        )}

        <AuthPrimaryButton
          type="submit"
          status={submitState}
          disabled={!agreedToTerms || signupClosed}
          idleLabel="Create account"
          loadingLabel="Creating account…"
          successLabel="Check your inbox"
        />
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
    </div>
  )
}
