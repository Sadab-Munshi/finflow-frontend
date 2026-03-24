import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/types'

const supabase = createClient()

export async function getNotifications(limit = 10, unreadOnly = false): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  const { data, error } = await query
  if (error) { console.error(error); return [] }
  return data || []
}

export async function getUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  if (error) { console.error(error); return 0 }
  return count || 0
}

export async function markAsRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
  return !error
}

export async function markAllAsRead(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)
    .select('id')

  if (error) { console.error(error); return 0 }
  return data?.length || 0
}

export function getNotificationIcon(type: string): string {
  switch (type) {
    case 'budget_alert': return '💰'
    case 'transaction': return '✅'
    case 'report': return '📊'
    case 'system': return '🔔'
    default: return '🔔'
  }
}

export function getNotificationColor(type: string): string {
  switch (type) {
    case 'budget_alert': return 'text-orange-500'
    case 'transaction': return 'text-green-500'
    case 'report': return 'text-blue-500'
    case 'system': return 'text-teal-500'
    default: return 'text-gray-500'
  }
}

export function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
