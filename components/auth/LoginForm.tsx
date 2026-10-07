'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FlaskConical, Lock, Mail, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { identifyUser, track } from '@/lib/posthog'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TurnstileWidget, { TurnstileInstance } from './TurnstileWidget'
import GoogleButton from './GoogleButton'
import MicrosoftButton from './MicrosoftButton'
import AuthField from './AuthField'
import AuthModeSwitcher from './AuthModeSwitcher'
import AuthPrimaryButton from './AuthPrimaryButton'
import { getEmailSuggestion } from './emailSuggestion'
import { authVerifyTurnstile, authWelcomeEmail } from '@/lib/api-client'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>
type SubmitState = 'idle' | 'loading' | 'success'

export default function LoginForm() {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileError, setTurnstileError] = useState(false)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [emailValue, setEmailValue] = useState('')
  const turnstileRef = useRef<TurnstileInstance>(null)
  const router = useRouter()

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const emailSuggestion = getEmailSuggestion(emailValue)
  const emailLooksValid = z.string().email().safeParse(emailValue).success

  const onSubmit = async (data: FormData) => {
    setTurnstileError(false)

    if (!turnstileToken) {
      setTurnstileError(true)
      toast.error('Please complete the security verification')
      return
    }

    setSubmitState('loading')
    try {
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
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        toast.error(error.message)
        turnstileRef.current?.reset()
        setTurnstileToken(null)
        setSubmitState('idle')
        return
      }

      const user = signInData?.user
      const userEmail = user?.email
      track('login', { method: 'email' })
      if (user?.id) identifyUser(user.id, userEmail ?? undefined)
      if (user?.email_confirmed_at && userEmail) {
        try {
          let { data: settingsData } = await supabase
            .from('settings')
            .select('welcome_email_sent')
            .eq('user_id', user.id)
            .single()

          if (!settingsData) {
            await supabase.from('settings').upsert({
              user_id: user.id,
              monthly_report: true,
              budget_alerts: true,
              need_help: true,
              welcome_email_sent: false,
            }, { onConflict: 'user_id' })
            settingsData = { welcome_email_sent: false }
          }

          if (!settingsData.welcome_email_sent) {
            const fullName = user.user_metadata?.full_name || userEmail
            await authWelcomeEmail(fullName, userEmail)
            await supabase
              .from('settings')
              .upsert({ user_id: user.id, welcome_email_sent: true }, { onConflict: 'user_id' })
          }
        } catch (e) {
          console.error('Welcome email check failed:', e)
        }
      }

      toast.success('Welcome back!')
      setSubmitState('success')
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Login error:', err)
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
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

  const handleDemoCredentials = () => {
    setValue('email', 'demo@finflow.com', { shouldValidate: true, shouldDirty: true })
    setValue('password', '#demofinflow2026', { shouldValidate: true, shouldDirty: true })
    setEmailValue('demo@finflow.com')
  }

  return (
    <div className="auth-fade-up space-y-5" style={{ animationDelay: '90ms' }}>
      <AuthModeSwitcher mode="login" />

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
          error={errors.email?.message}
          isValid={emailLooksValid}
          action={(
            <button
              type="button"
              onClick={handleDemoCredentials}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-slate-500 transition-all hover:border-teal-300 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              aria-label="Fill demo credentials"
              title="Demo credentials"
            >
              <FlaskConical className="h-4 w-4" />
            </button>
          )}
          suggestion={emailSuggestion ? {
            label: emailSuggestion,
            onApply: () => {
              setValue('email', emailSuggestion, { shouldValidate: true, shouldDirty: true })
              setEmailValue(emailSuggestion)
            },
          } : null}
          reserveHelperSpace={false}
        />

        <AuthField
          {...register('password')}
          label="Password"
          type="password"
          placeholder="Your password"
          autoComplete="current-password"
          icon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          reserveHelperSpace={false}
          action={(
            <Link href="/forgot-password" className="text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline">
              Forgot password?
            </Link>
          )}
        />
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

        <AuthPrimaryButton
          type="submit"
          status={submitState}
          idleLabel="Sign in"
          loadingLabel="Signing in…"
          successLabel="Welcome back"
        />
      </form>

      <p className="mx-auto flex max-w-sm items-start justify-center gap-2 text-left text-xs font-medium text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
        <span>Your data is encrypted in transit and kept strictly private.</span>
      </p>

      <p className="text-center text-sm text-slate-500">
        New here?{' '}
        <Link href="/signup" className="font-black text-slate-900 underline decoration-teal-300 underline-offset-4 hover:text-teal-700">
          Create a free account
        </Link>
      </p>
    </div>
  )
}
