'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCheck, Bell, Trash2, Loader2,
  CheckSquare, Square, X, ArrowRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '@/components/layout/Layout'
import { createClient } from '@/lib/supabase/client'
import { getNotificationIcon, timeAgo } from '@/lib/notification-utils'
import NotificationsSkeleton from '@/components/skeletons/NotificationsSkeleton'
import toast from 'react-hot-toast'
import type { Notification } from '@/lib/types'
import { deleteNotification } from '@/lib/api-client'

const PAGE_SIZE = 20

/* ── Type badge config ───────────────────────────────────────────────── */
function typeBadge(type: string) {
  switch (type) {
    case 'budget_alert':
      return { label: 'Budget alert', cls: 'bg-amber-50 text-amber-800 border-amber-200' }
    case 'report':
      return { label: 'Report', cls: 'bg-green-50 text-green-800 border-green-200' }
    case 'transaction':
      return { label: 'Transaction', cls: 'bg-blue-50 text-blue-800 border-blue-200' }
    default:
      return { label: 'System', cls: 'bg-gray-100 text-gray-600 border-gray-200' }
  }
}

function typeIconBg(type: string) {
  switch (type) {
    case 'budget_alert': return 'bg-amber-50 text-amber-700'
    case 'report':       return 'bg-green-50 text-green-700'
    case 'transaction':  return 'bg-blue-50 text-blue-700'
    default:             return 'bg-gray-100 text-gray-500'
  }
}

