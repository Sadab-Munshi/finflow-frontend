'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera, Pencil, Check, Bell, Lock, Database, HelpCircle,
  ChevronRight, LogOut, Send, MessageCircle, ExternalLink, Loader2, Star,
  ClipboardList, Flame, TrendingDown, MessageSquarePlus, CheckCircle, XCircle, AlertTriangle,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { getSettings, upsertSettings, getTransactions } from '@/lib/db'
import { createClient } from '@/lib/supabase/client'
import { posthog } from '@/lib/posthog'

import toast from 'react-hot-toast'
import { aiUsage as fetchAiUsage, telegramNotify, whatsappNotify, submitFeedback } from '@/lib/api-client'

type Language = 'en' | 'hi' | 'bn'

const FEEDBACK_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'other', label: 'Other' },
] as const

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

const languageLabels: Record<Language, string> = { en: 'English', hi: 'हिंदी', bn: 'বাংলা' }

export default function ProfilePage() {
  const router = useRouter()
  const { language, setLanguage } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [memberSince, setMemberSince] = useState('')
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const [showLanguageSheet, setShowLanguageSheet] = useState(false)

  // Feedback
  const [showFeedbackSheet, setShowFeedbackSheet] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackType, setFeedbackType] = useState('general')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'success' | 'error' | 'ratelimit'>('idle')

  // Stats
  const [totalEntries, setTotalEntries] = useState(0)
  const [dayStreak, setDayStreak] = useState(0)
  const [thisMonthSpending, setThisMonthSpending] = useState(0)

  // AI Usage
  const [aiUsage, setAiUsage] = useState<{ nlp?: { used: number }; voice?: { used: number }; receipt?: { used: number }; insights?: { used: number } } | null>(null)
  const totalAiLimit = 150

  // Telegram
  const [telegramChatId, setTelegramChatId] = useState('')
  const [telegramConnected, setTelegramConnected] = useState(false)
  const [telegramToggle, setTelegramToggle] = useState(false)
  const [showTelegramDisconnectDialog, setShowTelegramDisconnectDialog] = useState(false)

  // WhatsApp
  const [whatsappConnected, setWhatsappConnected] = useState(false)
  const [whatsappPolling, setWhatsappPolling] = useState(false)
  const [showWhatsappDisconnectDialog, setShowWhatsappDisconnectDialog] = useState(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

      const dbSettings = await getSettings()
      if (dbSettings) {
        if (dbSettings.name) setName(dbSettings.name)
        if (dbSettings.avatar_url) setAvatarUrl(dbSettings.avatar_url)
        if (dbSettings.telegram_chat_id) {
          setTelegramChatId(dbSettings.telegram_chat_id)
          setTelegramConnected(true)
          setTelegramToggle(true)
        }
        const extSettings = dbSettings as typeof dbSettings & { whatsapp_phone?: string }
        if (extSettings.whatsapp_phone) setWhatsappConnected(true)
      }

      const { data } = await supabase.auth.getUser()
      if (data.user) {
        const userName = data.user.user_metadata?.full_name || dbSettings?.name || ''
        setName(userName)
        setEmail(data.user.email || '')
        if (data.user.created_at) {
          const createdAt = new Date(data.user.created_at)
          setMemberSince(createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
        }
      }

      // Load stats
      const transactions = await getTransactions()
      setTotalEntries(transactions.length)

      // Day streak: count consecutive days (including today) that have at least one transaction
      const uniqueDates = [...new Set(transactions.map(t => t.date?.slice(0, 10)))].sort().reverse()
      let streak = 0
      let cursor = new Date()
      cursor.setHours(0, 0, 0, 0)
      for (const d of uniqueDates) {
        if (!d) continue
        const txDate = new Date(d)
        txDate.setHours(0, 0, 0, 0)
        const diffDays = Math.round((cursor.getTime() - txDate.getTime()) / 86400000)
        if (diffDays <= 1) {
          streak++
          cursor = txDate
        } else {
          break
        }
      }
      setDayStreak(streak)

      // This month spending
      const now = new Date()
      const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const spending = transactions
        .filter(t => t.type === 'expense' && (t.date || '').startsWith(thisMonthPrefix))
        .reduce((sum, t) => sum + Number(t.amount), 0)
      setThisMonthSpending(spending)

      setMounted(true)
    }
    load()

    // AI usage
    fetchAiUsage().then(data => setAiUsage(data)).catch(() => {})
  }, [])

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  if (!mounted) return null

  const uploadAvatar = async (file: File) => {
    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        setUploading(false)
        return
      }

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl + '?t=' + Date.now())
      await supabase.from('settings').upsert(
        { user_id: user.id, avatar_url: data.publicUrl },
        { onConflict: 'user_id' }
      )
      posthog.capture('profile_photo_uploaded')
    }
    setUploading(false)
  }

  const saveName = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.auth.updateUser({ data: { full_name: name } })
    await supabase.from('settings').upsert({ user_id: user.id, name }, { onConflict: 'user_id' })
    setEditingName(false)
  }

  const handleLanguageChange = async (lang: Language) => {
    setLanguage(lang)
    await upsertSettings({ language: lang, currency: 'INR', name })
    setShowLanguageSheet(false)
  }

  const connectTelegram = async () => {
    if (!telegramChatId.trim()) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('settings').upsert(
      { user_id: user.id, telegram_chat_id: telegramChatId.trim(), telegram_id: telegramChatId.trim() },
      { onConflict: 'user_id' }
    )
    if (!error) {
      setTelegramConnected(true)
      setTelegramToggle(true)
      telegramNotify(telegramChatId.trim(), 'connected').catch(() => {})
    } else {
      toast.error('Failed to connect. Please try again.')
    }
  }

  const disconnectTelegram = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: settings } = await supabase
      .from('settings')
      .select('telegram_chat_id')
      .eq('user_id', user.id)
      .single()
    const currentChatId = (settings as { telegram_chat_id?: string } | null)?.telegram_chat_id

    if (currentChatId) {
      await telegramNotify(currentChatId, 'disconnected').catch(() => {})
    }

    await supabase.from('settings').upsert(
      { user_id: user.id, telegram_chat_id: null, telegram_id: null },
      { onConflict: 'user_id' }
    )
    setTelegramChatId('')
    setTelegramConnected(false)
    setTelegramToggle(false)
    setShowTelegramDisconnectDialog(false)
  }

  const connectWhatsApp = async () => {
    try {
      setWhatsappPolling(true)
      const array = new Uint8Array(5)
      crypto.getRandomValues(array)
      const code = Array.from(array, b => b.toString(36)).join('').slice(0, 8).toUpperCase()

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('settings')
        .update({ whatsapp_connect_code: code })
        .eq('user_id', user.id)

      if (error) {
        toast.error('Failed to generate connect code')
        setWhatsappPolling(false)
        return
      }

      window.open(`https://wa.me/919382988956?text=connect_${code}`, '_blank')
      startPolling()
    } catch {
      toast.error('Something went wrong. Please try again.')
      setWhatsappPolling(false)
    }
  }

  const startPolling = () => {
    let attempts = 0
    const maxAttempts = 12
    pollIntervalRef.current = setInterval(async () => {
      attempts++
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        return
      }
      const { data } = await supabase.from('settings').select('whatsapp_phone').eq('user_id', user.id).single()
      const pollData = data as { whatsapp_phone?: string } | null
      if (pollData?.whatsapp_phone) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        setWhatsappConnected(true)
        setWhatsappPolling(false)
        toast.success('WhatsApp connected successfully!')
      } else if (attempts >= maxAttempts) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        setWhatsappPolling(false)
        toast.error('Connection timed out. Please try again.')
      }
    }, 5000)
  }

  const cancelPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    setWhatsappPolling(false)
  }

  const disconnectWhatsapp = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: settings } = await supabase
        .from('settings')
        .select('whatsapp_phone, name')
        .eq('user_id', user.id)
        .single()
      const settingsTyped = settings as { whatsapp_phone?: string; name?: string } | null
      const currentPhone = settingsTyped?.whatsapp_phone
      const settingsName = settingsTyped?.name || user.email || 'User'

      await supabase.from('settings')
        .update({ whatsapp_phone: null, whatsapp_connect_code: null })
        .eq('user_id', user.id)

      if (currentPhone) {
        whatsappNotify(currentPhone, 'disconnected', settingsName).catch(() => {})
      }
      setWhatsappConnected(false)
      setShowWhatsappDisconnectDialog(false)
      toast.success('WhatsApp disconnected')
    } catch {
      toast.error('Failed to disconnect. Please try again.')
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut({ scope: 'local' })
    router.push('/login')
  }

  const handleFeedbackSubmit = async () => {
    if (!feedbackMessage.trim()) return
    setFeedbackSubmitting(true)
    setFeedbackStatus('idle')
    try {
      await submitFeedback(feedbackMessage.trim(), feedbackType as 'general' | 'bug' | 'feature' | 'other')
      setFeedbackStatus('success')
      setFeedbackMessage('')
      setFeedbackType('general')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('[feedback] Submit failed:', err)
      if (errorMessage.includes('429')) {
        setFeedbackStatus('ratelimit')
      } else {
        setFeedbackStatus('error')
      }
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  const totalAiUsed = aiUsage
    ? (aiUsage.nlp?.used || 0) + (aiUsage.voice?.used || 0) + (aiUsage.receipt?.used || 0) + (aiUsage.insights?.used || 0)
    : 0
  const aiPct = Math.round((totalAiUsed / totalAiLimit) * 100)
  const aiBarColor = aiPct >= 100 ? '#dc2626' : aiPct >= 80 ? '#f59e0b' : '#0d9488'

  const formatSpending = (amount: number) =>
    amount >= 1000 ? `₹${(amount / 1000).toFixed(1)}k` : `₹${amount.toFixed(0)}`

  return (
    <Layout>
      <div className="w-full max-w-2xl mx-auto pb-10">

        {/* SECTION 1 — HERO HEADER */}
        <div
          className="relative overflow-hidden md:rounded-2xl md:mx-4"
          style={{ background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)' }}
        >
          {/* Geometric pattern overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="geo" width="48" height="48" patternUnits="userSpaceOnUse">
                  <circle cx="24" cy="24" r="12" fill="none" stroke="white" strokeWidth="1" />
                  <polygon points="0,0 24,0 12,20.8" fill="none" stroke="white" strokeWidth="0.6" />
                  <polygon points="24,0 48,0 36,20.8" fill="none" stroke="white" strokeWidth="0.6" />
                  <polygon points="0,48 24,48 12,27.2" fill="none" stroke="white" strokeWidth="0.6" />
                  <polygon points="24,48 48,48 36,27.2" fill="none" stroke="white" strokeWidth="0.6" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#geo)" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col items-center pt-10 pb-8 px-4">
            {/* Avatar with glowing white ring */}
            <div className="relative">
              <div
                className="w-28 h-28 relative rounded-full overflow-hidden bg-teal-700"
                style={{ boxShadow: '0 0 0 4px white, 0 0 24px rgba(255,255,255,0.35)' }}
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Profile" fill className="object-cover" sizes="112px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-white text-teal-600 rounded-full p-1.5 cursor-pointer shadow-md hover:bg-teal-50 transition-colors">
                <Camera size={16} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
                />
              </label>
            </div>
            {uploading && <p className="text-xs text-white/70 mt-2 animate-pulse">Uploading...</p>}

            {/* Display name — static */}
            <div className="mt-4">
              <h2 className="text-2xl font-semibold text-white text-center">{name}</h2>
            </div>

            {/* Gold "Member since" badge */}
            {memberSince && (
              <div
                className="mt-2 px-3 py-1 rounded-full flex items-center gap-1 text-xs font-semibold"
                style={{
                  background: 'rgba(251,191,36,0.2)',
                  color: '#fcd34d',
                  border: '1px solid rgba(251,191,36,0.4)',
                }}
              >
                <Star size={10} fill="#fcd34d" strokeWidth={0} />
                Member since {memberSince}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2 — STATS ROW */}
        <div className="px-4 -mt-4 relative z-20">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#ECFDF5] rounded-2xl p-4 flex flex-col items-center text-center">
              <ClipboardList className="w-5 h-5 text-teal-600 mb-1" />
              <span className="text-lg font-bold text-gray-800">{String(totalEntries)}</span>
              <span className="text-xs text-gray-400 mt-0.5">Entries</span>
            </div>
            <div className="bg-[#ECFDF5] rounded-2xl p-4 flex flex-col items-center text-center">
              <Flame className="w-5 h-5 text-teal-600 mb-1" />
              <span className="text-lg font-bold text-gray-800">{`${dayStreak}d`}</span>
              <span className="text-xs text-gray-400 mt-0.5">Streak</span>
            </div>
            <div className="bg-[#ECFDF5] rounded-2xl p-4 flex flex-col items-center text-center">
              <TrendingDown className="w-5 h-5 text-teal-600 mb-1" />
              <span className="text-lg font-bold text-gray-800">{formatSpending(thisMonthSpending)}</span>
              <span className="text-xs text-gray-400 mt-0.5">Spent</span>
            </div>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-3">

          {/* SECTION 3 — ACCOUNT INFO */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Account</p>
            <div className="bg-white rounded-2xl shadow-sm md:shadow-md p-4 space-y-3">
              {/* Name */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-0.5">Name</p>
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={name}
                        onChange={(e) => e.target.value.length <= 20 && setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveName()}
                        maxLength={20}
                        className="text-base font-medium border-b border-gray-300 outline-none flex-1 min-w-0"
                        autoFocus
                      />
                      <button
                        onClick={saveName}
                        className="px-3 py-1 text-xs font-semibold text-white bg-teal-600 rounded-lg shrink-0"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-gray-800">{name}</p>
                  )}
                </div>
                {!editingName && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="p-2 rounded-xl text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>

              <div className="border-t border-gray-100" />

              {/* Email — read-only */}
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Email</p>
                <p className="text-sm font-medium text-gray-800">{email}</p>
                <p className="text-xs text-gray-400 mt-0.5">(cannot be changed)</p>
              </div>

              <div className="border-t border-gray-100" />

              {/* Language */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Language</p>
                  <p className="text-sm font-medium text-gray-800">{languageLabels[language as Language]}</p>
                </div>
                {/* Desktop pills */}
                <div className="hidden sm:flex gap-1">
                  {(['en', 'hi', 'bn'] as Language[]).map(lang => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        language === lang
                          ? 'bg-teal-600 text-white'
                          : 'border border-gray-200 text-gray-500 hover:border-teal-300'
                      }`}
                    >
                      {languageLabels[lang]}
                    </button>
                  ))}
                </div>
                {/* Mobile bottom-sheet trigger */}
                <button
                  onClick={() => setShowLanguageSheet(true)}
                  className="sm:hidden flex items-center gap-1 text-teal-600 text-sm font-medium"
                >
                  Change <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 4 — INTEGRATIONS */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Integrations</p>
            <div className="bg-white rounded-2xl shadow-sm md:shadow-md p-4 space-y-4">

              {/* Telegram */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Send size={16} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {telegramConnected ? 'Telegram Connected' : 'Connect Telegram'}
                      </p>
                      <p className="text-xs text-gray-400">Add transactions via Telegram bot</p>
                    </div>
                  </div>
                  <Toggle
                    checked={telegramConnected || telegramToggle}
                    onChange={() => {
                      if (telegramConnected) {
                        setShowTelegramDisconnectDialog(true)
                      } else {
                        setTelegramToggle(prev => !prev)
                      }
                    }}
                  />
                </div>
                {/* Inline expand when toggle ON but not yet connected */}
                {!telegramConnected && telegramToggle && (
                  <div className="mt-3 space-y-2 pl-12">
                    <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                      <li>Open Telegram and search @FinFlowBot</li>
                      <li>Send /start to get your Chat ID</li>
                      <li>Enter your Chat ID below</li>
                    </ol>
                    <input
                      type="text"
                      placeholder="Enter your Telegram Chat ID"
                      value={telegramChatId}
                      onChange={e => setTelegramChatId(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      onClick={connectTelegram}
                      className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ background: '#0d9488' }}
                    >
                      Connect
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100" />

              {/* WhatsApp */}
              <div>
                {whatsappPolling ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <MessageCircle size={16} className="text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Connecting...</p>
                        <p className="text-xs text-gray-400">Waiting for WhatsApp confirmation</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                      <button onClick={cancelPolling} className="text-xs text-gray-400 hover:text-gray-600">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <MessageCircle size={16} className="text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {whatsappConnected ? 'WhatsApp Connected' : 'Connect WhatsApp'}
                        </p>
                        <p className="text-xs text-gray-400">Add transactions via WhatsApp</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!whatsappConnected && (
                        <button
                          onClick={connectWhatsApp}
                          className="text-xs font-semibold text-teal-600 flex items-center gap-0.5"
                        >
                          Open <ExternalLink size={11} />
                        </button>
                      )}
                      <Toggle
                        checked={whatsappConnected}
                        onChange={() => {
                          if (whatsappConnected) setShowWhatsappDisconnectDialog(true)
                          else connectWhatsApp()
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 5 — AI USAGE */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Usage</p>
            <div className="bg-white rounded-2xl shadow-sm md:shadow-md p-4">
              <p className="text-sm font-semibold text-gray-800 mb-3">AI Usage This Month</p>
              {aiUsage ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{aiPct}% used</span>
                    <span className="text-xs text-gray-400">{totalAiUsed}/{totalAiLimit}</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-2.5 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(aiPct, 100)}%`, background: aiBarColor }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">Resets on 1st of next month</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Loading usage...</p>
              )}
            </div>
          </div>

          {/* SECTION 6 — SETTINGS LIST */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Preferences</p>
            <div className="bg-white rounded-2xl shadow-sm md:shadow-md overflow-hidden">
              {[
                { icon: Bell, label: 'Notifications', path: '/settings' },
                { icon: Lock, label: 'Privacy & Security', path: '/privacy-security' },
                { icon: Database, label: 'Data Backup & Restore', path: '/backup-restore' },
              ].map((item, i) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100"
                >
                  <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                    <item.icon size={15} className="text-teal-600" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-800 text-left">{item.label}</span>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>
              ))}
              <Link
                href="https://app.sadabmunshi.online/support"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100"
              >
                <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                  <HelpCircle size={15} className="text-teal-600" />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-800 text-left">Help &amp; Support</span>
                <ChevronRight size={16} className="text-gray-300" />
              </Link>
              <button
                onClick={() => setShowFeedbackSheet(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                  <MessageSquarePlus size={15} className="text-teal-600" />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-800 text-left">Feedback</span>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
            </div>
          </div>

          {/* SECTION 7 — ABOUT */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">About</p>
            <div className="bg-white rounded-2xl shadow-sm md:shadow-md overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                <span className="text-sm text-gray-600">Version</span>
                <span className="text-sm text-gray-400">1.0</span>
              </div>
              {[
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
                { label: 'Disclaimer', href: '/disclaimer' },
              ].map((item, i, arr) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                    i < arr.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <span className="text-sm text-teal-600">{item.label}</span>
                  <ChevronRight size={16} className="text-gray-300" />
                </Link>
              ))}
            </div>
          </div>

          {/* SECTION 8 — SIGN OUT */}
          <button
            onClick={() => setShowSignOutDialog(true)}
            className="w-full flex items-center justify-center gap-2 text-red-500 border border-red-100 rounded-2xl py-3.5 text-sm font-semibold bg-white shadow-sm hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>

        </div>

        {/* Language Bottom Sheet (mobile only) */}
        {showLanguageSheet && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden"
            onClick={() => setShowLanguageSheet(false)}
          >
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative bg-white rounded-t-3xl p-6 space-y-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <p className="text-base font-semibold text-gray-800 mb-4">Select Language</p>
              {(['en', 'hi', 'bn'] as Language[]).map(lang => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    language === lang ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {languageLabels[lang]}
                  {language === lang && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Bottom Sheet */}
        {showFeedbackSheet && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end"
            onClick={() => setShowFeedbackSheet(false)}
          >
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative bg-white rounded-t-3xl p-6 space-y-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              {feedbackStatus === 'success' ? (
                <div className="flex flex-col items-center py-6 gap-3">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <p className="text-base font-semibold text-gray-800">Thank you!</p>
                  <p className="text-sm text-gray-500 text-center">Your feedback has been submitted.</p>
                  <button
                    onClick={() => {
                      setShowFeedbackSheet(false)
                      setFeedbackStatus('idle')
                      setFeedbackMessage('')
                      setFeedbackType('general')
                    }}
                    className="mt-2 w-full rounded-xl py-3 font-semibold text-sm bg-teal-500 hover:bg-teal-600 text-white cursor-pointer transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-base font-semibold text-gray-800 mb-2">Feedback</p>
                  <p className="text-sm text-gray-500 mb-3">
                    Share your thoughts, report a bug, or suggest a feature.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {FEEDBACK_CATEGORIES.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFeedbackType(opt.value)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          feedbackType === opt.value
                            ? 'bg-teal-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
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
                </>
              )}
            </div>
          </div>
        )}

        {/* Sign Out Confirmation Dialog */}
        {showSignOutDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <LogOut size={20} className="text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 text-center mb-1">Sign Out?</h3>
              <p className="text-sm text-gray-500 text-center mb-5">
                You&apos;ll need to sign in again to access your account.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSignOutDialog(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Telegram Disconnect Dialog */}
        {showTelegramDisconnectDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Disconnect Telegram?</h3>
              <p className="text-sm text-gray-500 mb-4">
                You won&apos;t receive transactions on Telegram.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowTelegramDisconnectDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={disconnectTelegram}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Disconnect Dialog */}
        {showWhatsappDisconnectDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Disconnect WhatsApp?</h3>
              <p className="text-sm text-gray-500 mb-4">
                You won&apos;t receive transactions on WhatsApp.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowWhatsappDisconnectDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={disconnectWhatsapp}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
