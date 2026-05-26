'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
      return { label: 'Budget', cls: 'bg-amber-50 text-amber-800 border-amber-200' }
    case 'report':
      return { label: 'Report', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
    case 'transaction':
      return { label: 'Transaction', cls: 'bg-sky-50 text-sky-800 border-sky-200' }
    default:
      return { label: 'System', cls: 'bg-slate-100 text-slate-600 border-slate-200' }
  }
}

function typeIconBg(type: string) {
  switch (type) {
    case 'budget_alert': return 'bg-amber-100 text-amber-700 shadow-amber-100'
    case 'report':       return 'bg-emerald-100 text-emerald-700 shadow-emerald-100'
    case 'transaction':  return 'bg-sky-100 text-sky-700 shadow-sky-100'
    default:             return 'bg-slate-100 text-slate-500 shadow-slate-100'
  }
}

function groupLabel(createdAt: string) {
  const date = new Date(createdAt)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (sameDay(date, today)) return 'Today'
  if (sameDay(date, yesterday)) return 'Yesterday'
  return 'Earlier'
}

/* ── Component ───────────────────────────────────────────────────────── */
export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [userId, setUserId] = useState<string | null>(null)

  /* bulk select state */
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

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
    load()  }, [loadNotifications])

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

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
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
    if (notification.link) router.push(notification.link)  }

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

    const removed = notifications.filter(n => ids.includes(n.id))
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)))
    setSelected(new Set())
    setSelectMode(false)

    try {
      await Promise.all(ids.map(id => deleteNotification(id)))
      toast.success(`${ids.length} notification${ids.length > 1 ? 's' : ''} deleted`)
    } catch {
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
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n))    setSelected(new Set())
    setSelectMode(false)
    toast.success(`${ids.length} notification${ids.length > 1 ? 's' : ''} marked as read`)
  }

  /* ── Derived (Optimized with useMemo) ───────────────────────────── */
  const { filtered, unreadCount, grouped, groupOrder, allSelected } = useMemo(() => {
    const filteredList = filter === 'unread' ? notifications.filter(n => !n.read) : notifications
    const unread = notifications.filter(n => !n.read).length

    const groupedList = filteredList.reduce<Record<string, Notification[]>>((acc, notification) => {
      const label = groupLabel(notification.created_at)
      acc[label] = acc[label] || []
      acc[label].push(notification)
      return acc
    }, {})

    const order = ['Today', 'Yesterday', 'Earlier'].filter(label => groupedList[label]?.length)
    const allSel = filteredList.length > 0 && filteredList.every(n => selected.has(n.id))

    return {
      filtered: filteredList,
      unreadCount: unread,
      grouped: groupedList,
      groupOrder: order,
      allSelected: allSel
    }
  }, [notifications, filter, selected])

  if (loading) return <Layout><NotificationsSkeleton /></Layout>

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <Layout>
      <div className="max-w-3xl mx-auto pb-28 sm:pb-10">
        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 p-5 sm:p-6 mb-5 text-white shadow-lg shadow-teal-100">
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/15" />
          <div className="absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-white/10" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/20 mb-3">
                <Bell className="h-3.5 w-3.5" />
                Notification centre
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Stay updated</h1>
              <p className="text-sm text-white/80 mt-1">
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''} need your attention.` : "You're all caught up."}
              </p>            </div>

            <div className="flex flex-col items-end gap-2">
              {unreadCount > 0 && !selectMode && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-teal-700 shadow-sm transition hover:bg-teal-50"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              {filtered.length > 0 && (
                <button
                  onClick={() => selectMode ? clearSelection() : setSelectMode(true)}
                  className="rounded-full bg-white/15 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
                >
                  {selectMode ? 'Cancel' : 'Select'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Filter tabs ──────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 -mx-1 mb-4 bg-gray-50/85 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-gray-50/60">
          <div className="flex items-center gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-gray-100">
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setSelected(new Set()) }}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  filter === f
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {f === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` ${unreadCount}` : ''}`}
              </button>
            ))}
          </div>
        </div>

        {/* ── Select mode helper ───────────────────────────────────── */}
        <AnimatePresence>
          {selectMode && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}              transition={{ duration: 0.18 }}
              className="mb-4 flex items-center justify-between rounded-2xl border border-teal-100 bg-teal-50 px-3 py-2"
            >
              <button
                onClick={allSelected ? () => setSelected(new Set()) : selectAll}
                className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-teal-800"
              >
                {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
              <span className="text-xs font-semibold text-teal-700">
                {selected.size} selected
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state ──────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="rounded-[1.75rem] border border-gray-100 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100">
              <Bell className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-semibold text-slate-700">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {filter === 'unread' ? "You're all caught up!" : "We'll notify you when something important happens."}
            </p>
          </div>
        ) : (
          /* ── Timeline notification feed ─────────────────────────── */
          <div className="space-y-6">
            {groupOrder.map(group => (
              <section key={group}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{group}</h2>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>

                <div className="relative space-y-3 before:absolute before:left-[1.12rem] before:top-5 before:bottom-5 before:w-px before:bg-gradient-to-b before:from-teal-200 before:via-slate-200 before:to-transparent">
                  <AnimatePresence initial={false}>
                    {grouped[group].map((notification, i) => {
                      const badge      = typeBadge(notification.type)
                      const iconBg     = typeIconBg(notification.type)
                      const isSelected = selected.has(notification.id)

                      return (
                        <motion.div
                          key={notification.id}                          layout
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -24, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.22, delay: i * 0.025 }}
                          onClick={() => handleNotificationClick(notification)}
                          className="group relative grid grid-cols-[2.25rem_1fr] gap-3 cursor-pointer"
                        >
                          {/* Timeline icon */}
                          <div className="relative z-[1] pt-1">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-2xl shadow-sm ${iconBg} ${!notification.read ? 'ring-4 ring-teal-50' : 'ring-4 ring-white'}`}>
                              <span className="text-base leading-none">
                                {notification.icon || getNotificationIcon(notification.type)}
                              </span>
                            </div>
                          </div>

                          {/* Content card */}
                          <div
                            className={`relative overflow-hidden rounded-[1.35rem] border bg-white p-4 shadow-sm transition-all sm:p-5 ${
                              isSelected
                                ? 'border-teal-400 ring-4 ring-teal-50'
                                : !notification.read
                                ? 'border-teal-100 shadow-teal-50'
                                : 'border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            {!notification.read && !isSelected && (
                              <div className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-teal-500 shadow-[0_0_0_4px_rgba(20,184,166,0.12)]" />
                            )}

                            <div className="flex items-start gap-3">
                              {selectMode && (
                                <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
                                  isSelected ? 'border-teal-600 bg-teal-600' : 'border-slate-300 bg-white'
                                }`}>
                                  {isSelected && <X className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                                </div>
                              )}

                              <div className="min-w-0 flex-1 pr-4">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                  <p className={`text-sm leading-snug ${
                                    !notification.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-600'
                                  }`}>
                                    {notification.title}
                                  </p>
                                  <span className="whitespace-nowrap text-xs font-medium text-slate-400">
                                    {timeAgo(notification.created_at)}
                                  </span>                                </div>

                                <p className={`mt-2 text-sm leading-relaxed ${
                                  !notification.read ? 'text-slate-600' : 'text-slate-400'
                                }`}>
                                  {notification.message}
                                </p>

                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badge.cls}`}>
                                    {badge.label}
                                  </span>

                                  {!selectMode && (
                                    <div className="flex items-center gap-1.5">
                                      {notification.link && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (!notification.read) handleMarkAsRead(notification.id)
                                            router.push(notification.link!)
                                          }}
                                          className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-teal-700 transition hover:bg-teal-50"
                                        >
                                          View <ArrowRight className="w-3 h-3" />
                                        </button>
                                      )}

                                      <button
                                        onClick={(e) => handleDelete(notification.id, e)}
                                        className="hidden h-8 w-8 items-center justify-center rounded-full text-slate-300 transition hover:bg-red-50 hover:text-red-500 group-hover:flex sm:flex"
                                        aria-label="Delete notification"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </section>
            ))}
          </div>
        )}
        {/* ── Load more ────────────────────────────────────────────── */}
        {hasMore && filtered.length >= PAGE_SIZE && (
          <div className="flex justify-center pt-6">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
            >
              {loadingMore ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
              ) : 'Load more'}
            </button>
          </div>
        )}

        {/* ── Sticky mobile-first bulk action bar ──────────────────── */}
        <AnimatePresence>
          {selectMode && selected.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl sm:bottom-6"
            >
              <div className="rounded-[1.5rem] border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-slate-200/80 backdrop-blur">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 px-3">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {selected.size} selected
                    </p>
                    <p className="text-xs text-slate-400">Choose an action</p>
                  </div>

                  <button
                    onClick={handleBulkMarkRead}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-teal-50 px-3 py-3 text-xs font-bold text-teal-700 transition hover:bg-teal-100 sm:px-4"
                  >
                    <CheckCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Mark read</span>
                  </button>

                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-red-50 px-3 py-3 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50 sm:px-4"
                  >
                    {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    <span className="hidden sm:inline">Delete</span>                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  )
}
