'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, Loader2, CheckCircle, XCircle,
  Download, AlertTriangle, Trash2, ArrowLeft, X,
} from 'lucide-react'
import Image from 'next/image'
import Layout from '@/components/layout/Layout'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import LoadingScreen from '@/components/ui/LoadingScreen'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  // Email notifications
  const [emailMonthlyReport, setEmailMonthlyReport] = useState(true)
  const [emailBudgetAlerts, setEmailBudgetAlerts] = useState(true)
  const [emailTipsGuidance, setEmailTipsGuidance] = useState(true)

  // Push notifications
  const [pushEnabled, setPushEnabled] = useState(true)
  const [pushBudgetAlerts, setPushBudgetAlerts] = useState(true)
  const [pushLargeTransactions, setPushLargeTransactions] = useState(true)
  const [pushDailySummary, setPushDailySummary] = useState(false)

  // In-app notifications
  const [inAppEnabled, setInAppEnabled] = useState(true)
  const [inAppBudgetAlerts, setInAppBudgetAlerts] = useState(true)
  const [inAppLargeTransactions, setInAppLargeTransactions] = useState(true)
  const [inAppDailySummary, setInAppDailySummary] = useState(false)

  // App install / update
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'updating' | 'latest' | 'error'>('idle')
  const [appVersion] = useState('1.0.0')

  // Feedback state
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackType, setFeedbackType] = useState('general')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'success' | 'error' | 'ratelimit'>('idle')

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteStep, setDeleteStep] = useState(1)
  const [typedValue, setTypedValue] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const resetDelete = () => {
    setTimeout(() => {
      setDeleteStep(1)
      setTypedValue('')
      setIsDeleting(false)
    }, 300)
  }

  const handleClose = () => {
    setDeleteOpen(false)
    resetDelete()
  }

  const handleFeedbackSubmit = async () => {
    if (!feedbackMessage.trim()) return
    setFeedbackSubmitting(true)
    setFeedbackStatus('idle')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: feedbackMessage.trim(), type: feedbackType }),
      })
      if (res.status === 429) {
        setFeedbackStatus('ratelimit')
      } else if (res.ok) {
        setFeedbackStatus('success')
        setFeedbackMessage('')
        setFeedbackType('general')
      } else {
        setFeedbackStatus('error')
      }
    } catch {
      setFeedbackStatus('error')
    } finally {
      setFeedbackSubmitting(false)
    }
  }

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
          setEmailMonthlyReport(data.monthly_report !== false)
          setEmailBudgetAlerts(data.budget_alerts !== false)
          setEmailTipsGuidance(data.need_help !== false)
          setPushEnabled(data.push_enabled !== false)
          setPushBudgetAlerts(data.notify_budget_alerts !== false)
          setPushLargeTransactions(data.notify_large_transactions !== false)
          setPushDailySummary(data.notify_daily_summary === true)
          setInAppEnabled(data.inapp_notifications !== false)
          setInAppBudgetAlerts(data.inapp_budget_alerts !== false)
          setInAppLargeTransactions(data.inapp_large_transactions !== false)
          setInAppDailySummary(data.inapp_daily_summary === true)
        }
      }
      setLoading(false)
      setMounted(true)
    }
    load()

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
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('settings').upsert({ user_id: user.id, [key]: value }, { onConflict: 'user_id' })
  }

  const handleInstallApp = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    setInstallPrompt(null)
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
      await new Promise((resolve) => setTimeout(resolve, 1500))
      if (registration.waiting) {
        setUpdateStatus('updating')
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
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

  const getUpdateButton = () => {
    switch (updateStatus) {
      case 'checking':
        return { icon: <Loader2 className="animate-spin w-4 h-4" />, label: 'Checking...' }
      case 'updating':
        return { icon: <Download className="w-4 h-4" />, label: 'Update Available' }
      case 'latest':
        return { icon: <CheckCircle className="w-4 h-4 text-green-500" />, label: "You're up to date" }
      default:
        return { icon: <RefreshCw className="w-4 h-4" />, label: 'Check for Updates' }
    }
  }

  const deleteAllData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    await supabase.from('transactions').delete().eq('user_id', user.id)
    await supabase.from('budgets').delete().eq('user_id', user.id)
    await supabase.from('settings').delete().eq('user_id', user.id)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      await deleteAllData()
      handleClose()
      toast.success('All data deleted successfully')
      router.push('/dashboard')
    } catch {
      setIsDeleting(false)
      toast.error('Something went wrong. Please try again.')
    }
  }

  const updateBtn = getUpdateButton()

  return (
    <Layout>
      <div className="w-full max-w-2xl mx-auto px-4 pb-24">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Settings</h1>

        {/* ── SECTION 1: PWA INSTALL BANNER ── */}
        {installPrompt && (
          <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl p-4 flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Image src="/icons/icon-72x72.png" alt="FinFlow" width={28} height={28} className="rounded-md" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Install FinFlow App</p>
                <p className="text-xs text-white/80">Add to home screen for quick access</p>
              </div>
            </div>
            <button
              onClick={handleInstallApp}
              className="bg-white text-teal-600 font-semibold rounded-full px-4 py-1.5 text-sm shrink-0"
            >
              Install
            </button>
          </div>
        )}

        {/* ── SECTION 2: APP UPDATES ── */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1 mt-5">
          APP UPDATES
        </p>
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-600">Current Version</span>
            <span className="text-sm font-medium text-gray-800">v{appVersion}</span>
          </div>
          <hr className="border-gray-100 my-2" />
          <button
            onClick={checkForUpdates}
            disabled={updateStatus === 'checking' || updateStatus === 'updating'}
            className="w-full border border-teal-500 text-teal-600 rounded-xl py-2.5 font-medium text-sm flex items-center justify-center gap-2 mt-3 hover:bg-teal-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {updateBtn.icon}
            {updateBtn.label}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Updates install automatically. Check manually for latest features.
          </p>
        </div>

        {/* ── SECTION 3: EMAIL NOTIFICATIONS ── */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1 mt-5">
          EMAIL NOTIFICATIONS
        </p>
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          {/* Monthly Report */}
          <div className="flex items-start justify-between py-3 border-b border-gray-50">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium text-gray-800">Monthly Report</p>
              <p className="text-xs text-gray-400 mt-0.5">Receive monthly summary by email</p>
            </div>
            <Switch
              checked={emailMonthlyReport}
              onCheckedChange={v => {
                setEmailMonthlyReport(v)
                saveNotificationSetting('monthly_report', v)
              }}
              className="data-[state=checked]:bg-teal-500 shrink-0 mt-0.5"
            />
          </div>
          {/* Budget Alerts */}
          <div className="flex items-start justify-between py-3 border-b border-gray-50">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium text-gray-800">Budget Alerts</p>
              <p className="text-xs text-gray-400 mt-0.5">Get notified when budget limit is near</p>
            </div>
            <Switch
              checked={emailBudgetAlerts}
              onCheckedChange={v => {
                setEmailBudgetAlerts(v)
                saveNotificationSetting('budget_alerts', v)
              }}
              className="data-[state=checked]:bg-teal-500 shrink-0 mt-0.5"
            />
          </div>
          {/* Tips & Guidance */}
          <div className="flex items-start justify-between py-3">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium text-gray-800">Tips &amp; Guidance</p>
              <p className="text-xs text-gray-400 mt-0.5">Receive helpful tips and guidance by email</p>
            </div>
            <Switch
              checked={emailTipsGuidance}
              onCheckedChange={v => {
                setEmailTipsGuidance(v)
                saveNotificationSetting('need_help', v)
              }}
              className="data-[state=checked]:bg-teal-500 shrink-0 mt-0.5"
            />
          </div>
        </div>

        {/* ── SECTION 4: PUSH NOTIFICATIONS ── */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1 mt-5">
          PUSH NOTIFICATIONS
        </p>
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          {/* Parent row */}
          <div className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium text-gray-800">Browser Push Notifications</p>
              <p className="text-xs text-gray-400 mt-0.5">Receive alerts even when app is closed</p>
            </div>
            <Switch
              checked={pushEnabled}
              onCheckedChange={async v => {
                setPushEnabled(v)
                saveNotificationSetting('push_enabled', v)
                if (v) {
                  const { subscribeToPush } = await import('@/lib/push')
                  await subscribeToPush()
                }
              }}
              className="data-[state=checked]:bg-teal-500 shrink-0 mt-0.5"
            />
          </div>

          {/* Amber banner when disabled */}
          {!pushEnabled && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mx-1 mb-2">
              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Enable push notifications to configure alerts below
              </p>
            </div>
          )}

          {/* Child rows */}
          <div className={`ml-3 pl-3 border-l-2 border-teal-100 space-y-0 ${!pushEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-gray-800">Budget Alerts</p>
                <p className="text-xs text-gray-400 mt-0.5">Notify when spending reaches 80% of budget</p>
              </div>
              <Switch
                checked={pushBudgetAlerts}
                onCheckedChange={v => {
                  setPushBudgetAlerts(v)
                  saveNotificationSetting('notify_budget_alerts', v)
                }}
                className="data-[state=checked]:bg-teal-500 shrink-0 mt-0.5"
              />
            </div>
            <div className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-gray-800">Large Transactions</p>
                <p className="text-xs text-gray-400 mt-0.5">Alert for transactions above ₹10,000</p>
              </div>
              <Switch
                checked={pushLargeTransactions}
                onCheckedChange={v => {
                  setPushLargeTransactions(v)
                  saveNotificationSetting('notify_large_transactions', v)
                }}
                className="data-[state=checked]:bg-teal-500 shrink-0 mt-0.5"
              />
            </div>
            <div className="flex items-start justify-between py-3">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-gray-800">Daily Summary</p>
                <p className="text-xs text-gray-400 mt-0.5">Daily spending digest</p>
              </div>
              <Switch
                checked={pushDailySummary}
                onCheckedChange={v => {
                  setPushDailySummary(v)
                  saveNotificationSetting('notify_daily_summary', v)
                }}
                className="data-[state=checked]:bg-teal-500 shrink-0 mt-0.5"
              />
            </div>
          </div>
        </div>

        {/* ── SECTION 5: IN-APP NOTIFICATIONS ── */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1 mt-5">
          IN-APP NOTIFICATIONS
        </p>
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          {/* Parent row */}
          <div className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium text-gray-800">In-App Notifications</p>
              <p className="text-xs text-gray-400 mt-0.5">Show notification bell icon alerts</p>
            </div>
            <Switch
              checked={inAppEnabled}
              onCheckedChange={v => {
                setInAppEnabled(v)
                saveNotificationSetting('inapp_notifications', v)
              }}
              className="data-[state=checked]:bg-teal-500 shrink-0 mt-0.5"
            />
          </div>

          {/* Amber banner when disabled */}
          {!inAppEnabled && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mx-1 mb-2">
              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Enable in-app notifications to configure alerts below
              </p>
            </div>
          )}

          {/* Child rows */}
          <div className={`ml-3 pl-3 border-l-2 border-teal-100 space-y-0 ${!inAppEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-gray-800">Budget Alerts</p>
                <p className="text-xs text-gray-400 mt-0.5">In-app alert when budget limit is near</p>
              </div>
              <Switch
                checked={inAppBudgetAlerts}
                onCheckedChange={v => {
                  setInAppBudgetAlerts(v)
                  saveNotificationSetting('inapp_budget_alerts', v)
                }}
                className="data-[state=checked]:bg-teal-500 shrink-0 mt-0.5"
              />
            </div>
            <div className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-gray-800">Large Transactions</p>
                <p className="text-xs text-gray-400 mt-0.5">In-app alert for transactions above ₹10,000</p>
              </div>
              <Switch
                checked={inAppLargeTransactions}
                onCheckedChange={v => {
                  setInAppLargeTransactions(v)
                  saveNotificationSetting('inapp_large_transactions', v)
                }}
                className="data-[state=checked]:bg-teal-500 shrink-0 mt-0.5"
              />
            </div>
            <div className="flex items-start justify-between py-3">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-gray-800">Daily Summary</p>
                <p className="text-xs text-gray-400 mt-0.5">Daily spending digest in-app</p>
              </div>
              <Switch
                checked={inAppDailySummary}
                onCheckedChange={v => {
                  setInAppDailySummary(v)
                  saveNotificationSetting('inapp_daily_summary', v)
                }}
                className="data-[state=checked]:bg-teal-500 shrink-0 mt-0.5"
              />
            </div>
          </div>
        </div>

        {/* ── SECTION 6: FEEDBACK ── */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1 mt-5">
          Feedback
        </p>
        <div className="border border-gray-100 rounded-2xl p-4 bg-white mb-3">
          <p className="text-sm text-gray-500 mb-3">
            Share your thoughts, report a bug, or suggest a feature.
          </p>
          <div className="mb-3">
            <Select value={feedbackType} onValueChange={setFeedbackType}>
              <SelectTrigger className="border-gray-200 h-10 text-sm w-full">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="feature">Feature Request</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative mb-3">
            <textarea
              id="feedback-message"
              aria-label="Feedback message"
              maxLength={500}
              rows={4}
              value={feedbackMessage}
              onChange={e => {
                setFeedbackMessage(e.target.value)
                setFeedbackStatus('idle')
              }}
              placeholder="Write your feedback here..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 resize-none outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
            />
            <p
              aria-live="polite"
              className={`text-xs text-right mt-0.5 ${feedbackMessage.length >= 500 ? 'text-red-400' : 'text-gray-400'}`}
            >
              {feedbackMessage.length}/500
            </p>
          </div>
          {feedbackStatus === 'success' && (
            <p className="flex items-center gap-1.5 text-sm text-green-600 mb-3">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Thank you! Your feedback has been submitted.
            </p>
          )}
          {feedbackStatus === 'ratelimit' && (
            <p className="flex items-center gap-1.5 text-sm text-amber-600 mb-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              You&apos;ve reached the feedback limit (3 per 24 hours). Please try again later.
            </p>
          )}
          {feedbackStatus === 'error' && (
            <p className="flex items-center gap-1.5 text-sm text-red-500 mb-3">
              <XCircle className="w-4 h-4 shrink-0" />
              Something went wrong. Please try again.
            </p>
          )}
          <button
            onClick={handleFeedbackSubmit}
            disabled={feedbackSubmitting || !feedbackMessage.trim()}
            className={`w-full rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              feedbackSubmitting || !feedbackMessage.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-teal-500 hover:bg-teal-600 text-white cursor-pointer'
            }`}
          >
            {feedbackSubmitting ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" />
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </button>
        </div>

        {/* ── SECTION 7: DANGER ZONE ── */}
        <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 px-1 mt-5">
          DANGER ZONE
        </p>
        <div className="border border-red-100 rounded-2xl p-4 bg-white mb-3">
          <p className="text-sm text-gray-500 mb-3">
            Permanently deletes all transactions, budgets, categories, and settings. Cannot be undone.
          </p>
          <button
            onClick={() => setDeleteOpen(true)}
            className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete All Data
          </button>
        </div>

        {/* ── DELETE CONFIRMATION DIALOG ── */}
        <Dialog open={deleteOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
          <DialogContent showCloseButton={false} className="max-w-sm">
            {/* STEP 1: Warning */}
            {deleteStep === 1 && (
              <div className="flex flex-col items-center text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-center">Delete All Data?</h2>
                <p className="text-sm text-gray-500 text-center mt-1 mb-4">
                  The following will be permanently deleted:
                </p>
                <ul className="space-y-2 text-sm text-gray-600 w-full text-left">
                  {[
                    'All transactions & entries',
                    'Budget settings & limits',
                    'Categories & custom tags',
                    'All preferences & settings',
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2 text-red-600">
                      <X className="w-4 h-4 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-red-500 font-medium text-center mt-4">
                  This action is permanent and cannot be undone.
                </p>
                <div className="flex gap-2 w-full mt-5">
                  <button
                    onClick={handleClose}
                    className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteStep(2)}
                    className="flex-1 bg-red-50 text-red-600 border border-red-200 rounded-xl py-2.5 font-medium text-sm hover:bg-red-100 transition-colors"
                  >
                    I understand, continue →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Type DELETE */}
            {deleteStep === 2 && (
              <div className={isDeleting ? 'pointer-events-none' : ''}>
                <button
                  onClick={() => setDeleteStep(1)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <h2 className="text-lg font-bold text-center mt-2">Confirm Deletion</h2>
                <p className="text-sm text-gray-500 text-center mt-1">
                  Type{' '}
                  <span className="font-mono font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                    DELETE
                  </span>{' '}
                  to confirm
                </p>
                <input
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Type DELETE to confirm"
                  value={typedValue}
                  onChange={e => setTypedValue(e.target.value)}
                  className={`w-full border-2 rounded-xl px-4 py-3 text-center font-mono font-bold tracking-widest text-lg mt-4 outline-none transition-all ${
                    typedValue === 'DELETE'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : typedValue.length > 0
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200'
                  }`}
                />
                <p className="text-xs text-gray-400 text-right mt-1">{typedValue.length}/6</p>
                {typedValue.length > 0 && (
                  typedValue === 'DELETE' ? (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Confirmed
                    </p>
                  ) : (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <XCircle className="w-3.5 h-3.5" />
                      Must type DELETE exactly
                    </p>
                  )
                )}
                <button
                  onClick={handleDeleteConfirm}
                  disabled={typedValue !== 'DELETE' || isDeleting}
                  className={`w-full rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 transition-all mt-4 ${
                    typedValue === 'DELETE' && !isDeleting
                      ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete All Data
                    </>
                  )}
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}
