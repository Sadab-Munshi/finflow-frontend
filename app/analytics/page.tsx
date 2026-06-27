'use client'

import { useState, useEffect } from 'react'
import { BarChart2, AlertCircle, RefreshCw, Clock, TrendingUp } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { formatIST } from '@/lib/utils'
import {
  fetchRollingAverages,
  fetchCashFlowForecast,
  fetchAnomalyDetection,
  fetchYoYComparison,
} from '@/lib/analytics-api'
import type {
  RollingAveragesResponse,
  CashFlowForecastResponse,
  AnomalyDetectionResponse,
  YoYComparisonResponse,
} from '@/lib/analytics-types'
import RollingAveragesChart from '@/components/analytics/RollingAveragesChart'
import SeasonalityChart from '@/components/analytics/SeasonalityChart'
import AnomalyList from '@/components/analytics/AnomalyList'
import YoYComparison from '@/components/analytics/YoYComparison'
import AnalyticsSkeleton from '@/components/analytics/AnalyticsSkeleton'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rollingData, setRollingData] = useState<RollingAveragesResponse | null>(null)
  const [forecastData, setForecastData] = useState<CashFlowForecastResponse | null>(null)
  const [anomalyData, setAnomalyData] = useState<AnomalyDetectionResponse | null>(null)
  const [yoyData, setYoYData] = useState<YoYComparisonResponse | null>(null)

  async function loadAll(forceRefresh = false) {
    if (forceRefresh) {
      setRefreshing(true)
    }
    setError(null)

    try {
      const [rolling, forecast, anomaly, yoy] = await Promise.all([
        fetchRollingAverages(forceRefresh),
        fetchCashFlowForecast(forceRefresh),
        fetchAnomalyDetection(forceRefresh),
        fetchYoYComparison(forceRefresh),
      ])

      setRollingData(rolling)
      setForecastData(forecast)
      setAnomalyData(anomaly)
      setYoYData(yoy)
    } catch (err: any) {
      setError(err?.message || 'Failed to load analytics data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  if (loading) {
    return (
      <Layout>
        <AnalyticsSkeleton />
      </Layout>
    )
  }

  // Find the most recent computed_at across all responses
  const timestamps = [rollingData?.computed_at, forecastData?.computed_at, anomalyData?.computed_at, yoyData?.computed_at]
    .filter(Boolean) as string[]
  const lastUpdated = timestamps.length > 0
    ? formatIST(timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0])
    : null

  return (
    <Layout>
      <div className="space-y-4 pb-6">
        {/* Page Header */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0F172A]">Analytics</h1>
              <BarChart2 className="w-6 h-6 text-[#0A7B7B]" />
            </div>
            <button
              onClick={() => loadAll(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 bg-[#F0FDF9] text-[#0A7B7B] border border-[#0A7B7B]/20 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <p className="text-sm mt-1 text-[#6B7280]">Statistical analysis of your financial data</p>
          {lastUpdated && (
            <span className="inline-flex items-center gap-1.5 text-[#9CA3AF] text-xs mt-2">
              <Clock className="w-3 h-3" />
              Last updated: {lastUpdated}
            </span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Charts: Rolling Averages + Seasonality (side by side on desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 md:p-5">
            <h2 className="text-base font-semibold text-[#0F172A]">Spending Trends</h2>
            <p className="text-xs text-[#64748B] mb-1">7-day and 30-day rolling averages</p>
            {rollingData?.data?.daily ? (
              <RollingAveragesChart data={rollingData.data.daily} />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-[#9CA3AF] text-sm">
                No data available
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 md:p-5">
            <h2 className="text-base font-semibold text-[#0F172A]">Day-of-Week Patterns</h2>
            <p className="text-xs text-[#64748B] mb-1">Average spend by day vs overall average</p>
            {rollingData?.data?.seasonality ? (
              <SeasonalityChart data={rollingData.data.seasonality} />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-[#9CA3AF] text-sm">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Cash Flow Forecast */}
        {forecastData?.data && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 md:p-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="text-base font-semibold text-[#0F172A]">Cash Flow Forecast</h2>
                <p className="text-xs text-[#64748B]">90-day projection based on your recorded transaction history</p>
              </div>
              {forecastData.data.projection.length > 0 && (
                <div className="text-right">
                  <span className="text-xs text-[#64748B]">Confidence</span>
                  <p className={`text-lg font-bold ${
                    forecastData.data.confidence >= 0.75 ? 'text-[#0A7B7B]' :
                    forecastData.data.confidence >= 0.50 ? 'text-[#F59E0B]' :
                    'text-[#EF4444]'
                  }`}>
                    {(forecastData.data.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              )}
            </div>
            {forecastData.data.projection.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="bg-[#F0FDF9] rounded-xl p-3 text-center">
                  <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">Net Balance</p>
                  <p className="text-sm font-bold text-[#0F172A] mt-1">
                    {isFinite(forecastData.data.netBalance)
                      ? `₹${Math.round(forecastData.data.netBalance).toLocaleString('en-IN')}`
                      : '—'}
                  </p>
                  <p className="text-[9px] text-[#94A3B8] mt-0.5">from transactions</p>
                </div>
                <div className="bg-[#FAF9FF] rounded-xl p-3 text-center">
                  <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">30-Day</p>
                  <p className="text-sm font-bold text-[#0F172A] mt-1">
                    {forecastData.data.projection[29] && isFinite(forecastData.data.projection[29].projectedBalance)
                      ? `₹${Math.round(forecastData.data.projection[29].projectedBalance).toLocaleString('en-IN')}`
                      : '—'}
                  </p>
                </div>
                <div className="bg-[#FFF7ED] rounded-xl p-3 text-center">
                  <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">90-Day</p>
                  <p className="text-sm font-bold text-[#0F172A] mt-1">
                    {forecastData.data.projection[89] && isFinite(forecastData.data.projection[89].projectedBalance)
                      ? `₹${Math.round(forecastData.data.projection[89].projectedBalance).toLocaleString('en-IN')}`
                      : '—'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-3 py-6 flex flex-col items-center justify-center gap-2 text-center">
                <BarChart2 className="w-8 h-8 text-[#CBD5E1]" />
                <p className="text-sm text-[#64748B] font-medium">Not enough data yet</p>
                <p className="text-xs text-[#94A3B8]">Add transactions across at least 7 different days to generate a forecast</p>
              </div>
            )}
          </div>
        )}

        {/* Year-over-Year Comparison */}
        {yoyData?.data && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[#0A7B7B]" />
              <h2 className="text-base font-semibold text-[#0F172A]">Year-over-Year Comparison</h2>
            </div>
            <YoYComparison data={yoyData.data} />
          </div>
        )}

        {/* Anomaly Detection */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 md:p-5">
          <h2 className="text-base font-semibold text-[#0F172A] mb-1">Anomaly Detection</h2>
          <p className="text-xs text-[#64748B] mb-3">Transactions flagged as unusually high or low</p>
          {anomalyData?.data ? (
            <AnomalyList data={anomalyData.data} />
          ) : (
            <div className="py-8 text-center text-[#9CA3AF] text-sm">No data available</div>
          )}
        </div>
      </div>
    </Layout>
  )
}
