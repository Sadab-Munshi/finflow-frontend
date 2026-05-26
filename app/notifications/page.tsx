'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCheck, Bell, Trash2, Loader2,
  CheckSquare, Square, X, ArrowRight,
  Search, MoreVertical
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

/* ── Type icon config ───────────────────────────────────────────────── */
function typeIconBg(type: string) {
  switch (type) {
    case 'budget_alert': return 'bg-amber-50 text-amber-600'
    case 'report':       return 'bg-emerald-50 text-emerald-600'
    case 'transaction':  return 'bg-[#F0FDF9] text-[#0A7B7B]'
    default:             return 'bg-slate-50 text-slate-500'
  }
}

function formatDateLabel(createdAt: string) {
  const date = new Date(createdAt)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (sameDay(date, today)) return 'Today'
  if (sameDay(date, yesterday)) return 'Yesterday'
  
  // Format as "Monday, October 11, 2024"
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'   })
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
  const [searchQuery, setSearchQuery] = useState('')

  /* bulk select state */
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [menuOpen, setMenuOpen] = useState(false)
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
    load()
  }, [loadNotifications])

  /* ── Single actions ─────────────────────────────────────────────── */
  const handleLoadMore = async () => {    setLoadingMore(true)
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
    if (notification.link) router.push(notification.link)
  }

  /* ── Bulk select helpers ────────────────────────────────────────── */
  const toggleSelect = (id: string) => {    setSelected(prev => {
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
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n))
    setSelected(new Set())
    setSelectMode(false)
    toast.success(`${ids.length} notification${ids.length > 1 ? 's' : ''} marked as read`)
  }
  /* ── Derived (Optimized) ────────────────────────────────────────── */
  const { filtered, unreadCount, totalCount, grouped, groupOrder, allSelected } = useMemo(() => {
    const filteredList = filter === 'unread' ? notifications.filter(n => !n.read) : notifications
    const unread = notifications.filter(n => !n.read).length
    const total = notifications.length

    // Apply search filter
    const searchFiltered = searchQuery
      ? filteredList.filter(n => 
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.message.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : filteredList

    const groupedList = searchFiltered.reduce<Record<string, Notification[]>>((acc, notification) => {
      const label = formatDateLabel(notification.created_at)
      acc[label] = acc[label] || []
      acc[label].push(notification)
      return acc
    }, {})

    // Sort groups chronologically (Today first, then Yesterday, then dates)
    const order = Object.keys(groupedList).sort((a, b) => {
      if (a === 'Today') return -1
      if (b === 'Today') return 1
      if (a === 'Yesterday') return -1
      if (b === 'Yesterday') return 1
      return new Date(b).getTime() - new Date(a).getTime()
    })

    const allSel = searchFiltered.length > 0 && searchFiltered.every(n => selected.has(n.id))

    return {
      filtered: searchFiltered,
      unreadCount: unread,
      totalCount: total,
      grouped: groupedList,
      groupOrder: order,
      allSelected: allSel
    }
  }, [notifications, filter, selected, searchQuery])

  if (loading) return <Layout><NotificationsSkeleton /></Layout>

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <Layout>
      <div className="w-full bg-white min-h-screen sm:min-h-0">
                {/* ── Header ────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="w-9" />

            <h1 className="text-lg font-semibold text-slate-900">Notifications</h1>

            <div className="w-9" />
          </div>

          {/* ── Search bar ──────────────────────────────────────── */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 border-none outline-none focus:ring-2 focus:ring-[#0A7B7B]/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* ─ Filter tabs & Mark all read ─────────────────────── */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setFilter('all'); setSelected(new Set()) }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-[#0A7B7B] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                All
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  filter === 'all' ? 'bg-white/20' : 'bg-slate-200'
                }`}>
                  {totalCount}
                </span>
              </button>
              
              <button
                onClick={() => { setFilter('unread'); setSelected(new Set()) }}                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filter === 'unread'
                    ? 'bg-[#0A7B7B] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                Unread
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  filter === 'unread' ? 'bg-white/20' : 'bg-slate-200'
                }`}>
                  {unreadCount}
                </span>
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(prev => !prev)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-slate-500" />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 top-10 z-20 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden w-52"
                    >
                      {unreadCount > 0 && (
                        <button
                          onClick={() => { handleMarkAllAsRead(); setMenuOpen(false) }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#0F172A] hover:bg-[#F0FDF9] transition-colors"
                        >
                          <CheckCheck className="w-4 h-4 text-[#0A7B7B]" />
                          Mark all as read
                        </button>
                      )}
                      <button
                        onClick={() => { setSelectMode(true); setMenuOpen(false) }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#0F172A] hover:bg-[#F0FDF9] transition-colors border-t border-[#F1F5F9]"
                      >
                        <CheckSquare className="w-4 h-4 text-[#0A7B7B]" />
                        Select messages
                      </button>
                      <button
                        onClick={() => { selectAll(); setSelectMode(true); setMenuOpen(false) }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#0F172A] hover:bg-[#F0FDF9] transition-colors border-t border-[#F1F5F9]"
                      >
                        <Square className="w-4 h-4 text-[#0A7B7B]" />
                        Select all
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Select mode helper ────────────────────────────────── */}
        <AnimatePresence>
          {selectMode && filtered.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-slate-100 bg-[#F0FDF9]/50"
            >
              <div className="flex items-center justify-between px-4 py-2.5">
                <button
                  onClick={allSelected ? () => setSelected(new Set()) : selectAll}
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"
                >
                  {allSelected ? <CheckSquare className="w-4 h-4 text-[#0A7B7B]" /> : <Square className="w-4 h-4" />}
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
                <span className="text-xs font-medium text-slate-400">
                  {selected.size} selected
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* ─ Notification list ─────────────────────────────────── */}
        {filtered.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center px-4 py-16">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center">
                <Bell className="w-10 h-10 text-slate-300" />
              </div>
              {searchQuery && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                  <X className="w-3 h-3 text-slate-400" />
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-slate-500">
              {searchQuery ? 'No matching notifications' : filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1 text-center">
              {searchQuery 
                ? 'Try adjusting your search'
                : filter === 'unread' 
                  ? "You're all caught up!" 
                  : "We'll notify you when something happens."
              }
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 rounded-full bg-[#F0FDF9] text-[#0A7B7B] text-xs font-semibold hover:bg-[#E6F7F7] transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          /* ── Grouped notifications ───────────────────────────── */
          <div className="divide-y divide-[#F1F5F9]">
            {groupOrder.map(group => (
              <section key={group}>
                {/* Group header */}
                <div className="sticky top-[132px] z-10 bg-[#F8FAFC] backdrop-blur-sm px-4 py-2 border-y border-[#E2E8F0]">
                  <h2 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    {group}
                  </h2>
                </div>

                {/* Notifications */}
                <div>
                  <AnimatePresence initial={false}>                    {grouped[group].map((notification, i) => {
                      const iconBg = typeIconBg(notification.type)
                      const isSelected = selected.has(notification.id)

                      return (
                        <motion.div
                          key={notification.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => handleNotificationClick(notification)}
                          className={`group flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors border-l-[3px] ${
                            isSelected
                              ? 'bg-[#F0FDF9]/50 border-l-[#0A7B7B]'
                              : !notification.read
                                ? 'bg-[#F0FDF9]/40 border-l-[#0A7B7B] hover:bg-[#F0FDF9]/60'
                                : 'border-l-transparent hover:bg-slate-50/50'
                          }`}
                        >
                          {/* Select checkbox */}
                          {selectMode && (
                            <div 
                              onClick={(e) => { e.stopPropagation(); toggleSelect(notification.id) }}
                              className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-[#0A7B7B] border-[#0A7B7B]'
                                  : 'border-slate-300 hover:border-slate-400'
                              }`}
                            >
                              {isSelected && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                            </div>
                          )}

                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                            <span className="text-base">
                              {notification.icon || getNotificationIcon(notification.type)}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm leading-snug ${
                                !notification.read ? 'font-bold text-[#0F172A]' : 'font-medium text-slate-500'
                              }`}>
                                {notification.title}
                              </p>
                              
                              {/* Unread dot */}
                              {!notification.read && (
                                <span className="w-2.5 h-2.5 rounded-full bg-[#0A7B7B] mt-1 flex-shrink-0" />                              )}
                            </div>
                            
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[11px] text-slate-400">
                                {timeAgo(notification.created_at)}
                              </span>
                              
                              {/* Actions */}
                              {!selectMode && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {notification.link && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (!notification.read) handleMarkAsRead(notification.id)
                                        router.push(notification.link!)
                                      }}
                                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#0A7B7B] transition-colors"
                                    >
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => handleDelete(notification.id, e)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
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

        {/* ── Load more ─────────────────────────────────────────── */}
        {hasMore && filtered.length >= PAGE_SIZE && (
          <div className="flex justify-center py-4 border-t border-slate-100">            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-5 py-2 rounded-full text-xs font-semibold text-[#0A7B7B] bg-[#F0FDF9] hover:bg-[#E6F7F7] transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
                </span>
              ) : 'Load more'}
            </button>
          </div>
        )}

        {/* ─ Sticky bulk action bar (mobile) ───────────────────── */}
        <AnimatePresence>
          {selectMode && selected.size > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-4 py-3 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">
                  {selected.size} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkMarkRead}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-[#0A7B7B] bg-[#F0FDF9] hover:bg-[#E6F7F7] transition-colors"
                  >
                    Mark read
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {bulkDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      `Delete (${selected.size})`
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>      </div>
    </Layout>
  )
}
