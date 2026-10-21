'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { createClient, hasAuthSessionCookie } from '@/lib/supabase/client'
import { posthog, resetAnalytics } from '@/lib/posthog'
import { clearClientSecurityState } from '@/lib/security'
import {
  trackLogin,
  sendHeartbeat,
  getSubscriptionStatus,
  type PlanId,
} from '@/lib/api-client'

interface UserProfile {
  userId: string
  email: string
  userName: string
  avatarUrl: string
  isPro?: boolean
  planId?: PlanId
  planName?: string
  aiMultiplier?: number
}

interface UserContextType {
  user: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

interface SubscriptionApiResponse {
  data?: {
    subscription?: {
      planId?: PlanId
      planName?: string
      aiMultiplier?: number
      status?: string
    }
  }
  subscription?: {
    planId?: PlanId
    planName?: string
    aiMultiplier?: number
    status?: string
  }
}

function parseSubscriptionFields(subRes: unknown): {
  isPro: boolean
  planId: PlanId
  planName: string
  aiMultiplier: number
} {
  const typed = subRes as SubscriptionApiResponse | null
  const sub = typed?.data?.subscription ?? typed?.subscription
  if (!sub) {
    return { isPro: false, planId: 'free', planName: 'Free Starter', aiMultiplier: 1 }
  }
  const planId: PlanId = sub.planId || 'free'
  const planName = sub.planName || 'Free Starter'
  const aiMultiplier = Number(sub.aiMultiplier) || 1
  const isPro = sub.status === 'active' && planId !== 'free'
  return { isPro, planId, planName, aiMultiplier }
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshProfile: async () => {},
})

export const useUser = () => useContext(UserContext)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshProfile = useCallback(async () => {
    if (!hasAuthSessionCookie()) return
    const supabase = createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) return

    const [settingsResult, subResult] = await Promise.allSettled([
      supabase
        .from('settings')
        .select('avatar_url, name')
        .eq('user_id', authUser.id)
        .maybeSingle(),
      getSubscriptionStatus(),
    ])

    let userName =
      (authUser.user_metadata?.full_name as string | undefined) ||
      authUser.email?.split('@')[0] ||
      'User'
    let avatarUrl = ''

    if (settingsResult.status === 'fulfilled' && settingsResult.value.data) {
      const data = settingsResult.value.data as { avatar_url?: string; name?: string }
      if (data.avatar_url) avatarUrl = data.avatar_url
      if (data.name) userName = data.name
    }

    const subFields =
      subResult.status === 'fulfilled'
        ? parseSubscriptionFields(subResult.value)
        : { isPro: false, planId: 'free' as PlanId, planName: 'Free Starter', aiMultiplier: 1 }

    setUser((prev) => {
      if (prev) {
        return { ...prev, userName, avatarUrl, ...subFields }
      }
      return {
        userId: authUser.id,
        email: authUser.email || '',
        userName,
        avatarUrl,
        ...subFields,
      }
    })
  }, [])

  useEffect(() => {
    const initUser = async () => {
      // Fast path on unauthenticated visits: avoid network call when no sb-* cookie exists
      if (!hasAuthSessionCookie()) {
        setUser(null)
        setLoading(false)
        return
      }

      const supabase = createClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        setUser(null)
        setLoading(false)
        return
      }

      // PostHog identify (non-blocking, lazy-loaded)
      posthog.identify(authUser.id, {
        email: authUser.email,
        name: authUser.user_metadata?.full_name,
      })

      // Fetch ban status, profile settings, and subscription status in parallel
      const [banResult, settingsResult, subResult] = await Promise.allSettled([
        supabase
          .from('user_management')
          .select('is_banned, ip_banned, ban_reason')
          .eq('user_id', authUser.id)
          .maybeSingle(),
        supabase
          .from('settings')
          .select('avatar_url, name')
          .eq('user_id', authUser.id)
          .maybeSingle(),
        getSubscriptionStatus(),
      ])

      if (banResult.status === 'fulfilled' && banResult.value.data) {
        const banData = banResult.value.data as {
          is_banned?: boolean
          ip_banned?: boolean
        }
        if (banData.is_banned || banData.ip_banned) {
          await supabase.auth.signOut()
          await clearClientSecurityState()
          resetAnalytics()
          window.location.href = '/login?banned=true'
          return
        }
      }

      // Track login server-side (server derives IP from trusted request headers)
      trackLogin(authUser.id, authUser.email || '').catch((e) =>
        console.error('[trackLogin] Failed:', e)
      )

      // Heartbeat via the API
      const pingHeartbeat = async () => {
        try {
          await sendHeartbeat()
        } catch (e) {
          console.warn('[heartbeat] Failed:', e)
        }
      }
      void pingHeartbeat()
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      heartbeatRef.current = setInterval(pingHeartbeat, 30000)

      let userName =
        (authUser.user_metadata?.full_name as string | undefined) ||
        authUser.email?.split('@')[0] ||
        'User'
      let avatarUrl = ''

      if (settingsResult.status === 'fulfilled' && settingsResult.value.data) {
        const data = settingsResult.value.data as { avatar_url?: string; name?: string }
        if (data.avatar_url) avatarUrl = data.avatar_url
        if (data.name) userName = data.name
      }

      const subFields =
        subResult.status === 'fulfilled'
          ? parseSubscriptionFields(subResult.value)
          : { isPro: false, planId: 'free' as PlanId, planName: 'Free Starter', aiMultiplier: 1 }

      setUser({
        userId: authUser.id,
        email: authUser.email || '',
        userName,
        avatarUrl,
        ...subFields,
      })
      setLoading(false)
    }

    void initUser()

    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setLoading(true)
        void initUser()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current)
          heartbeatRef.current = null
        }
      }
    })

    return () => {
      subscription.unsubscribe()
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
    }
  }, [])

  return (
    <UserContext.Provider value={{ user, loading, refreshProfile }}>
      {children}
    </UserContext.Provider>
  )
}
