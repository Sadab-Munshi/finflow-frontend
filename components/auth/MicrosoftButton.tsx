'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface MicrosoftButtonProps {
  disabled?: boolean
}

export default function MicrosoftButton({ disabled }: MicrosoftButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleMicrosoftLogin = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'email',
      },
    })
    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={handleMicrosoftLogin}
      disabled={loading || disabled}
      className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
    >
      {/* Microsoft SVG Icon */}
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path fill="#F25022" d="M1 1h8.5v8.5H1z" />
        <path fill="#7FBA00" d="M10.5 1H19v8.5h-8.5z" />
        <path fill="#00A4EF" d="M1 10.5h8.5V19H1z" />
        <path fill="#FFB900" d="M10.5 10.5H19V19h-8.5z" />
      </svg>
      <span className="whitespace-nowrap">{loading ? 'Connecting...' : 'Continue with Microsoft'}</span>
    </button>
  )
}
