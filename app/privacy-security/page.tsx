'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, ArrowLeft, CheckCircle, Loader2, BarChart2, Circle } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { createClient } from '@/lib/supabase/client'
import { posthog } from '@/lib/posthog'
import toast from 'react-hot-toast'

export default function PrivacySecurityPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentTouched, setCurrentTouched] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setLoading(false)
      setMounted(true)
    }
    checkAuth()

    const storedAnalytics = localStorage.getItem('finflow_analytics_enabled')
    const enabled = storedAnalytics !== 'false'
    setAnalyticsEnabled(enabled)
    if (enabled) {
      posthog.opt_in_capturing()
    } else {
      posthog.opt_out_capturing()
    }
  }, [router])

  if (loading || !mounted) return null

  const SPECIAL_CHAR_RE = /[!@#$%^&*]/
  const DIGIT_RE = /[0-9]/

  const getStrength = (pwd: string) => {
    if (pwd.length === 0) return null
    if (pwd.length < 6) return { label: 'Weak', color: 'bg-red-400', text: 'text-red-500', width: 'w-1/3' }
    if (pwd.length >= 6 && !SPECIAL_CHAR_RE.test(pwd)) return { label: 'Medium', color: 'bg-amber-400', text: 'text-amber-500', width: 'w-2/3' }
    if (pwd.length >= 8 && SPECIAL_CHAR_RE.test(pwd) && DIGIT_RE.test(pwd)) return { label: 'Strong', color: 'bg-green-500', text: 'text-green-600', width: 'w-full' }
    return { label: 'Medium', color: 'bg-amber-400', text: 'text-amber-500', width: 'w-2/3' }
  }

  const strength = getStrength(newPassword)
  const hasMinLength = newPassword.length >= 8
  const hasNumber = DIGIT_RE.test(newPassword)
  const hasSpecial = SPECIAL_CHAR_RE.test(newPassword)
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword
  const allValid = currentPassword.length > 0 && hasMinLength && hasNumber && hasSpecial && passwordsMatch

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allValid) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { toast.error('Unable to verify your account. Please log in again.'); return }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
      if (signInError) { toast.error('Current password is incorrect.'); return }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) { toast.error(updateError.message); return }
      setSuccess(true)
      toast.success('Password updated successfully!')
      setTimeout(() => {
        setSuccess(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setCurrentTouched(false)
      }, 3000)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleAnalyticsToggle = () => {
    const next = !analyticsEnabled
    setAnalyticsEnabled(next)
    localStorage.setItem('finflow_analytics_enabled', String(next))
    if (next) {
      posthog.opt_in_capturing()
    } else {
      posthog.opt_out_capturing()
    }
  }

  return (
    <Layout>
      <div className="w-full max-w-2xl mx-auto px-4 pb-24">

        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors" aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Privacy &amp; Security</h1>
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">ACCOUNT SECURITY</p>
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <Lock size={16} className="text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Change Password</p>
              <p className="text-xs text-gray-400">Update your account password</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Current Password</label>
              <div className="relative">
                <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} onBlur={() => setCurrentTouched(true)} placeholder="Enter current password" autoComplete="current-password" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all pr-11" />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {currentTouched && currentPassword.length === 0 && <p className="text-xs text-red-500 mt-1.5">Current password is required</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">New Password</label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all pr-11" />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && strength && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                    </div>
                    <span className={`text-xs font-medium ml-2 ${strength.text}`}>{strength.label}</span>
                  </div>
                </div>
              )}
              {newPassword.length > 0 && (
                <div className="mt-2 space-y-1">
                  {[{ met: hasMinLength, label: 'At least 8 characters' }, { met: hasNumber, label: 'Contains a number' }, { met: hasSpecial, label: 'Contains a special character (!@#$%^&*)' }].map((rule) => (
                    <div key={rule.label} className="flex items-center gap-2">
                      {rule.met ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                      <span className={`text-xs ${rule.met ? 'text-green-600' : 'text-gray-400'}`}>{rule.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" autoComplete="new-password" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all pr-11" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordsMatch && <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Passwords match</p>}
              {passwordsMismatch && <p className="text-xs text-red-500 mt-1.5">Passwords do not match</p>}
            </div>

            <button type="submit" disabled={!allValid || saving || success} className={`w-full font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors mt-2 ${success ? 'bg-green-500 text-white cursor-default' : allValid && !saving ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {saving ? (<><Loader2 className="w-4 h-4 animate-spin" />Updating...</>) : success ? (<><CheckCircle className="w-4 h-4" />Password Updated!</>) : ('Update Password')}
            </button>
          </form>
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">DATA &amp; ANALYTICS</p>
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                <BarChart2 size={16} className="text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Analytics &amp; Crash Reports</p>
                <p className="text-xs text-gray-400">Share anonymous usage data to improve FinFlow</p>
              </div>
            </div>
            <button type="button" role="switch" aria-checked={analyticsEnabled} onClick={handleAnalyticsToggle} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${analyticsEnabled ? 'bg-teal-500' : 'bg-gray-200'}`}>
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${analyticsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 px-1 mb-6">
          We never sell your data. Analytics are fully anonymous and contain no personal or financial information.
        </p>

      </div>
    </Layout>
  )
}
