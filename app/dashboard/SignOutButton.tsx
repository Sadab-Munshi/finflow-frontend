'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="px-6 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all text-sm font-medium"
    >
      Sign Out
    </button>
  )
}
