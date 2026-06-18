'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { posthog } from '@/lib/posthog'
import { trackLogin, checkBan, checkIpBan, heartbeat as sendHeartbeat, getUserProfile } from '@/lib/api-client'

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
    try {
      const profile = await getUserProfile()
      const userName = profile.name || profile.email?.split('@')[0] || 'User'
      const avatarUrl = profile.avatar_url || ''

      setUser(prev => {
        if (prev) return { ...prev, userName, avatarUrl }
        return {
          userId: profile.id,
          email: profile.email || '',
          userName,
          avatarUrl,
        }
      })
    } catch {
      // profile fetch failed, ignore
    }
  }, [])

  useEffect(() => {
    const initUser = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setUser(null)
        setLoading(false)
        return
      }

      let profile: { id: string; email: string; name: string | null; avatar_url: string | null }
      try {
        profile = await getUserProfile()
      } catch {
        setUser(null)
        setLoading(false)
        return
      }

      // PostHog identify
      posthog.identify(profile.id, {
        email: profile.email,
        name: profile.name,
      })

      // Ban check
      try {
        const banData = await checkBan(profile.id)
        if (banData.banned) {
          await supabase.auth.signOut({ scope: 'local' })
          window.location.href = '/login?banned=true'
          return
        }
      } catch {
        // ban check failed, continue
      }

      // Track login
      let ipAddress = 'unknown'
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json')
        const ipData = await ipRes.json()
        ipAddress = ipData.ip
      } catch {}

      trackLogin(profile.id, profile.email, ipAddress).catch(e => console.error('[trackLogin] Failed:', e))

      // Heartbeat
      sendHeartbeat().catch(() => {})
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      heartbeatRef.current = setInterval(() => {
        sendHeartbeat().catch(() => {})
      }, 30000)

      const userName = profile.name || profile.email?.split('@')[0] || 'User'
      const avatarUrl = profile.avatar_url || ''

      setUser({
        userId: profile.id,
        email: profile.email || '',
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

      let banned = false
      try {
        const banData = await checkBan(user.userId)
        banned = banData.banned || false
      } catch {
        // fail silently, treat as not banned
      }

      if (!banned) {
        try {
          const ipBanData = await checkIpBan(ipAddress)
          banned = ipBanData.banned || false
        } catch {
          // fail silently
        }
      }

      if (banned) {
        await supabase.auth.signOut({ scope: 'local' })
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
