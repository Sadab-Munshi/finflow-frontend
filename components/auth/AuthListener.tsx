'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthListener() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        localStorage.setItem('finflow_current_user_id', session.user.id)
      } else {
        localStorage.removeItem('finflow_current_user_id')
      }
      if (event === 'SIGNED_IN') {
        router.refresh()
      }
      if (event === 'SIGNED_OUT') {
        router.push('/login')
        router.refresh()
      }
      if (event === 'TOKEN_REFRESHED') {
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return null
}
