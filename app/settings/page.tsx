'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, CheckCircle, XCircle,
  AlertTriangle, Trash2, ArrowLeft, X,
} from 'lucide-react'
import Image from 'next/image'
import Layout from '@/components/layout/Layout'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function SettingsPage() {
  const router = useRouter()

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

  // App install
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

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
    }
    load()

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler as EventListener)
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener)
  }, [])

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

  return (
    <Layout>
      <div className="w-full max-w-none md:max-w-2xl lg:max-w-3xl mx-auto px-4 pb-24">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0F172A]">Settings</h1>
          <p className="text-sm text-[#64748B] mt-1">Manage your preferences</p>
        </div>

        {/* ── SECTION 1: PWA INSTALL BANNER ── */}
        {installPrompt && (
          <div className="bg-gradient-to-r from-[#0A7B7B] to-[#10B981] rounded-2xl p-4 shadow-md flex items-center justify-between mb-3">
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
              className="bg-white text-[#0A7B7B] font-semibold rounded-xl px-4 py-1.5 text-sm shrink-0"
            >
              Install
            </button>
          </div>
        )}

        {/* ── SECTION 2: EMAIL NOTIFICATIONS ── */}
        <div className="flex items-center gap-2 mt-6 mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">EMAIL NOTIFICATIONS</span>
          <div className="flex-1 border-b border-[#E2E8F0]" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4">
          <div className="flex items-start justify-between py-3 border-b border-[#F1F5F9]">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium text-[#0F172A]">Monthly Report</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">Receive monthly summary by email</p>
            </div>
            <Switch
              checked={emailMonthlyReport}
              onCheckedChange={v => {
                setEmailMonthlyReport(v)
                saveNotificationSetting('monthly_report', v)
              }}
              className="data-[state=checked]:bg-[#0A7B7B] shrink-0 mt-0.5"
            />
          </div>
          <div className="flex items-start justify-between py-3 border-b border-[#F1F5F9]">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium text-[#0F172A]">Budget Alerts</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">Get notified when budget limit is near</p>
            </div>
            <Switch
              checked={emailBudgetAlerts}
              onCheckedChange={v => {
                setEmailBudgetAlerts(v)
                saveNotificationSetting('budget_alerts', v)
              }}
              className="data-[state=checked]:bg-[#0A7B7B] shrink-0 mt-0.5"
            />
          </div>
          <div className="flex items-start justify-between py-3">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium text-[#0F172A]">Tips &amp; Guidance</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">Receive helpful tips and guidance by email</p>
            </div>
            <Switch
              checked={emailTipsGuidance}
              onCheckedChange={v => {
                setEmailTipsGuidance(v)
                saveNotificationSetting('need_help', v)
              }}
              className="data-[state=checked]:bg-[#0A7B7B] shrink-0 mt-0.5"
            />
          </div>
        </div>

        {/* ── SECTION 3: PUSH NOTIFICATIONS ── */}
        <div className="flex items-center gap-2 mt-6 mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">PUSH NOTIFICATIONS</span>
          <div className="flex-1 border-b border-[#E2E8F0]" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4">
          <div className="flex items-start justify-between py-3 border-b border-[#F1F5F9]">
            <div className="flex-1 pr-4">
              <p className="text-sm font-semibold text-[#0F172A]">Browser Push Notifications</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">Receive alerts even when app is closed</p>
            </div>
            <Switch
              checked={pushEnabled}
              onCheckedChange={async v => {
                setPushEnabled(v)
                saveNotificationSetting('push_enabled', v)
                if (v) {
                  try {
                    const { subscribeToPush } = await import('@/lib/push')
                    await subscribeToPush()
                  } catch {
                    toast.error('Failed to enable push notifications')
                  }
                }
              }}
              className="data-[state=checked]:bg-[#0A7B7B] shrink-0 mt-0.5"
            />
          </div>

          <AnimatePresence>
            {!pushEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mx-1">
                  <p className="text-xs text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Enable push notifications to configure alerts below
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`ml-3 pl-3 border-l-2 border-[#0A7B7B] space-y-0 transition-opacity duration-200 ${!pushEnabled ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex items-start justify-between py-3 border-b border-[#F1F5F9]">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-[#0F172A]">Budget Alerts</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">Notify when spending reaches 80% of budget</p>
              </div>
              <Switch
                checked={pushBudgetAlerts}
                onCheckedChange={v => {
                  setPushBudgetAlerts(v)
                  saveNotificationSetting('notify_budget_alerts', v)
                }}
                className="data-[state=checked]:bg-[#0A7B7B] shrink-0 mt-0.5"
              />
            </div>
            <div className="flex items-start justify-between py-3 border-b border-[#F1F5F9]">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-[#0F172A]">Large Transactions</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">Alert for transactions above ₹10,000</p>
              </div>
              <Switch
                checked={pushLargeTransactions}
                onCheckedChange={v => {
                  setPushLargeTransactions(v)
                  saveNotificationSetting('notify_large_transactions', v)
                }}
                className="data-[state=checked]:bg-[#0A7B7B] shrink-0 mt-0.5"
              />
            </div>
            <div className="flex items-start justify-between py-3">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-[#0F172A]">Daily Summary</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">Daily spending digest</p>
              </div>
              <Switch
                checked={pushDailySummary}
                onCheckedChange={v => {
                  setPushDailySummary(v)
                  saveNotificationSetting('notify_daily_summary', v)
                }}
                className="data-[state=checked]:bg-[#0A7B7B] shrink-0 mt-0.5"
              />
            </div>
          </div>
        </div>

        {/* ── SECTION 4: IN-APP NOTIFICATIONS ── */}
        <div className="flex items-center gap-2 mt-6 mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">IN-APP NOTIFICATIONS</span>
          <div className="flex-1 border-b border-[#E2E8F0]" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-4">
          <div className="flex items-start justify-between py-3 border-b border-[#F1F5F9]">
            <div className="flex-1 pr-4">
              <p className="text-sm font-semibold text-[#0F172A]">In-App Notifications</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">Show notification bell icon alerts</p>
            </div>
            <Switch
              checked={inAppEnabled}
              onCheckedChange={v => {
                setInAppEnabled(v)
                saveNotificationSetting('inapp_notifications', v)
              }}
              className="data-[state=checked]:bg-[#0A7B7B] shrink-0 mt-0.5"
            />
          </div>

          <AnimatePresence>
            {!inAppEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mx-1">
                  <p className="text-xs text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Enable in-app notifications to configure alerts below
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`ml-3 pl-3 border-l-2 border-[#0A7B7B] space-y-0 transition-opacity duration-200 ${!inAppEnabled ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex items-start justify-between py-3 border-b border-[#F1F5F9]">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-[#0F172A]">Budget Alerts</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">In-app alert when budget limit is near</p>
              </div>
              <Switch
                checked={inAppBudgetAlerts}
                onCheckedChange={v => {
                  setInAppBudgetAlerts(v)
                  saveNotificationSetting('inapp_budget_alerts', v)
                }}
                className="data-[state=checked]:bg-[#0A7B7B] shrink-0 mt-0.5"
              />
            </div>
            <div className="flex items-start justify-between py-3 border-b border-[#F1F5F9]">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-[#0F172A]">Large Transactions</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">In-app alert for transactions above ₹10,000</p>
              </div>
              <Switch
                checked={inAppLargeTransactions}
                onCheckedChange={v => {
                  setInAppLargeTransactions(v)
                  saveNotificationSetting('inapp_large_transactions', v)
                }}
                className="data-[state=checked]:bg-[#0A7B7B] shrink-0 mt-0.5"
              />
            </div>
            <div className="flex items-start justify-between py-3">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-[#0F172A]">Daily Summary</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">Daily spending digest in-app</p>
              </div>
              <Switch
                checked={inAppDailySummary}
                onCheckedChange={v => {
                  setInAppDailySummary(v)
                  saveNotificationSetting('inapp_daily_summary', v)
                }}
                className="data-[state=checked]:bg-[#0A7B7B] shrink-0 mt-0.5"
              />
            </div>
          </div>
        </div>

        {/* ── SECTION 5: DANGER ZONE ── */}
        <div className="flex items-center gap-2 mt-6 mb-3">
          <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
          <span className="text-sm font-bold uppercase tracking-widest text-[#EF4444]">DANGER ZONE</span>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-3">
          <p className="text-sm text-[#EF4444] font-medium mb-3">
            Permanently deletes all transactions, budgets, categories, and settings. Cannot be undone.
          </p>
          <button
            onClick={() => setDeleteOpen(true)}
            className="w-full bg-[#EF4444] hover:bg-red-600 text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete All Data
          </button>
        </div>

        {/* ── DELETE CONFIRMATION DIALOG ── */}
        <Dialog open={deleteOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
          <DialogContent showCloseButton={false} className="max-w-sm">
            <AnimatePresence mode="wait">
              {/* STEP 1: Warning */}
              {deleteStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 0 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                  <div className="flex flex-col items-center text-center">
                    <AlertTriangle className="w-12 h-12 text-[#EF4444] mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-center text-[#0F172A]">Delete All Data?</h2>
                    <p className="text-sm text-[#64748B] text-center mt-1 mb-4">
                      The following will be permanently deleted:
                    </p>
                    <ul className="space-y-2 w-full text-left">
                      {[
                        'All transactions & entries',
                        'Budget settings & limits',
                        'Categories & custom tags',
                        'All preferences & settings',
                      ].map(item => (
                        <li key={item} className="bg-red-50 rounded-lg px-3 py-2 text-sm text-[#EF4444] flex items-center gap-2">
                          <X className="w-4 h-4 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-[#EF4444] font-medium text-center mt-4">
                      This action is permanent and cannot be undone.
                    </p>
                    <div className="flex gap-2 w-full mt-5">
                      <button
                        onClick={handleClose}
                        className="flex-1 border border-[#E2E8F0] text-[#475569] rounded-xl py-2.5 font-medium text-sm hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setDeleteStep(2)}
                        className="flex-1 bg-[#EF4444] text-white rounded-xl py-2.5 font-medium text-sm hover:bg-red-600 transition-colors"
                      >
                        I understand, continue →
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Type DELETE */}
              {deleteStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}>
                  <div className={isDeleting ? 'pointer-events-none' : ''}>
                    <button
                      onClick={() => setDeleteStep(1)}
                      className="flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0F172A] mb-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <h2 className="text-lg font-bold text-center mt-2">Confirm Deletion</h2>
                    <p className="text-sm text-[#64748B] text-center mt-1">
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
                    {typedValue === 'DELETE' && !isDeleting ? (
                      <motion.div animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 0.3 }}>
                        <button
                          onClick={handleDeleteConfirm}
                          className="w-full bg-[#EF4444] hover:bg-red-600 text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 transition-all mt-4"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete All Data
                        </button>
                      </motion.div>
                    ) : (
                      <button
                        onClick={handleDeleteConfirm}
                        disabled={typedValue !== 'DELETE' || isDeleting}
                        className={`w-full rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 transition-all mt-4 ${
                          typedValue === 'DELETE' && !isDeleting
                            ? 'bg-[#EF4444] hover:bg-red-600 text-white cursor-pointer'
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
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}
