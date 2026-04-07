'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthBackground from '@/components/auth/AuthBackground'
import LoginForm from '@/components/auth/LoginForm'
import BackButton from '@/components/landing/BackButton'

function LoginContent() {
  const searchParams = useSearchParams()
  const isBanned = searchParams.get('banned')
  const isConfirmed = searchParams.get('confirmed')

  return (
    <main className="min-h-screen overflow-y-auto flex items-center justify-center py-8 px-4">
      <AuthBackground />
      <div className="w-full max-w-md">
        <BackButton />
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_0_60px_rgba(0,212,255,0.05)]">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 17 Q8 7 12 12 Q16 17 21 7" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to continue your financial journey</p>
          </div>

          {isConfirmed && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-sm text-green-700 text-center">
              Email confirmed! Please log in.
            </div>
          )}

          {isBanned && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-600 text-center">
              Your account has been suspended. Please contact support for assistance.
            </div>
          )}

          <LoginForm />
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen overflow-y-auto flex items-center justify-center py-8 px-4">
        <AuthBackground />
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_0_60px_rgba(0,212,255,0.05)]">
            <div className="text-center">
              <p className="text-gray-500 text-sm">Loading...</p>
            </div>
          </div>
        </div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  )
}
