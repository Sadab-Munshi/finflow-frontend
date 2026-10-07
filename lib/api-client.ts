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

// Pre-signup check for the admin-set signup cap (finflow-api
// src/routes/auth.ts). The DB trigger is the real enforcement; this only
// drives the friendly UI. Callers must tolerate a failed call = "allowed".
export interface SignupStatus {
  allowed: boolean
  limit: number | null
  count: number | null
  remaining?: number
  mode?: 'open' | 'invite_only' | 'closed'
  allowed_domains?: string[] | null
  reason?: 'closed' | 'invite_only' | 'domain' | null
}

// Pass `email` to also evaluate the admin's allowed-domain list for that
// specific address (domain extracted server-side).
export async function authSignupStatus(email?: string): Promise<SignupStatus> {
  const qs = email ? `?email=${encodeURIComponent(email)}` : ''
  return request(`/api/auth/signup-status${qs}`)
}

// Public platform flags (maintenance / read-only / announcement). Never
// throws semantically — callers fail open (treat an unreachable API as
// "no maintenance") so the app never locks itself out on a network blip.
export async function authAppStatus(): Promise<{
  ok: boolean
  maintenance: boolean
  read_only: boolean
  announcement: string | null
}> {
  return request('/api/auth/app-status')
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

export async function authVerifyTurnstile(token: string) {
  return request('/api/auth/verify-turnstile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
}

export async function authWelcomeEmail(fullName: string, email: string) {
  return request('/api/auth/welcome-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email }),
  })
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

// BLOCKED until finflow-api accepts JWT auth on this endpoint.
// Required API change: mount authMiddleware on POST /api/notifications/budget-alert
// (finflow-api src/routes/notifications.ts:161) so the existing Bearer branch,
// which reads req.user.id, actually works. Today a JWT call returns 401 and the
// caller (app/add/hooks/useTransaction.tsx:19) swallows the failure via .catch().
export async function budgetAlertCheck(userId: string) {
  return request('/api/notifications/budget-alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
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

// ============ Ban Check Endpoints ============
// BLOCKED until finflow-api accepts JWT auth on these endpoints.
// Required API change (finflow-api src/routes/ban.ts:22,50): accept
// Authorization: Bearer <user JWT> as an alternative to x-internal-secret —
// verify via authMiddleware and restrict check-ban to userId === req.user.id
// (self-service only). Until then both calls return 401; callers fail-open
// (context/UserContext.tsx catch blocks treat errors as "not banned").

export async function checkBan(userId: string) {
  return request(`/api/check-ban?userId=${encodeURIComponent(userId)}`)
}

export async function checkIpBan(ipAddress: string) {
  return request('/api/check-ip-ban', {
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

// Presence ping. Goes THROUGH THE API (service role) rather than writing
// user_heartbeat with the anon key — direct client upserts were being
// silently RLS-rejected in prod, which is why "Online now" was always 0.
export async function sendHeartbeat() {
  return request('/api/track-login/heartbeat', { method: 'POST' })
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
