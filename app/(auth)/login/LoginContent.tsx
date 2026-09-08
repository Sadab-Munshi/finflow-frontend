'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthShell from '@/components/auth/AuthShell'
import LoginForm from '@/components/auth/LoginForm'

function LoginContent() {
  const searchParams = useSearchParams()
  const isBanned = searchParams.get('banned')
  const isConfirmed = searchParams.get('confirmed')

  return (
    <AuthShell mode="login">
      {(isConfirmed || isBanned) && (
        <div className="auth-fade-up mb-5 space-y-3" style={{ animationDelay: '70ms' }}>
          {isConfirmed && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3 text-center text-sm font-semibold text-teal-700">
              Email confirmed. Please sign in to continue.
            </div>
          )}

          {isBanned && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-center text-sm font-semibold text-rose-600">
              Your account has been suspended. Please contact support for assistance.
            </div>
          )}
        </div>
      )}

      <LoginForm />
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <AuthShell mode="login">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-sm">
          Loading...
        </div>
      </AuthShell>
    }>
      <LoginContent />
    </Suspense>
  )
}
