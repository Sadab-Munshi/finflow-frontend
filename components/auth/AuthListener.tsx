'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { identifyUser, track } from '@/lib/posthog'

export default function AuthListener() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        localStorage.setItem('finflow_current_user_id', session.user.id)
        identifyUser(session.user.id, session.user.email ?? undefined)
      } else {
        localStorage.removeItem('finflow_current_user_id')
      }
      if (event === 'SIGNED_IN') {
        // OAuth redirect back: buttons stash the provider before leaving so we
        // can distinguish a brand-new account from a returning login here.
        try {
          const provider = sessionStorage.getItem('ff-oauth-provider')
          if (provider && session?.user) {
            sessionStorage.removeItem('ff-oauth-provider')
            const createdAt = session.user.created_at ? new Date(session.user.created_at).getTime() : 0
            const isNewAccount = createdAt > 0 && Date.now() - createdAt < 3 * 60 * 1000
            track(isNewAccount ? 'signup_completed' : 'login', { method: `oauth:${provider}` })
          }
        } catch {
          /* noop */
        }
        router.refresh()
        // Re-subscribe push notification with current user's ID
        // This ensures the push subscription is always associated with the logged-in user
        import('@/lib/push').then(({ subscribeToPush, isPushSupported }) => {
          if (isPushSupported() && Notification.permission === 'granted') {
            subscribeToPush().catch((err) => {
              console.error('[Auth] Push re-subscribe on login failed:', err)
            })
          }
        }).catch((err) => {
          console.error('[Auth] Failed to load push module:', err)
        })
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
