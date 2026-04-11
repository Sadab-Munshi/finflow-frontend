'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TurnstileWidget, { TurnstileInstance } from './TurnstileWidget'
import GoogleButton from './GoogleButton'

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

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const levels = [
    { label: 'Weak', color: '#ef4444' },
    { label: 'Weak', color: '#ef4444' },
    { label: 'Fair', color: '#f97316' },
    { label: 'Strong', color: '#22c55e' },
    { label: 'Very Strong', color: '#10b981' },
  ]
  return { score, ...levels[Math.min(score, 4)] }
}

export default function SignupForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileError, setTurnstileError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [termsError, setTermsError] = useState(false)
  const turnstileRef = useRef<TurnstileInstance>(null)
  const router = useRouter()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const password = watch('password', '')
  const strength = getPasswordStrength(password)

  const onSubmit = async (data: FormData) => {
    // Reset turnstile error state
    setTurnstileError(false)
    
    // Check terms agreement
    if (!agreedToTerms) {
      setTermsError(true)
      toast.error('Please agree to the Privacy Policy, Terms of Service, and Disclaimer')
      return
    }
    setTermsError(false)

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
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
        },
      })

      if (error) {
        toast.error(error.message)
        turnstileRef.current?.reset()
        setTurnstileToken(null)
        return
      }

      // After successful signup, create settings row with notification defaults
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

      toast.success("Check your email to confirm your account!")
      router.push('/login')

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

  const handleTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAgreedToTerms(e.target.checked)
    if (e.target.checked) setTermsError(false)
  }

  const linkClassName = 'text-cyan-500 underline hover:text-cyan-600'

  return (
    <div className="space-y-4">
      {/* Email Signup Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-800 mb-2">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              {...register('fullName')}
              placeholder="John Doe"
              className="w-full bg-gray-100 border-0 rounded-2xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
            />
          </div>
          {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
        </div>

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
          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-800 mb-2">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              className="w-full bg-gray-100 border-0 rounded-2xl pl-10 pr-10 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{ backgroundColor: i <= strength.score ? strength.color : '#e5e7eb' }} />
                ))}
              </div>
              <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
            </div>
          )}
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-800 mb-2">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              {...register('confirmPassword')}
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repeat password"
              className="w-full bg-gray-100 border-0 rounded-2xl pl-10 pr-10 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
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

        {/* Terms Agreement */}
        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={handleTermsChange}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-black cursor-pointer shrink-0"
            />
            <span className="text-xs text-gray-700">
              I agree to the{' '}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className={linkClassName}>Privacy Policy</Link>
              {', '}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className={linkClassName}>Terms of Service</Link>
              {', and '}
              <Link href="/disclaimer" target="_blank" rel="noopener noreferrer" className={linkClassName}>Disclaimer</Link>
            </span>
          </label>
          {termsError && (
            <p className="text-red-500 text-xs mt-1">You must agree to the terms before creating an account</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !agreedToTerms}
          className="w-full py-3 rounded-full font-semibold text-white bg-black hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-600 text-xs">or continue with</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Google Button - Outside form to prevent validation */}
      <GoogleButton disabled={!agreedToTerms} />

      <p className="text-center text-gray-700 text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-gray-800 font-semibold hover:text-black hover:underline">Sign in →</Link>
      </p>
    </div>
  )
}
