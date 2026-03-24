'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, AlertTriangle, Check, Loader2, Mic, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { addTransaction } from '@/lib/db'
import { categories, getCategoriesByType } from '@/lib/categories'
import { cn, formatIndianCurrency, getTodayIndianDate } from '@/lib/utils'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { Transaction } from '@/lib/types'
import { posthog } from '@/lib/posthog'

interface ParsedTransaction {
  amount: number
  type: 'income' | 'expense'
  category: string
  note: string
  description?: string
  date: string | null
  confidence: number
}

// Always returns today's date in IST as YYYY-MM-DD
function getTodayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function AddTransactionContent() {
  // ALL hooks must be here at the top - no exceptions
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()

  // ALL useState hooks
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'manual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedTransaction, setParsedTransaction] = useState<ParsedTransaction | null>(null)
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([])
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(getTodayIST())
  const [textInput, setTextInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const recordingDurationRef = useRef(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const MAX_RECORDING_SECONDS = 15

  // ALL useEffect hooks
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!isListening && transcript) {
      posthog.capture('voice_used', { transcript_length: transcript.length })
    }
  }, [isListening, transcript])

  // Auto stop recording at MAX_RECORDING_SECONDS
  useEffect(() => {
    if (isListening) {
      const timer = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          recordingDurationRef.current = newTime
          console.log('Recording time:', newTime)
          if (newTime >= MAX_RECORDING_SECONDS) {
            handleVoiceStop()
            clearInterval(timer)
            return MAX_RECORDING_SECONDS
          }
          return newTime
        })
      }, 1000)
      return () => clearInterval(timer)
    } else {
      setRecordingTime(0)
    }
  }, [isListening])

  // Only AFTER all hooks can you have conditions, returns or JSX
  if (!mounted) return null

  const callAI = async (endpoint: string, body: object) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error || `AI request failed (${res.status})`)
    }
    return res.json()
  }

  // Normalize category name from AI to match our categories list
  const resolveCategory = (aiCategory: string): string => {
    if (!aiCategory) return 'Other'
    const available = categories.map(c => c.name)
    const match = available.find(
      c => c.toLowerCase() === aiCategory.toLowerCase().trim()
    )
    if (match) return match
    const mappings: Record<string, string> = {
      'health & medical': 'Health',
      'housing & rent': 'Rent',
      'business income': 'Business',
      'groceries & essentials': 'Groceries',
    }
    return mappings[aiCategory.toLowerCase().trim()] || 'Other'
  }

  const checkBudgetAlert = async () => {
    try {
      console.log('[checkBudgetAlert] Calling budget alert API...')
      const res = await fetch('/api/notifications/budget-alert', {
        method: 'POST',
      })
      const data = await res.json()
      console.log('[checkBudgetAlert] Response:', data)
    } catch (e) {
      console.error('[checkBudgetAlert] Failed:', e)
    }
  }

  // ✅ Manual save — user picked the date themselves
  const handleManualSave = async () => {
    if (isSubmitting) return
    if (!amount || !category || !note) { setError(t('errorOccurred')); return }
    setIsSubmitting(true)
    try {
      const tx: Omit<Transaction, 'id' | 'created_at'> = {
        amount: parseFloat(amount),
        type,
        category,
        note,
        date, // user-selected date from date picker
      }
      await addTransaction(tx)
      // Track transaction added event
      posthog.capture('transaction_added', { 
        type: tx.type, 
        category: tx.category, 
        amount: tx.amount 
      })
      console.log('Transaction saved, checking budget alert...')
      try {
        await checkBudgetAlert()
      } catch (e) {
        console.error('Budget alert check failed:', e)
      }
      router.push('/history')
    } catch (e) {
      console.error('Failed to save transaction:', e)
      setError(t('errorOccurred'))
      setIsSubmitting(false)
    }
  }

  const handleParseText = async () => {
    if (!textInput.trim()) return
    setLoading(true); setError(null)
    try {
      const result = await callAI('/api/ai/parse-text', { text: textInput })
      setParsedTransaction(result)
    } catch (err: any) {
      console.error('NLP parse error:', err)
      setError(err?.message || 'Failed to parse. Please try again.')
    } finally { setLoading(false) }
  }

  const handleVoiceStart = async () => {
    setError(null)
    setTranscript('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        setLoading(true)
        try {
          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')
          const sarvamRes = await fetch('/api/ai/speech-to-text', { method: 'POST', body: formData })
          if (!sarvamRes.ok) {
            const errorData = await sarvamRes.json().catch(() => ({}))
            throw new Error(errorData.error || `Speech-to-text failed (${sarvamRes.status})`)
          }
          const { transcript } = await sarvamRes.json()
          setTranscript(transcript)

          const mistralRes = await fetch('/api/ai/parse-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: transcript }),
          })
          if (!mistralRes.ok) {
            const errorData = await mistralRes.json().catch(() => ({}))
            throw new Error(errorData.error || `Parse failed (${mistralRes.status})`)
          }
          const parsed = await mistralRes.json()
          setParsedTransaction(parsed)
        } catch (err: any) { 
          setError(err?.message || t('errorOccurred')) 
        } finally { setLoading(false) }
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsListening(true)
    } catch { setError('Microphone access denied') }
  }

  const handleVoiceStop = () => {
    mediaRecorder?.stop()
    setIsListening(false)
  }

  const handleParseVoice = async () => {
    if (!transcript.trim()) return
    setLoading(true); setError(null)
    try {
      const result = await callAI('/api/ai/parse-text', { text: transcript })
      setParsedTransaction(result)
    } catch (err: any) { 
      setError(err?.message || t('errorOccurred')) 
    } finally { setLoading(false) }
  }

  const handleFileUpload = async (file: File) => {
    setLoading(true); setError(null)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const base64 = (e.target?.result as string).split(',')[1]
        const result = await callAI('/api/ai/parse-receipt', {
          base64,
          mimeType: file.type || 'image/jpeg',
        })
        const txs: ParsedTransaction[] = result.transactions || [result]
        if (txs.length === 1) setParsedTransaction(txs[0])
        else setParsedTransactions(txs)
      } catch (err: any) { 
        setError(err?.message || t('errorOccurred')) 
      } finally { setLoading(false) }
    }
    reader.readAsDataURL(file)
  }

  // ✅ AI confirm — ALWAYS use today's IST date, ignore AI's date field
  const confirmParsed = async (
    parsed: ParsedTransaction,
    _source: 'nlp' | 'voice' | 'receipt' | 'pdf'
  ) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const transaction = {
        amount: Number(parsed.amount) || 0,
        type: parsed.type || 'expense',
        category: resolveCategory(parsed.category),
        note: parsed.note || parsed.description || '',
        date: getTodayIST(), // ✅ always today's IST date, never AI's date
      }
      const result = await addTransaction(transaction)
      if (result) {
        // Track transaction added event
        posthog.capture('transaction_added', { 
          type: transaction.type, 
          category: transaction.category, 
          amount: transaction.amount 
        })
        console.log('Transaction saved, checking budget alert...')
        try {
          await checkBudgetAlert()
        } catch (e) {
          console.error('Budget alert check failed:', e)
        }
        setParsedTransaction(null)
        router.push('/history')
      } else {
        setError(t('errorOccurred'))
        setIsSubmitting(false)
      }
    } catch (e) {
      console.error('Failed to save transaction:', e)
      setIsSubmitting(false)
    }
  }

  // ✅ AI confirm all (scan) — ALWAYS use today's IST date
  const confirmAllParsed = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      for (const parsed of parsedTransactions) {
        const transaction = {
          amount: Number(parsed.amount) || 0,
          type: parsed.type || 'expense',
          category: resolveCategory(parsed.category),
          note: parsed.note || parsed.description || '',
          date: getTodayIST(), // ✅ always today's IST date
        }
        await addTransaction(transaction)
      }
      console.log('Transactions saved, checking budget alert...')
      try {
        await checkBudgetAlert()
      } catch (e) {
        console.error('Budget alert check failed:', e)
      }
      setParsedTransactions([])
      router.push('/history')
    } catch (e) {
      console.error('Failed to save transactions:', e)
      setIsSubmitting(false)
    }
  }

  const PreviewCard = ({
    parsed,
    source,
  }: {
    parsed: ParsedTransaction
    source: 'nlp' | 'voice' | 'receipt' | 'pdf'
  }) => {
    const cat = categories.find(
      c => c.name.toLowerCase() === parsed.category?.toLowerCase?.()
    )
    return (
      <Card className="border-2 border-teal-500">
        <CardHeader>
          <CardTitle className="text-lg text-gray-800">{t('transactionDetails')}</CardTitle>
          {parsed.confidence < 0.7 && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {t('lowConfidence')}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">{t('amount')}</p>
              <p className={cn(
                "text-xl font-bold",
                parsed.type === 'income' ? "text-emerald-600" : "text-rose-600"
              )}>
                {formatIndianCurrency(Number(parsed.amount))}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('type')}</p>
              <p className="font-medium capitalize">
                {parsed.type === 'income' ? t('income') : t('expense')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('category')}</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat?.color || '#6b7280' }} />
                <span>{resolveCategory(parsed.category)}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('date')}</p>
              {/* ✅ Show today's IST date, not AI's date */}
              <p>{getTodayIST()}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('description')}</p>
            <p className="font-medium">{parsed.note || parsed.description}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('confidence')}</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className={cn(
                  "h-2 rounded-full",
                  parsed.confidence >= 0.8
                    ? "bg-emerald-500"
                    : parsed.confidence >= 0.6
                    ? "bg-amber-500"
                    : "bg-red-500"
                )}
                style={{ width: `${(parsed.confidence * 100).toFixed(0)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {(parsed.confidence * 100).toFixed(0)}%
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => confirmParsed(parsed, source)}
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('loading')}</> : <><Check className="w-4 h-4 mr-2" />{t('confirm')}</>}
            </Button>
            <Button
              variant="outline"
              onClick={() => setParsedTransaction(null)}
              className="flex-1 border-gray-200"
            >
              {t('discard')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('addTransaction')}</h1>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-gray-100">
            {['manual', 'text', 'voice', 'scan'].map(tab => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="flex-1 data-[state=active]:bg-emerald-600 data-[state=active]:text-white capitalize"
              >
                {t(tab)}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* MANUAL TAB */}
          <TabsContent value="manual" className="mt-4">
            <Card className="border-gray-100">
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('amount')}</label>
                  <Input
                    type="number"
                    placeholder={t('amount')}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('type')}</label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      type="button"
                      variant={type === 'expense' ? 'default' : 'outline'}
                      onClick={() => setType('expense')}
                      className={cn("flex-1", type === 'expense' ? "bg-orange-500 hover:bg-orange-600" : "border-gray-200")}
                    >
                      {t('expense')}
                    </Button>
                    <Button
                      type="button"
                      variant={type === 'income' ? 'default' : 'outline'}
                      onClick={() => setType('income')}
                      className={cn("flex-1", type === 'income' ? "bg-emerald-500 hover:bg-emerald-600" : "border-gray-200")}
                    >
                      {t('income')}
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('category')}</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder={t('category')} />
                    </SelectTrigger>
                    <SelectContent>
                      {getCategoriesByType(type).map(c => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('description')}</label>
                  <Input
                    placeholder={t('description')}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('date')}</label>
                  {/* ✅ type="date" — browser gives YYYY-MM-DD, no format confusion */}
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="border-gray-200"
                  />
                </div>
                <Button onClick={handleManualSave} disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('loading')}</> : t('save')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TEXT / NLP TAB */}
          <TabsContent value="text" className="mt-4">
            {parsedTransaction ? (
              <PreviewCard parsed={parsedTransaction} source="nlp" />
            ) : (
              <Card className="border-gray-100">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('description')}</label>
                    <textarea
                      className="w-full h-32 mt-1 p-3 border border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                      placeholder={t('typeHere')}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleParseText}
                    disabled={loading || !textInput.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    {loading
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('loading')}</>
                      : t('parseWithAI')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* VOICE TAB */}
          <TabsContent value="voice" className="mt-4">
            {parsedTransaction ? (
              <PreviewCard parsed={parsedTransaction} source="voice" />
            ) : (
              <Card className="border-gray-100">
                <CardContent className="p-6 space-y-6">
                  <div className="text-center">
                    <button
                      onClick={isListening ? handleVoiceStop : handleVoiceStart}
                      className={cn(
                        "w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all",
                        isListening
                          ? "bg-red-500 animate-pulse"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      )}
                    >
                      <Mic className="w-10 h-10 text-white" />
                    </button>
                    <p className="mt-4 text-gray-600">
                      {isListening ? t('listening') : t('tapToSpeak')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Supports Hindi, Bengali, Tamil, Telugu & more
                    </p>
                    {isListening && (
                      <div className="text-center mt-3">
                        <p className="text-sm text-red-500 font-medium">Recording: {recordingTime}s / {MAX_RECORDING_SECONDS}s</p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 max-w-[200px] mx-auto">
                          <div 
                            className="bg-red-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${(recordingTime / MAX_RECORDING_SECONDS) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {transcript && (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50 rounded-lg">
                        <p className="text-sm text-gray-500">{t('description')}:</p>
                        <p className="font-medium">{transcript}</p>
                      </div>
                      <Button
                        onClick={handleParseVoice}
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                      >
                        {loading
                          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('loading')}</>
                          : t('parseWithAI')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SCAN TAB */}
          <TabsContent value="scan" className="mt-4">
            {parsedTransaction ? (
              <PreviewCard parsed={parsedTransaction} source="receipt" />
            ) : parsedTransactions.length > 0 ? (
              <Card className="border-gray-100">
                <CardHeader>
                  <CardTitle className="text-gray-800">{t('transactionDetails')}</CardTitle>
                  <CardDescription>{parsedTransactions.length} transactions found</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {parsedTransactions.map((parsed, i) => {
                    const cat = categories.find(c => c.name === parsed.category)
                    return (
                      <div key={i} className="p-4 border border-gray-100 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium">{parsed.note}</p>
                          <p className="text-sm text-gray-500">
                            {cat?.name} - {getTodayIST()}
                          </p>
                        </div>
                        <p className={cn(
                          "font-semibold",
                          parsed.type === 'income' ? "text-green-600" : "text-rose-600"
                        )}>
                          {formatIndianCurrency(parsed.amount)}
                        </p>
                      </div>
                    )
                  })}
                  <Button
                    onClick={confirmAllParsed}
                    disabled={isSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('loading')}</> : <>{t('confirmAll')} ({parsedTransactions.length})</>}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-gray-100">
                <CardContent className="p-6">
                  <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                    <input
                      type="file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.webp,.heic,.pdf"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
                    />
                    {loading ? (
                      <>
                        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                        <p className="mt-3 text-gray-600">{t('analyzing')}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-400" />
                        <p className="mt-3 text-gray-600">{t('uploadReceipt')}</p>
                        <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF supported</p>
                      </>
                    )}
                  </label>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}

export default function AddPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AddTransactionContent />
    </Suspense>
  )
}
