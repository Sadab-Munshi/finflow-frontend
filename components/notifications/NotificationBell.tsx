'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/context/UserContext'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/api-client'
import NotificationCenter from './NotificationCenter'
import type { Notification } from '@/lib/types'

const NOTIFICATIONS_LIMIT = 20
const NOTIFICATION_CACHE_TTL_MS = 30_000 // 30 seconds

// Module-level cache so it persists across re-renders
let notificationsCache: { data: Notification[]; timestamp: number } | null = null

// ── Realtime toast de-duplication ─────────────────────────────────────────
//
// Toasts have exactly ONE source: a genuinely new notification arriving over
// the Supabase Realtime socket while the user is on the page. The initial load
// never toasts anything — it only fills the list and the bell badge — so
// anything that was already unread before this tab opened stays silent.
//
// Two earlier designs are gone for good:
//   * writing `read: true` cleared the unread badge just for opening the app;
//   * writing a `shown` column threw PGRST204 — that column is not in the live
//     schema, so every toast produced a 400 and a server log line.
//
// A third attempt, a sessionStorage ledger fed by a mount-time unread query,
// still replayed up to two historical notifications per tab: storage is
// per-tab, so every new tab started with an empty ledger.
//
// What remains is this: the socket can deliver the same INSERT twice across a
// reconnect or resubscribe, and that must not double-toast. The guard is
// memory-only — there is nothing to persist, because a notification that
// predates the page can no longer be toasted at all.
const recentlyToastedIds = new Set<string>()

/** True the first time an id is seen on the live socket, false on a replay. */
function claimRealtimeToast(id: string): boolean {
  if (recentlyToastedIds.has(id)) return false
  recentlyToastedIds.add(id)
  // Bounded: only the last handful of live frames can plausibly be replayed.
  if (recentlyToastedIds.size > 100) {
    const oldest = recentlyToastedIds.values().next().value
    if (oldest) recentlyToastedIds.delete(oldest)
  }
  return true
}

function getToastStyle(type: string) {
  switch (type) {
    case 'budget_alert':
      return { icon: '/icons-png/budget-alert.png', style: { background: '#7c2d12', color: '#fed7aa', border: '1px solid rgba(251,146,60,0.3)' } }
    case 'report':
      return { icon: '/icons-png/report.png', style: { background: '#1e3a5f', color: '#bfdbfe', border: '1px solid rgba(96,165,250,0.3)' } }
    case 'transaction':
      return { icon: '✅', style: { background: '#14532d', color: '#bbf7d0', border: '1px solid rgba(74,222,128,0.3)' } }
    default:
      return { icon: '/icons-png/bell.png', style: { background: '#111827', color: '#F9FAFB', border: '1px solid rgba(255,255,255,0.1)' } }
  }
}

export default function NotificationBell({
  onPanelChange,
}: {
  /** Lets the shell keep its header controls on screen while this panel is
      open; without it, scrolling the panel could slide its own trigger away. */
  onPanelChange?: (open: boolean) => void
} = {}) {
  const router = useRouter()
  const t = useTranslations('nav')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const bellRef = useRef<HTMLDivElement>(null)
  // Held in a ref so the toast callbacks stay stable across navigations.
  const routerRef = useRef(router)
  useEffect(() => {
    routerRef.current = router
  }, [router])

  const loadNotifications = useCallback(async (forceRefresh = false) => {
    if (!userId) return

    // Use cached data if fresh enough and not forced
    if (!forceRefresh && notificationsCache && (Date.now() - notificationsCache.timestamp < NOTIFICATION_CACHE_TTL_MS)) {
      setNotifications(notificationsCache.data)
      setUnreadCount(notificationsCache.data.filter((n: Notification) => !n.read).length)
      return
    }

    // Goes through the validated backend endpoint instead of a client-built
    // PostgREST query. The old `.eq('user_id', ...)`-style call is what could
    // produce a 400 when a filter value was empty or malformed; the server now
    // owns the query and clamps `limit` itself.
    try {
      const payload = await getNotifications(NOTIFICATIONS_LIMIT)
      const data: Notification[] = (payload?.notifications ?? []) as Notification[]
      notificationsCache = { data, timestamp: Date.now() }
      setNotifications(data)
      setUnreadCount(data.filter((n: Notification) => !n.read).length)
    } catch {
      // Keep whatever is on screen; the bell is non-critical chrome.
    }
  }, [userId])

  // The signed-in user comes from UserProvider — a second auth.getUser() here
  // was one of the duplicate requests on first paint.
  const { user: currentUser } = useUser()

  // Mount only records WHO is signed in so the list/badge fetches can run.
  // It deliberately starts no toast sequence: unread rows that existed before
  // this page opened are history, not events, and must not pop up.
  useEffect(() => {
    const id = currentUser?.userId
    if (!id) return
    setUserId(id)
  }, [currentUser?.userId])

  useEffect(() => {
    if (!userId) return
    loadNotifications()
  }, [userId, loadNotifications])

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification

          // A reconnect or resubscribe can deliver the same INSERT twice. Only
          // the first delivery updates the list and raises a toast.
          if (!claimRealtimeToast(newNotification.id)) return

          setNotifications(prev => {
            const updated = [newNotification, ...prev].slice(0, NOTIFICATIONS_LIMIT)
            // Invalidate cache with new data
            notificationsCache = { data: updated, timestamp: Date.now() }
            return updated
          })
          setUnreadCount(prev => prev + 1)

          // This is the ONLY toast in the component, and it only ever fires
          // for an event that happened while the user was connected.
          const toastConfig = getToastStyle(newNotification.type)
          toast(
            (t) => (
              <div
                onClick={() => {
                  toast.dismiss(t.id)
                  if (newNotification.link) {
                    routerRef.current.push(newNotification.link)
                  }
                }}
                style={{ cursor: newNotification.link ? 'pointer' : 'default' }}
              >
                <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{newNotification.title}</p>
                <p style={{ fontSize: '12px', opacity: 0.85 }}>{newNotification.message}</p>
              </div>
            ),
            {
              duration: 5000,
              icon: toastConfig.icon,
              style: { ...toastConfig.style, borderRadius: '12px' },
            }
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    onPanelChange?.(isOpen)
  }, [isOpen, onPanelChange])

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationRead(notificationId).catch(() => {})

    setNotifications(prev => {
      const updated = prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      notificationsCache = { data: updated, timestamp: Date.now() }
      return updated
    })
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const handleMarkAllAsRead = async () => {
    if (!userId) return
    await markAllNotificationsRead().catch(() => {})

    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }))
      notificationsCache = { data: updated, timestamp: Date.now() }
      return updated
    })
    setUnreadCount(0)
  }

  return (
    <div ref={bellRef} className="relative">
      {/*
        The trigger uses the same `.ff-icon-btn` surface as the drawer button, so
        the header reads as one symmetric control group. The bell is deliberately
        NOT on a high-contrast primary fill any more: a saturated teal disc at
        the top of every screen competed with the page title and the balance
        card. Attention now lives in the red unread counter alone, which keeps
        its size, position and contrast.
      */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ff-icon-btn relative"
        // Screen readers get the count from the button itself rather than
        // having to find the badge, which is aria-hidden decoration.
        aria-label={
          unreadCount > 0
            ? t('notificationsUnread', { count: unreadCount })
            : t('notifications')
        }
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationCenter
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
