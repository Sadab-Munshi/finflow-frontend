'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { posthog } from '@/lib/posthog'

interface UserProfile {
  userId: string
  email: string
  userName: string
  avatarUrl: string
}

interface UserContextType {
  user: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
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
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    let userName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User'
    let avatarUrl = ''
    const { data } = await supabase.from('settings').select('avatar_url, name').eq('user_id', authUser.id).single()
    if (data?.avatar_url) avatarUrl = data.avatar_url
    if (data?.name) userName = data.name

    setUser(prev => {
      if (prev) return { ...prev, userName, avatarUrl }
      return {
        userId: authUser.id,
        email: authUser.email || '',
        userName,
        avatarUrl,
      }
    })
  }, [])

  useEffect(() => {
    const initUser = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setUser(null)
        setLoading(false)
        return
      }

      // PostHog identify
      posthog.identify(authUser.id, {
        email: authUser.email,
        name: authUser.user_metadata?.full_name,
      })

      // Ban check
      const { data: banData } = await supabase
        .from('user_management')
        .select('is_banned, ip_banned, ban_reason')
        .eq('user_id', authUser.id)
        .single()
      if (banData?.is_banned || banData?.ip_banned) {
        await supabase.auth.signOut()
        window.location.href = '/login?banned=true'
        return
      }

      // Track login
      let ipAddress = 'unknown'
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json')
        const ipData = await ipRes.json()
        ipAddress = ipData.ip
      } catch {}

      fetch('/api/track-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id, email: authUser.email, ipAddress })
      })

      // Heartbeat
      const pingHeartbeat = () =>
        fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: authUser.id })
        })
      pingHeartbeat()
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      heartbeatRef.current = setInterval(pingHeartbeat, 30000)

      // Fetch profile
      let userName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User'
      let avatarUrl = ''
      const { data } = await supabase
        .from('settings')
        .select('avatar_url, name')
        .eq('user_id', authUser.id)
        .single()
      if (data?.avatar_url) avatarUrl = data.avatar_url
      if (data?.name) userName = data.name

      setUser({
        userId: authUser.id,
        email: authUser.email || '',
        userName,
        avatarUrl,
      })
      setLoading(false)
    }

    initUser()

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setLoading(true)
        initUser()
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
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [])

  // Ban polling every 20 seconds
  useEffect(() => {
    if (!user) return

    const checkBanStatus = async () => {
      const supabase = createClient()
      let ipAddress = 'unknown'
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json')
        const ipData = await ipRes.json()
        ipAddress = ipData.ip
      } catch {}

      const internalSecret = process.env.NEXT_PUBLIC_INTERNAL_API_SECRET || ''
      const banRes = await fetch('/api/check-ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
        body: JSON.stringify({ userId: user.userId })
      })
      const banData = await banRes.json()

      const ipBanRes = await fetch('/api/check-ip-ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
        body: JSON.stringify({ ipAddress })
      })
      const ipBanData = await ipBanRes.json()

      if (banData.banned || ipBanData.banned) {
        await supabase.auth.signOut()
        window.location.href = '/login?banned=true'
      }
    }

    checkBanStatus()
    const interval = setInterval(checkBanStatus, 20000)
    return () => clearInterval(interval)
  }, [user?.userId])

  return (
    <UserContext.Provider value={{ user, loading, refreshProfile }}>
      {children}
    </UserContext.Provider>
  )
}
