'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Upload, Trash2, RefreshCw, Loader2, Bell } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { getTransactions, getBudgets, addTransaction, upsertBudget } from '@/lib/db'
import { createClient } from '@/lib/supabase/client'
import LoadingScreen from '@/components/ui/LoadingScreen'
import toast from 'react-hot-toast'

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-teal-600' : 'bg-gray-200'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  // Email notifications
  const [monthlyReport, setMonthlyReport] = useState(true)
  const [budgetAlerts, setBudgetAlerts] = useState(true)
  const [needHelp, setNeedHelp] = useState(true)

  // Push notifications
  const [pushEnabled, setPushEnabled] = useState(true)
  const [notifyBudgetAlerts, setNotifyBudgetAlerts] = useState(true)
  const [notifyLargeTransactions, setNotifyLargeTransactions] = useState(true)
  const [notifyDailySummary, setNotifyDailySummary] = useState(false)
  const [notifyReports, setNotifyReports] = useState(true)
  const [notifySystem, setNotifySystem] = useState(true)
  const [inappNotifications, setInappNotifications] = useState(true)
  const [inappBudgetAlerts, setInappBudgetAlerts] = useState(true)
  const [inappLargeTransactions, setInappLargeTransactions] = useState(true)
  const [inappDailySummary, setInappDailySummary] = useState(false)

  // App install / update
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'updating' | 'success' | 'latest' | 'error'>('idle')
  const [appVersion] = useState('1.0.0')

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {

        const { data } = await supabase.from('settings').select('*').eq('user_id', user.id).single()
        if (data) {
          setMonthlyReport(data.monthly_report !== false)
          setBudgetAlerts(data.budget_alerts !== false)
          setNeedHelp(data.need_help !== false)
          // Load notification preferences
          setPushEnabled(data.push_enabled !== false)
          setNotifyBudgetAlerts(data.notify_budget_alerts !== false)
          setNotifyLargeTransactions(data.notify_large_transactions !== false)
          setNotifyDailySummary(data.notify_daily_summary === true)
          setNotifyReports(data.notify_reports !== false)
          setNotifySystem(data.notify_system !== false)
          setInappNotifications(data.inapp_notifications !== false)
          setInappBudgetAlerts(data.inapp_budget_alerts !== false)
          setInappLargeTransactions(data.inapp_large_transactions !== false)
          setInappDailySummary(data.inapp_daily_summary === true)
        }
        

      }
      setLoading(false)
      setMounted(true)
    }
    load()

    // Check if app is installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }
    const handler = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (loading) return <LoadingScreen />
  if (!mounted) return null

  const saveNotificationSetting = async (key: string, value: boolean) => {
    if (key === 'monthly_report') setMonthlyReport(value)
    if (key === 'budget_alerts') setBudgetAlerts(value)
    if (key === 'need_help') setNeedHelp(value)
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    await supabase.from('settings').upsert({
      user_id: user.id,
      [key]: value
    }, { onConflict: 'user_id' })
  }

  const handleExport = async () => {
    const transactions = await getTransactions()
    const budgets = await getBudgets()
    const exportData = {
      exportDate: new Date().toISOString(),
      transactions,
      budgets
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finflow-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      const transactions = data.transactions || []
      const budgets = data.budgets || []
      
      let successCount = 0
      for (const t of transactions) {
        const result = await addTransaction({
          amount: Number(t.amount),
          type: t.type,
          category: t.category || 'Other',
          note: t.note || '',
          date: t.date,
        })
        if (result) successCount++
      }
      
      for (const b of budgets) {
        await upsertBudget({
          category: b.category,
          amount: Number(b.amount),
          month: b.month,
        })
      }
      
      setImportResult(`Imported ${successCount} transactions and ${budgets.length} budgets successfully`)
    } catch {
      setImportResult(t('errorOccurred'))
    }
  }

  const handleInstallApp = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setInstallPrompt(null)
  }

  const handleDeleteAll = async () => {
    if (deleteConfirmText !== 'Confirm') {
      alert('Please type Confirm exactly to proceed')
      return
    }
    
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    await supabase.from('transactions').delete().eq('user_id', user.id)
    await supabase.from('budgets').delete().eq('user_id', user.id)
    
    setDeleteConfirmText('')
    setShowDeleteModal(false)
    alert('All data deleted successfully')
  }

  const checkForUpdates = async () => {
    if (!('serviceWorker' in navigator)) {
      setUpdateStatus('error')
      setTimeout(() => setUpdateStatus('idle'), 3000)
      return
    }

    setUpdateStatus('checking')

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        setUpdateStatus('error')
        setTimeout(() => setUpdateStatus('idle'), 3000)
        return
      }

      await registration.update()

      // Wait briefly for update detection
      await new Promise((resolve) => setTimeout(resolve, 1500))

      if (registration.waiting) {
        setUpdateStatus('updating')
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        // Reload after a short delay to let SW activate
        setTimeout(() => window.location.reload(), 1000)
      } else {
        setUpdateStatus('latest')
        setTimeout(() => setUpdateStatus('idle'), 3000)
      }
    } catch {
      setUpdateStatus('error')
      setTimeout(() => setUpdateStatus('idle'), 3000)
    }
  }

  const getUpdateButtonContent = () => {
    switch (updateStatus) {
      case 'checking':
        return <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</>
      case 'updating':
        return <><Loader2 className="w-4 h-4 animate-spin" /> Installing update...</>
      case 'success':
        return <>Updated!</>
      case 'latest':
        return <>You&apos;re on the latest version!</>
      case 'error':
        return <>Couldn&apos;t check for updates</>
      default:
        return <><RefreshCw className="w-4 h-4" /> Check for Updates</>
    }
  }

  // AI usage combined bar — Moved to Profile page
  // Telegram / WhatsApp integrations — Moved to Profile page
  // About section — Moved to Profile page
  // Sign Out button — Moved to Profile page

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

        {/* App Install Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            App
          </h2>
          {isInstalled ? (
            <div className="flex items-center gap-3 py-2">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                <Image src="/icons/icon-72x72.png" alt="FinFlow" width={24} height={24} className="rounded-md" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">FinFlow is Installed</p>
                <p className="text-xs text-gray-400">You can open it from your home screen</p>
              </div>
              <span className="text-xs bg-teal-50 text-teal-700 font-semibold px-2 py-1 rounded-full">
                ✓ Installed
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                <Image src="/icons/icon-72x72.png" alt="FinFlow" width={24} height={24} className="rounded-md" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">Install FinFlow</p>
                <p className="text-xs text-gray-400">Add to home screen for quick access</p>
              </div>
              <button
                onClick={handleInstallApp}
                className="text-sm font-semibold px-4 py-2 rounded-xl text-white"
                style={{ background: '#0d9488' }}
              >
                Install
              </button>
            </div>
          )}
        </div>

        {/* App Updates */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            App Updates
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Current Version</span>
              <span className="text-sm font-medium text-gray-800">{appVersion}</span>
            </div>
            <button
              onClick={checkForUpdates}
              disabled={updateStatus === 'checking' || updateStatus === 'updating'}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: updateStatus === 'latest' ? '#ecfdf5' :
                  updateStatus === 'error' ? '#fef2f2' :
                    '#f0fdfa',
                color: updateStatus === 'latest' ? '#059669' :
                  updateStatus === 'error' ? '#dc2626' :
                    '#0d9488',
              }}
            >
              {getUpdateButtonContent()}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Updates install automatically. Use this button to check manually if you need the latest features.
            </p>
          </div>
        </div>

        {/* Email Notifications */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4 shadow-sm">
          <h3 className="font-semibold text-gray-800">Email Notifications</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Monthly Report</p>
              <p className="text-xs text-gray-400">Receive monthly summary by email</p>
            </div>
            <Toggle
              checked={monthlyReport}
              onChange={v => saveNotificationSetting('monthly_report', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Budget Alerts</p>
              <p className="text-xs text-gray-400">Get notified when budget limit is near</p>
            </div>
            <Toggle
              checked={budgetAlerts}
              onChange={v => saveNotificationSetting('budget_alerts', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Need Help</p>
              <p className="text-xs text-gray-400">Get tips and guidance by email</p>
            </div>
            <Toggle
              checked={needHelp}
              onChange={v => saveNotificationSetting('need_help', v)}
            />
          </div>
        </div>

        {/* Push & In-App Notifications */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Bell className="w-4 h-4 text-teal-600" /> Notifications
          </h3>

          {/* Browser Push master */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Browser Push Notifications</p>
              <p className="text-xs text-gray-400">Receive alerts even when app is closed</p>
            </div>
            <Toggle
              checked={pushEnabled}
              onChange={async v => {
                setPushEnabled(v)
                saveNotificationSetting('push_enabled', v)
                if (v) {
                  const { subscribeToPush } = await import('@/lib/push')
                  await subscribeToPush()
                }
              }}
            />
          </div>

          {/* Browser Push sub-toggles */}
          <div
            className={`pl-3 border-l-2 border-gray-100 space-y-3 transition-opacity duration-200 ${
              pushEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Budget Alerts</p>
                <p className="text-xs text-gray-400">Notify when spending reaches 80% of budget</p>
              </div>
              <Toggle
                checked={notifyBudgetAlerts}
                disabled={!pushEnabled}
                onChange={v => {
                  setNotifyBudgetAlerts(v)
                  saveNotificationSetting('notify_budget_alerts', v)
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Large Transactions</p>
                <p className="text-xs text-gray-400">Alert for transactions above &#8377;10,000</p>
              </div>
              <Toggle
                checked={notifyLargeTransactions}
                disabled={!pushEnabled}
                onChange={v => {
                  setNotifyLargeTransactions(v)
                  saveNotificationSetting('notify_large_transactions', v)
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Daily Summary</p>
                <p className="text-xs text-gray-400">Daily spending digest</p>
              </div>
              <Toggle
                checked={notifyDailySummary}
                disabled={!pushEnabled}
                onChange={v => {
                  setNotifyDailySummary(v)
                  saveNotificationSetting('notify_daily_summary', v)
                }}
              />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* In-App master */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">In-App Notifications</p>
              <p className="text-xs text-gray-400">Show notification bell icon alerts</p>
            </div>
            <Toggle
              checked={inappNotifications}
              onChange={v => {
                setInappNotifications(v)
                saveNotificationSetting('inapp_notifications', v)
              }}
            />
          </div>

          {/* In-App sub-toggles */}
          <div
            className={`pl-3 border-l-2 border-gray-100 space-y-3 transition-opacity duration-200 ${
              inappNotifications ? 'opacity-100' : 'opacity-30 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Budget Alerts</p>
                <p className="text-xs text-gray-400">In-app alert when budget limit is near</p>
              </div>
              <Toggle
                checked={inappBudgetAlerts}
                disabled={!inappNotifications}
                onChange={v => {
                  setInappBudgetAlerts(v)
                  saveNotificationSetting('inapp_budget_alerts', v)
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Large Transactions</p>
                <p className="text-xs text-gray-400">In-app alert for transactions above &#8377;10,000</p>
              </div>
              <Toggle
                checked={inappLargeTransactions}
                disabled={!inappNotifications}
                onChange={v => {
                  setInappLargeTransactions(v)
                  saveNotificationSetting('inapp_large_transactions', v)
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Daily Summary</p>
                <p className="text-xs text-gray-400">Daily spending digest in-app</p>
              </div>
              <Toggle
                checked={inappDailySummary}
                disabled={!inappNotifications}
                onChange={v => {
                  setInappDailySummary(v)
                  saveNotificationSetting('inapp_daily_summary', v)
                }}
              />
            </div>
          </div>
        </div>

        {/* Telegram — Moved to Profile page */}
        {/* WhatsApp — Moved to Profile page */}
        {/* AI Usage This Month — Moved to Profile page */}

        {/* Backup */}
        <Card className="border-gray-100">
          <CardHeader><CardTitle className="text-gray-800">{t('backup')}</CardTitle></CardHeader>
          <CardContent>
            <Button onClick={handleExport} variant="outline" className="w-full border-gray-200 text-gray-700">
              <Download className="w-4 h-4 mr-2" />{t('exportData')}
            </Button>
          </CardContent>
        </Card>

        {/* Restore */}
        <Card className="border-gray-100">
          <CardHeader><CardTitle className="text-gray-800">{t('restore')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="block">
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              <div className="w-full p-4 border-2 border-dashed border-gray-200 rounded-lg text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                <Upload className="w-6 h-6 mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">{t('importData')}</p>
              </div>
            </label>
            {importResult && <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg">{importResult}</p>}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-red-500">{t('dangerZone')}</CardTitle></CardHeader>
          <CardContent>
            <Button variant="destructive" className="w-full" onClick={() => setShowDeleteModal(true)}>
              <Trash2 className="w-4 h-4 mr-2" />{t('deleteAllData')}
            </Button>
            {showDeleteModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('deleteAllData')}</h3>
                  <p className="text-sm text-gray-600 mb-4">This will permanently delete all your transactions and budgets. Type Confirm to proceed.</p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type Confirm"
                    className="border-gray-200 mb-4"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }}>{t('cancel')}</Button>
                    <Button variant="destructive" onClick={handleDeleteAll}>{t('delete')}</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* About — Moved to Profile page */}
        {/* Sign Out — Moved to Profile page */}
      </div>
    </Layout>
  )
}
