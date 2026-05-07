import { createClient } from './supabase/client'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

let supabaseClient: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
}

async function getToken(): Promise<string | null> {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function request(path: string, options: RequestInit = {}) {
  console.log('[api-client] fetching:', `${API_BASE}${path}`)
  const token = await getToken()
  const headers: Record<string, string> = {}

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (options.headers) {
    Object.assign(headers, options.headers)
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(error.error || `API error: ${res.status}`)
  }

  return res.json()
}

async function requestMultipart(path: string, formData: FormData) {
  const token = await getToken()
  const headers: Record<string, string> = {}

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(error.error || `API error: ${res.status}`)
  }

  return res.json()
}

async function internalRequest(path: string, options: RequestInit = {}) {
  const internalSecret = process.env.NEXT_PUBLIC_INTERNAL_API_SECRET || ''
  const headers: Record<string, string> = {
    'x-internal-secret': internalSecret,
  }

  if (options.headers) {
    Object.assign(headers, options.headers)
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(error.error || `API error: ${res.status}`)
  }

  return res.json()
}

// ============ AI Endpoints ============

export async function aiParseText(text: string) {
  return request('/api/ai/parse-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
}

export async function aiParseReceipt(base64: string, mimeType: string) {
  return request('/api/ai/parse-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, mimeType }),
  })
}

export async function aiSpeechToText(formData: FormData) {
  return requestMultipart('/api/ai/speech-to-text', formData)
}

export async function aiInsights(transactions: unknown[]) {
  return request('/api/ai/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions }),
  })
}

export async function aiUsage() {
  return request('/api/ai/usage')
}

export async function aiReportSummary(data: {
  month: string
  firstName: string
  totalIncome: number
  totalExpense: number
  savingsRate: number
  [key: string]: unknown
}) {
  return request('/api/ai/report-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// ============ Auth Endpoints ============

export async function authVerifyTurnstile(token: string, email?: string) {
  return request('/api/auth/verify-turnstile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, email }),
  })
}

export async function authWelcomeEmail(fullName: string, email: string, userId?: string) {
  return request('/api/auth/welcome-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email, userId }),
  })
}

// ============ Test Auth Endpoints ============

export async function testAuth() {
  return request('/api/test-auth')
}

export async function testAuthAdmin() {
  return request('/api/test-auth/admin')
}

// ============ Notifications Endpoints ============

export async function getNotifications(limit = 20, unread = false) {
  return request(`/api/notifications?limit=${limit}&unread=${unread}`)
}

export async function markNotificationRead(notificationId: string) {
  return request('/api/notifications/mark-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notificationId }),
  })
}

export async function markAllNotificationsRead() {
  return request('/api/notifications/mark-all-read', { method: 'POST' })
}

export async function deleteNotification(id: string) {
  return request(`/api/notifications/${id}`, { method: 'DELETE' })
}

export async function sendNotification(data: {
  userId: string
  type: 'budget_alert' | 'report' | 'system'
  title: string
  message: string
  icon?: string
  link?: string
}) {
  return request('/api/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function budgetAlertCheck(userId: string) {
  const botSecret = process.env.NEXT_PUBLIC_BOT_SECRET || ''
  const res = await fetch(`${API_BASE}/api/notifications/budget-alert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bot-secret': botSecret,
    },
    body: JSON.stringify({ user_id: userId }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(error.error || `API error: ${res.status}`)
  }
  return res.json()
}

// ============ Feedback Endpoints ============

export async function submitFeedback(message: string, type: 'general' | 'bug' | 'feature' | 'other' = 'general') {
  return request('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, type }),
  })
}

// ============ Reports Endpoints ============

export async function getReports() {
  return request('/api/reports')
}

// ============ Admin Endpoints ============

export async function adminBan(data: {
  userId?: string
  action: 'ban' | 'unban' | 'ip_ban'
  reason?: string
  ipAddress?: string
}) {
  return request('/api/admin/ban', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function adminClearTestNotifications() {
  return request('/api/admin/clear-test-notifications', { method: 'POST' })
}

export async function adminGetFeedback() {
  return request('/api/admin/feedback')
}

export async function adminGetUsers() {
  return request('/api/admin/users')
}

export async function adminSendNotification(data: {
  type: string
  title: string
  message: string
  icon?: string
  link?: string
  sendPush?: boolean
  sendInApp?: boolean
  targetType: 'all' | 'specific'
  userIds?: string[]
}) {
  return request('/api/admin/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function adminVerify(password: string) {
  return request('/api/admin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
}

// ============ Ban Check Endpoints ============

export async function checkBan(userId: string) {
  return internalRequest(`/api/check-ban?userId=${encodeURIComponent(userId)}`)
}

export async function checkIpBan(ipAddress: string) {
  return internalRequest('/api/check-ip-ban', {
    headers: { 'x-forwarded-for': ipAddress },
  })
}

// ============ Track Login ============

export async function trackLogin(userId: string, email: string, ipAddress?: string) {
  return request('/api/track-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email, ipAddress }),
  })
}

// ============ Telegram Endpoints ============

export async function telegramNotify(chatId: string, type: 'connected' | 'disconnected') {
  return request('/api/telegram/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, type }),
  })
}

// ============ WhatsApp Endpoints ============

export async function whatsappNotify(phone: string, type: string, name: string) {
  return request('/api/whatsapp/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, type, name }),
  })
}

export async function whatsappCheckConnection() {
  return request('/api/whatsapp/check-connection')
}

// ============ Push Notifications Endpoints ============

export async function pushSubscribe(data: {
  endpoint: string
  keys: { p256dh: string; auth: string }
  userAgent?: string
}) {
  return request('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function pushSend(data: {
  title: string
  body?: string
  icon?: string
  link?: string
  tag?: string
}) {
  return request('/api/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function pushGetVapidPublicKey() {
  return request('/api/push/vapid-public-key')
}

// ============ Health Check ============

export async function healthCheck() {
  return request('/api/health')
}
