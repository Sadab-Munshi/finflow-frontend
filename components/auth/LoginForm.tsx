'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, FlaskConical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TurnstileWidget, { TurnstileInstance } from './TurnstileWidget'
import GoogleButton from './GoogleButton'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileError, setTurnstileError] = useState(false)
  const [loading, setLoading] = useState(false)
  const turnstileRef = useRef<TurnstileInstance>(null)
  const router = useRouter()

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    // Reset turnstile error state
    setTurnstileError(false)
    
    // Check if Turnstile is completed
    if (!turnstileToken) {
      setTurnstileError(true)
      toast.error('Please complete the security verification')
      return
    }

    setLoading(true)
    try {
      const verifyRes = await fetch('/api/auth/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      })
      const { success } = await verifyRes.json()
      if (!success) {
        toast.error('Security check failed. Please try again.')
        setTurnstileError(true)
        turnstileRef.current?.reset()
        setTurnstileToken(null)
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
        return
      }

      // Send welcome email on first login after email confirmation
      const user = signInData?.user
      if (user?.email_confirmed_at) {
        try {
          // Fetch or create settings row
          let { data: settingsData } = await supabase
            .from('settings')
            .select('welcome_email_sent')
            .eq('user_id', user.id)
            .single()

          // If no settings row exists, create one with defaults
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
            const fullName = user.user_metadata?.full_name || user.email || 'there'
            await fetch('/api/auth/welcome-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fullName, email: user.email }),
            })
            // Use upsert to ensure it works even if row was just created
            await supabase
              .from('settings')
              .upsert({ user_id: user.id, welcome_email_sent: true }, { onConflict: 'user_id' })
          }
        } catch (e) {
          console.error('Welcome email check failed:', e)
        }
      }

      toast.success('Welcome back!')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
      turnstileRef.current?.reset()
      setTurnstileToken(null)
    } finally {
      setLoading(false)
    }
  }

  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token)
    setTurnstileError(false)
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

  return (
    <div className="space-y-4">
      {/* Email Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-800 mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              className="w-full bg-gray-100 border-0 rounded-2xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-800">Password</label>
            <Link href="/forgot-password" className="text-xs text-gray-800 font-semibold hover:text-black hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Your password"
              className="w-full bg-gray-100 border-0 rounded-2xl pl-10 pr-10 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        {/* Turnstile */}
        <div>
          <TurnstileWidget
            ref={turnstileRef}
            onSuccess={handleTurnstileSuccess}
            onError={handleTurnstileError}
            onExpire={handleTurnstileExpire}
          />
          {turnstileError && (
            <p className="text-red-500 text-xs mt-2">Please complete the security verification</p>
          )}
        </div>

        {/* Try Demo */}
        <button
          type="button"
          onClick={() => {
            setValue('email', 'demo@finflow.com')
            setValue('password', '#demofinflow2026')
          }}
          className="w-full py-2.5 rounded-full border border-dashed border-gray-300 text-gray-500 text-sm font-medium hover:border-gray-400 hover:text-gray-700 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <FlaskConical className="w-4 h-4" />
          Try Demo Account
        </button>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full font-semibold text-white bg-black hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-600 text-xs">or continue with</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Google Button - Outside form to prevent validation */}
      <GoogleButton />

      <p className="text-center text-gray-700 text-sm">
        New to FinFlow?{' '}
        <Link href="/signup" className="text-gray-800 font-semibold hover:text-black hover:underline">Create an account →</Link>
      </p>
    </div>
  )
}
