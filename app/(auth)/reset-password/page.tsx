'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import AuthBackground from '@/components/auth/AuthBackground'

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) {
        toast.error(error.message)
        return
      }
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen overflow-y-auto flex items-center justify-center py-8 px-4">
      <AuthBackground />
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_0_60px_rgba(0,212,255,0.05)]">
          {!done ? (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 mb-4">
                  <Lock className="w-6 h-6 text-[#00D4FF]" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Set New Password</h1>
                <p className="text-gray-500 text-sm mt-1">Make it strong and memorable</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-800 mb-2">New Password</label>
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
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                </div>

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
                  {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-[#0A0F1E] bg-gradient-to-r from-[#00D4FF] to-[#0099bb] hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Password Updated!</h2>
              <p className="text-gray-500 text-sm">Redirecting you to login in 3 seconds...</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
