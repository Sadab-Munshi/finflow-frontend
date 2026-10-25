'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { posthog } from '@/lib/posthog'
import {
  trackLogin,
  sendHeartbeat,
  getUserBootstrap,
  type PlanId,
  type BootstrapPayload,
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
  /**
   * The raw bootstrap payload. Exposed so SubscriptionGateContext can read
   * settings/features/tier from the SAME response instead of issuing its own —
   * otherwise consolidating the dashboard would just move the duplicate calls
   * one layer down.
   */
  bootstrap: BootstrapPayload | null
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshProfile: async () => {},
  bootstrap: null,
})

export const useUser = () => useContext(UserContext)

/** Paths where a signed-out visitor is expected — skip the bootstrap entirely. */
function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false
  return [
    '/login',
    '/signup',
    '/reset-password',
    '/auth',
    '/privacy',
    '/terms',
    '/disclaimer',
    '/cookies',
    '/support',
    '/user-guide',
  ].some((p) => pathname === p || pathname.startsWith(`${p}/`)) || pathname === '/'
}

export function UserProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // One bootstrap per signed-in session unless something explicitly refreshes.
  const bootstrappedFor = useRef<string | null>(null)
  const loginTracked = useRef(false)

  /**
   * Single source of truth for the shell.
   *
   * Previously this provider made ~7 calls on mount (auth.getUser, a settings
   * select, a `user_management` read, api.ipify.org, track-login, heartbeat and
   * the subscription endpoint), and a separate 20-second loop re-ran the ban
   * checks — each with its own api.ipify.org round trip. All of that is now one
   * request, and the ban state is enforced server-side by authMiddleware.
   */
  const loadBootstrap = useCallback(async (): Promise<void> => {
    const supabase = createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      setUser(null)
      setLoading(false)
      return
    }

    let payload
    try {
      payload = await getUserBootstrap()
    } catch {
      // Bootstrap unreachable: keep the last known profile rather than blanking
      // the UI. The backend still enforces bans and feature gates.
      setLoading(false)
      return
    }

    if (payload.banned) {
      await supabase.auth.signOut({ scope: 'local' })
      window.location.href = '/login?banned=true'
      return
    }

    setBootstrap(payload)
    setUser({
      userId: payload.user.id,
      email: payload.user.email || authUser.email || '',
      userName: payload.user.name,
      avatarUrl: payload.user.avatarUrl,
      isPro: payload.subscription.isPro,
      planId: payload.subscription.planId,
      planName: payload.subscription.planName,
      aiMultiplier: payload.subscription.aiMultiplier,
    })

    bootstrappedFor.current = payload.user.id

    // Login telemetry is fire-and-forget and must never block the shell.
    // The IP is no longer fetched from api.ipify.org: the backend sees the real
    // address from x-real-ip on this very request, so the extra third-party
    // round trip (and the data leak to it) is gone.
    if (!loginTracked.current) {
      loginTracked.current = true
      posthog.identify(authUser.id, {
        email: authUser.email,
        name: payload.user.name,
      })
      trackLogin(authUser.id, authUser.email || '').catch(() => {})
    }

    setLoading(false)
  }, [])

  const refreshProfile = useCallback(async () => {
    await loadBootstrap()
  }, [loadBootstrap])

  // Initial load, and a revalidation whenever the route changes — the
  // SWR-style freshness you asked for, with no background polling.
  useEffect(() => {
    if (isPublicPath(pathname)) {
      setLoading(false)
      return
    }

    let cancelled = false
    const run = async () => {
      await loadBootstrap()
      if (cancelled) return
    }
    run()
    return () => {
      cancelled = true
    }
  }, [pathname, loadBootstrap])

  // Heartbeat: keeps the admin panel's "Online now" data flowing. This is the
  // only recurring timer that remains — it is a single lightweight POST every
  // 30s and it does not re-run any ban or subscription logic.
  useEffect(() => {
    if (!user?.userId) return

    const ping = async () => {
      try {
        await sendHeartbeat()
      } catch {
        /* presence is best-effort */
      }
    }
    ping()
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    heartbeatRef.current = setInterval(ping, 30000)

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [user?.userId])

  // Focus revalidation: returning to the tab refreshes the shell (kill-switch
  // and plan changes show up). Deliberately not a background poll.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onFocus = () => {
      if (isPublicPath(window.location.pathname)) return
      loadBootstrap().catch(() => {})
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadBootstrap])

  return (
    <UserContext.Provider value={{ user, loading, refreshProfile, bootstrap }}>
      {children}
    </UserContext.Provider>
  )
}
