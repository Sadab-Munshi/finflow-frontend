import { createClient } from './supabase/client'
import type {
  RollingAveragesResponse,
  CashFlowForecastResponse,
  AnomalyDetectionResponse,
  YoYComparisonResponse,
} from './analytics-types'

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

async function request(path: string) {
  const token = await getToken()
  const headers: Record<string, string> = {}

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { headers })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(error.error || `API error: ${res.status}`)
  }

  return res.json()
}

export async function fetchRollingAverages(forceRefresh = false): Promise<RollingAveragesResponse> {
  const qs = forceRefresh ? '?refresh=true' : ''
  return request(`/api/analytics/rolling-averages${qs}`)
}

export async function fetchCashFlowForecast(forceRefresh = false): Promise<CashFlowForecastResponse> {
  const qs = forceRefresh ? '?refresh=true' : ''
  return request(`/api/analytics/cash-flow-forecast${qs}`)
}

export async function fetchAnomalyDetection(forceRefresh = false): Promise<AnomalyDetectionResponse> {
  const qs = forceRefresh ? '?refresh=true' : ''
  return request(`/api/analytics/anomaly-detection${qs}`)
}

export async function fetchYoYComparison(forceRefresh = false): Promise<YoYComparisonResponse> {
  const qs = forceRefresh ? '?refresh=true' : ''
  return request(`/api/analytics/yoy-comparison${qs}`)
}
