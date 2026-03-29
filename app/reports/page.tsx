'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Calendar, Info, Loader2 } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import LoadingScreen from '@/components/ui/LoadingScreen'
import toast from 'react-hot-toast'

interface Report {
  id: string
  user_id: string
  month: string
  year: number
  pdf_url: string
  generated_at: string
  file_size: number | null
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getNextMonthInfo(): { nextMonthName: string; nextYear: number } {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return {
    nextMonthName: next.toLocaleString('en-IN', { month: 'long' }),
    nextYear: next.getFullYear(),
  }
}

export default function ReportsPage() {
  const { t } = useLanguage()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/reports')
        if (res.ok) {
          const data = await res.json()
          setReports(data.reports || [])
        }
      } catch (err) {
        console.error('Failed to fetch reports:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  const handleDownload = async (report: Report) => {
    try {
      setDownloadingId(report.id)

      const response = await fetch(report.pdf_url)
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `FinFlow-Report-${report.month}-${report.year}.pdf`
      a.click()

      URL.revokeObjectURL(url)
      toast.success('Report downloaded!')
    } catch {
      toast.error('Download failed. Try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  if (loading) return <LoadingScreen />

  const { nextMonthName, nextYear } = getNextMonthInfo()

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('monthlyReports')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your financial reports are generated automatically on the 1st of each month
          </p>
        </div>

        {/* Report cards or empty state */}
        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">No reports yet</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your first report will be automatically generated on 1st {nextMonthName} {nextYear}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {report.month} {report.year}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Generated {formatDate(report.generated_at)}
                    </p>
                    {report.file_size && (
                      <p className="text-xs text-gray-400">
                        {formatFileSize(report.file_size)}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(report)}
                  disabled={downloadingId === report.id}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                >
                  {downloadingId === report.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Info banner */}
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
          <p className="text-sm text-teal-700 leading-relaxed">
            Reports are automatically generated on the 1st of each month and include your complete financial summary with AI-powered insights.
          </p>
        </div>
      </div>
    </Layout>
  )
}
