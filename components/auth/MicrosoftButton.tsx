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
      onClick={handleMicrosoftLogin}
      disabled={loading || disabled}
      className="flex items-center justify-center gap-3 bg-black text-white rounded-2xl px-6 py-3 font-medium hover:bg-gray-900 transition-all mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Microsoft SVG Icon */}
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path fill="#F25022" d="M1 1h8.5v8.5H1z" />
        <path fill="#7FBA00" d="M10.5 1H19v8.5h-8.5z" />
        <path fill="#00A4EF" d="M1 10.5h8.5V19H1z" />
        <path fill="#FFB900" d="M10.5 10.5H19V19h-8.5z" />
      </svg>
      {loading ? 'Connecting...' : 'Continue with Microsoft'}
    </button>
  )
}
