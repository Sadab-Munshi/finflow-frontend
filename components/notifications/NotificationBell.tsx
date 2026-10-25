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

// ── Toast ledger ──────────────────────────────────────────────────────────
//
// Which notifications have already been surfaced as toasts is tracked in the
// BROWSER, not in the database.
//
// Two earlier designs failed:
//   * writing `read: true` cleared the unread badge just for opening the app;
//   * writing a `shown` column threw PGRST204 — that column is not in the live
//     schema, so every toast produced a 400 and a server log line.
//
// A toast is a per-session UI concern, so it needs no persistence at all.
// `sessionStorage` survives the remount that every navigation causes (the
// layout chrome is rendered by each page, not a shared app/layout.tsx) AND a
// page reload, while starting clean in a new tab.
const TOAST_LEDGER_KEY = 'ff-toasted-notifications'

// Module-scope guard: the storage read is synchronous but the toast sequence is
// async, and two chrome instances mount at once (app/*/loading.tsx + the page).
// This claims the session before either instance can start, so they cannot
// both toast the same rows.
let ledgerClaimedForUserId: string | null = null

function readToastedIds(): Set<string> {
  try {
    const raw = window.sessionStorage.getItem(TOAST_LEDGER_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [])
  } catch {
    // Private mode / storage disabled: fall back to no memory. The module
    // guard still prevents repeats within this page session.
    return new Set()
  }
}

function rememberToastedIds(ids: string[]): void {
  if (ids.length === 0) return
  try {
    const merged = readToastedIds()
    for (const id of ids) merged.add(id)
    // Keep the ledger bounded — only recent notifications are ever candidate
    // toasts (the query asks for 2), so old ids are dead weight.
    const trimmed = Array.from(merged).slice(-100)
    window.sessionStorage.setItem(TOAST_LEDGER_KEY, JSON.stringify(trimmed))
  } catch {
    /* storage unavailable — the module guard is the remaining protection */
  }
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

export default function NotificationBell() {
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

  // Show toasts for unread notifications that have not already been toasted in
  // this browser session.
  //
  // Deliberately depends on nothing that changes during navigation: listing
  // `showUnseenToasts` (which itself depended on `router`) in the mount
  // effect's deps is what made every route change replay the toasts.
  const showUnseenToasts = useCallback(async (uid: string) => {
    if (ledgerClaimedForUserId === uid) return

    let unseen: Notification[] = []
    try {
      // `unread=true` filters on `read` — the only toast-related column that
      // actually exists in the live schema.
      const payload = await getNotifications(2, true)
      unseen = (payload?.notifications ?? []) as Notification[]
    } catch {
      // Leave the session unclaimed so a later mount can retry.
      return
    }

    // Claim the session BEFORE awaiting anything else.
    ledgerClaimedForUserId = uid

    const alreadyToasted = readToastedIds()
    const data = unseen.filter((n) => !alreadyToasted.has(n.id)).slice(0, 2)
    if (data.length === 0) return

    // Record them locally so a reload or remount never repeats them.
    rememberToastedIds(data.map((n) => n.id))

    // Display a toast for each unseen notification
    data.forEach((n: Notification) => {
      const toastConfig = getToastStyle(n.type)
      toast(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t.id)
              if (n.link) {
                routerRef.current.push(n.link)
              }
            }}
            style={{ cursor: n.link ? 'pointer' : 'default' }}
          >
            <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{n.title}</p>
            <p style={{ fontSize: '12px', opacity: 0.85 }}>{n.message}</p>
          </div>
        ),
        {
          duration: 6000,
          icon: toastConfig.icon,
          style: { ...toastConfig.style, borderRadius: '12px' },
        }
      )
    })
  }, [])

  // The signed-in user comes from UserProvider — a second auth.getUser() here
  // was one of the duplicate requests on first paint.
  const { user: currentUser } = useUser()

  // Fires once per user per page session. `showUnseenToasts` is intentionally
  // absent from the deps — it is stable, and depending on it re-ran the whole
  // toast sequence on every remount.
  useEffect(() => {
    const id = currentUser?.userId
    if (!id) return
    setUserId(id)
    showUnseenToasts(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          setNotifications(prev => {
            const updated = [newNotification, ...prev].slice(0, NOTIFICATIONS_LIMIT)
            // Invalidate cache with new data
            notificationsCache = { data: updated, timestamp: Date.now() }
            return updated
          })
          setUnreadCount(prev => prev + 1)

          // Remember the toast locally so a remount or reload does not repeat
          // it. Nothing is written to the database — a toast is not a read.
          rememberToastedIds([newNotification.id])

          // Show toast notification
          const toastConfig = getToastStyle(newNotification.type)
          toast(
            (t) => (
              <div
                onClick={() => {
                  toast.dismiss(t.id)
                  if (newNotification.link) {
                    router.push(newNotification.link)
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
        aria-label={t('notifications')}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 ring-2 ring-white">
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
