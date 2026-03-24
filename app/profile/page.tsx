'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Pencil, Check, Settings } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import Layout from '@/components/layout/Layout'
import { useLanguage } from '@/context/LanguageContext'
import { getSettings, upsertSettings } from '@/lib/db'
import { cn } from '@/lib/utils'
import { posthog } from '@/lib/posthog'
import LoadingScreen from '@/components/ui/LoadingScreen'

type Language = 'en' | 'hi' | 'bn'

export default function ProfilePage() {
  const router = useRouter()
  const { language, setLanguage } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [memberSince, setMemberSince] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const { createClient } = await import('@/lib/supabase/client')
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
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const dbSettings = await getSettings()
      if (dbSettings) {
        if (dbSettings.name) {
          setName(dbSettings.name)
        }
        if (dbSettings.avatar_url) {
          setAvatarUrl(dbSettings.avatar_url)
        }
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
      setLoading(false)
      setMounted(true)
    }
    load()
  }, [])

  if (loading) return <LoadingScreen />
  if (!mounted) return null

  const uploadAvatar = async (file: File) => {
    setUploading(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl + '?t=' + Date.now())
      await supabase.from('settings').upsert({
        user_id: user.id,
        avatar_url: data.publicUrl
      }, { onConflict: 'user_id' })
      posthog.capture('profile_photo_uploaded')
    }
    setUploading(false)
  }

  const saveName = async () => {
    const { createClient } = await import('@/lib/supabase/client')
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
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Avatar Header Section with Gradient */}
        <div className="rounded-2xl bg-gradient-to-b from-teal-500 to-teal-600 pt-8 pb-6 flex flex-col items-center">
          <div className="relative">
            <div className="w-28 h-28 relative rounded-full overflow-hidden bg-white/30 border-4 border-white/60 shadow-lg">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Profile" fill className="object-cover" sizes="112px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-white text-teal-600 rounded-full p-1.5 cursor-pointer shadow">
              <Camera size={16} />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
            </label>
          </div>
          {uploading && <p className="text-xs text-white/70 mt-2">Uploading...</p>}

          {/* Name */}
          <div className="mt-4">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => e.target.value.length <= 20 && setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  maxLength={20}
                  className="text-center text-lg border-b border-white/60 bg-transparent outline-none px-2 py-1 text-white placeholder-white/50"
                  autoFocus
                />
                <button onClick={saveName}>
                  <Check size={18} className="text-white" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold text-white" style={{ fontFamily: 'Georgia, serif' }}>{name}</h2>
                <button onClick={() => setEditingName(true)}>
                  <Pencil size={14} className="text-white/70" />
                </button>
              </div>
            )}
          </div>

          {/* Member Since Badge */}
          {memberSince && (
            <div className="mt-2 px-3 py-1 bg-white/20 rounded-full text-xs text-white font-medium">
              ⭐ Member since {memberSince}
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="text-xs text-gray-500 font-medium">Email</label>
          <input value={email} disabled className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm bg-gray-50 text-gray-400" />
        </div>

        {/* Language Selector */}
        <div>
          <p className="text-xs text-gray-500 font-medium mb-2">Language</p>
          <div className="grid grid-cols-3 gap-2">
            {([{ code: 'en' as Language, label: 'English' }, { code: 'hi' as Language, label: 'हिंदी' }, { code: 'bn' as Language, label: 'বাংলা' }]).map(lang => (
              <Button
                key={lang.code}
                variant={language === lang.code ? 'default' : 'outline'}
                onClick={() => handleLanguageChange(lang.code)}
                className={cn(
                  "h-auto py-3 text-sm font-medium",
                  language === lang.code
                    ? "bg-teal-600 hover:bg-teal-700 text-white border-teal-600"
                    : "border-gray-200 text-gray-600"
                )}
              >
                {lang.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Settings Button */}
        <Button
          variant="outline"
          className="w-full border-gray-200 text-gray-700 flex items-center justify-center gap-2"
          onClick={() => router.push('/settings')}
        >
          <Settings size={16} />
          Settings
        </Button>
      </div>
    </Layout>
  )
}