/* ── Component ───────────────────────────────────────────────────────── */
export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications]   = useState<Notification[]>([])
  const [loading, setLoading]               = useState(true)
  const [loadingMore, setLoadingMore]       = useState(false)
  const [hasMore, setHasMore]               = useState(true)
  const [filter, setFilter]                 = useState<'all' | 'unread'>('all')
  const [userId, setUserId]                 = useState<string | null>(null)

  /* bulk select state */
  const [selectMode, setSelectMode]         = useState(false)
  const [selected, setSelected]             = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting]     = useState(false)

  /* ── Data loading ───────────────────────────────────────────────── */
  const loadNotifications = useCallback(async (offset = 0, append = false) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (data) {
      if (append) setNotifications(prev => [...prev, ...data])
      else setNotifications(data)
      setHasMore(data.length === PAGE_SIZE)
    }
  }, [router])

  useEffect(() => {
    const load = async () => {
      await loadNotifications(0, false)
      setLoading(false)
    }
    load()
  }, [loadNotifications])

  /* ── Single actions ─────────────────────────────────────────────── */
  const handleLoadMore = async () => {
    setLoadingMore(true)
    await loadNotifications(notifications.length, true)
    setLoadingMore(false)
  }

  const handleMarkAsRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const handleMarkAllAsRead = async () => {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    toast.success('All notifications marked as read')
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const removed = notifications.find(n => n.id === id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    try {
      await deleteNotification(id)
      toast.success('Notification deleted')
    } catch {
      if (removed) {
        setNotifications(prev =>
          [removed, ...prev].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        )
      }
      toast.error('Failed to delete notification')
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (selectMode) {
      toggleSelect(notification.id)
      return
    }
    if (!notification.read) handleMarkAsRead(notification.id)
    if (notification.link) router.push(notification.link)
  }

  /* ── Bulk select helpers ────────────────────────────────────────── */
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelected(new Set(filtered.map(n => n.id)))
  }

  const clearSelection = () => {
    setSelected(new Set())
    setSelectMode(false)
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    setBulkDeleting(true)

    /* optimistic remove */
    const removed = notifications.filter(n => ids.includes(n.id))
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)))
    setSelected(new Set())
    setSelectMode(false)

    try {
      await Promise.all(ids.map(id => deleteNotification(id)))
      toast.success(`${ids.length} notification${ids.length > 1 ? 's' : ''} deleted`)
    } catch {
      /* restore on failure */
      setNotifications(prev =>
        [...removed, ...prev].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      )
      toast.error('Failed to delete some notifications')
    }
    setBulkDeleting(false)
  }

  const handleBulkMarkRead = async () => {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).in('id', ids)
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n))
    setSelected(new Set())
    setSelectMode(false)
    toast.success(`${ids.length} notification${ids.length > 1 ? 's' : ''} marked as read`)
  }

  /* ── Derived ────────────────────────────────────────────────────── */
  if (loading) return <Layout><NotificationsSkeleton /></Layout>

  const filtered     = filter === 'unread' ? notifications.filter(n => !n.read) : notifications
  const unreadCount  = notifications.filter(n => !n.read).length
  const allSelected  = filtered.length > 0 && filtered.every(n => selected.has(n.id))

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <Layout>
      <div className="max-w-2xl mx-auto pb-8">

        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && !selectMode && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
            {filtered.length > 0 && (
              <button
                onClick={() => {
                  if (selectMode) { clearSelection() }
                  else setSelectMode(true)
                }}
                className={`text-sm font-medium px-3 py-1.5 rounded-xl transition-colors ${
                  selectMode
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {selectMode ? 'Cancel' : 'Select'}
              </button>
            )}
          </div>
        </div>

        {/* ── Filter tabs ──────────────────────────────────────────── */}
        <div className="flex gap-2 mb-4">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setSelected(new Set()) }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            </button>
          ))}
        </div>

        {/* ── Bulk action bar ──────────────────────────────────────── */}
        <AnimatePresence>
          {selectMode && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-4"
            >
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-3 flex items-center gap-2 flex-wrap">
                {/* select all toggle */}
                <button
                  onClick={allSelected ? () => setSelected(new Set()) : selectAll}
                  className="flex items-center gap-1.5 text-sm text-gray-600 font-medium px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  {allSelected
                    ? <CheckSquare className="w-4 h-4 text-teal-600" />
                    : <Square className="w-4 h-4" />
                  }
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>

                {selected.size > 0 && (
                  <>
                    <span className="text-xs text-gray-400 font-medium">
                      {selected.size} selected
                    </span>

                    {/* mark read */}
                    <button
                      onClick={handleBulkMarkRead}
                      className="flex items-center gap-1.5 text-sm text-teal-700 font-medium px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 transition-colors ml-auto"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Mark read
                    </button>

                    {/* bulk delete */}
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="flex items-center gap-1.5 text-sm text-red-600 font-medium px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {bulkDeleting
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />
                      }
                      Delete{selected.size > 1 ? ` (${selected.size})` : ''}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state ──────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-medium text-gray-600 text-sm">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {filter === 'unread' ? "You're all caught up!" : "We'll notify you when something happens."}
            </p>
          </div>
        ) : (
          /* ── Notification cards ─────────────────────────────────── */
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {filtered.map((notification, i) => {
                const badge    = typeBadge(notification.type)
                const iconBg   = typeIconBg(notification.type)
                const isSelected = selected.has(notification.id)

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`relative bg-white rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-400 ring-2 ring-teal-100'
                        : !notification.read
                        ? 'border-teal-100 shadow-sm'
                        : 'border-gray-100'
                    }`}
                  >
                    {/* Unread left accent */}
                    {!notification.read && !isSelected && (
                      <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-teal-500 rounded-full" />
                    )}

                    <div className="p-4">
                      {/* ── Card header ─────────────────────────── */}
                      <div className="flex items-start gap-3 mb-3">
                        {/* select checkbox in select mode */}
                        {selectMode && (
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                            isSelected ? 'bg-teal-600 border-teal-600' : 'border-gray-300'
                          }`}>
                            {isSelected && <X className="w-3 h-3 text-white" strokeWidth={3} />}
                          </div>
                        )}

                        {/* type icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                          <span className="text-base">
                            {notification.icon || getNotificationIcon(notification.type)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug ${
                              !notification.read
                                ? 'font-semibold text-gray-900'
                                : 'font-medium text-gray-500'
                            }`}>
                              {notification.title}
                            </p>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
                              {timeAgo(notification.created_at)}
                            </span>
                          </div>

                          {/* unread dot */}
                          {!notification.read && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 ml-1 align-middle" />
                          )}
                        </div>
                      </div>

                      {/* ── Message body ─────────────────────────── */}
                      <p className={`text-sm leading-relaxed mb-3 pl-12 ${
                        !notification.read ? 'text-gray-600' : 'text-gray-400'
                      } ${selectMode ? 'pl-20' : 'pl-12'}`}>
                        {notification.message}
                      </p>

                      {/* ── Card footer: badge + CTA + delete ────── */}
                      <div className={`flex items-center justify-between pt-3 border-t border-gray-50 ${
                        selectMode ? 'pl-8' : ''
                      }`}>
                        <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full border ${badge.cls}`}>
                          {badge.label}
                        </span>

                        <div className="flex items-center gap-2">
                          {notification.link && !selectMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!notification.read) handleMarkAsRead(notification.id)
                                router.push(notification.link!)
                              }}
                              className="flex items-center gap-1 text-xs text-teal-600 font-medium hover:text-teal-700 transition-colors"
                            >
                              View <ArrowRight className="w-3 h-3" />
                            </button>
                          )}

                          {!selectMode && (
                            <button
                              onClick={(e) => handleDelete(notification.id, e)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              aria-label="Delete notification"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* ── Load more ────────────────────────────────────────────── */}
        {hasMore && filtered.length >= PAGE_SIZE && (
          <div className="flex justify-center pt-4">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loadingMore ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
              ) : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
