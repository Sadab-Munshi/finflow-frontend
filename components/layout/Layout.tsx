'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Clock, Plus, BarChart3, PiggyBank, FileText, X, Wallet, Menu, UserCircle, Settings } from 'lucide-react';
import { cn, getTodayIndianDate } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';
import { posthog } from '@/lib/posthog';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // Identify user in PostHog
      posthog.identify(user.id, {
        email: user.email,
        name: user.user_metadata?.full_name,
      })
      
      // Check if user is banned
      const checkBan = async () => {
        const { data } = await supabase
          .from('user_management')
          .select('is_banned, ban_reason')
          .eq('user_id', user.id)
          .single()
        
        if (data?.is_banned) {
          await supabase.auth.signOut()
          router.push('/login?banned=true')
        }
      }
      await checkBan()
      
      // Track user login via API route (bypasses RLS)
      const trackUserLogin = async () => {
        let ipAddress = 'unknown'
        try {
          const ipRes = await fetch('https://api.ipify.org?format=json')
          const ipData = await ipRes.json()
          ipAddress = ipData.ip
        } catch (e) {}

        await fetch('/api/track-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            ipAddress,
          })
        })
      }

      await trackUserLogin()
      
      // Heartbeat ping for online status
      const pingHeartbeat = async () => {
        await fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        })
      }
      pingHeartbeat()
      const heartbeatInterval = setInterval(pingHeartbeat, 30000)
      
      setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User')
      
      const { data } = await supabase.from('settings').select('avatar_url, name').eq('user_id', user.id).single()
      if (data?.avatar_url) setAvatarUrl(data.avatar_url)
      if (data?.name) setUserName(data.name)
      
      return () => clearInterval(heartbeatInterval)
    }
    load()
  }, [router])

  // Polling ban detection - check every 20 seconds
  useEffect(() => {
    const checkBanStatus = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get IP
      let ipAddress = 'unknown'
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json')
        const ipData = await ipRes.json()
        ipAddress = ipData.ip
      } catch (e) {}

      // Check user ban
      const banRes = await fetch('/api/check-ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      const banData = await banRes.json()

      // Check IP ban
      const ipBanRes = await fetch('/api/check-ip-ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress })
      })
      const ipBanData = await ipBanRes.json()

      console.log('IP ban result:', ipBanData)

      if (banData.banned || ipBanData.banned) {
        await supabase.auth.signOut()
        window.location.href = '/login?banned=true'
      }
    }

    // Check immediately
    checkBanStatus()

    // Poll every 20 seconds
    const interval = setInterval(checkBanStatus, 20000)
    return () => clearInterval(interval)
  }, [])

  const navItems = [
    { path: '/dashboard', icon: Home, label: t('dashboard') },
    { path: '/history', icon: Clock, label: t('history') },
    { path: '/add', icon: Plus, label: t('add') },
    { path: '/budgets', icon: PiggyBank, label: t('budgets') },
    { path: '/insights', icon: BarChart3, label: t('insights') },
    { path: '/reports', icon: FileText, label: t('reports') },
    { path: '/profile', icon: UserCircle, label: 'Profile' },
  ];

  const mobileNavItems = [
    { path: '/dashboard', icon: Home, label: t('dashboard') },
    { path: '/history', icon: Clock, label: t('history') },
    { path: '/add', icon: Plus, label: t('add'), isMain: true },
    { path: '/insights', icon: BarChart3, label: t('insights') },
    { path: '/profile', icon: UserCircle, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/40 via-white to-amber-50/30">
      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-40 no-print">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-teal-600/25"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-600/25">
          <NotificationBell />
        </div>
      </header>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 no-print">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-72 bg-teal-700 flex flex-col z-50 overflow-y-auto">
            <div className="flex items-center gap-3 p-4 bg-teal-800">
              <div className="w-10 h-10 relative rounded-full overflow-hidden bg-teal-600 flex items-center justify-center flex-shrink-0">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Profile" fill className="object-cover" sizes="40px" />
                ) : (
                  <span className="text-white font-bold text-sm">{userName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="text-white font-medium text-sm truncate">{userName}</span>
              <button onClick={() => setSidebarOpen(false)} className="ml-auto text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Mobile hamburger drawer - portrait only */}
            <nav className="md:hidden flex-1 p-3 space-y-1">
              {[
                { icon: <PiggyBank size={20} />, label: 'Budgets', href: '/budgets' },
                { icon: <FileText size={20} />, label: 'Reports', href: '/reports' },
                { icon: <Settings size={20} />, label: 'Settings', href: '/settings' },
              ].map(item => (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-white hover:bg-teal-600 transition-colors rounded-xl">
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
            
            {/* Desktop sidebar nav - landscape only */}
            <nav className="hidden md:flex md:flex-col md:flex-1 md:overflow-y-auto p-3 space-y-1">
              {[
                { icon: <Home size={20} />, label: 'Dashboard', href: '/dashboard' },
                { icon: <Clock size={20} />, label: 'History', href: '/history' },
                { icon: <PiggyBank size={20} />, label: 'Budgets', href: '/budgets' },
                { icon: <BarChart3 size={20} />, label: 'Insights', href: '/insights' },
                { icon: <FileText size={20} />, label: 'Reports', href: '/reports' },
                { icon: <Settings size={20} />, label: 'Settings', href: '/settings' },
              ].map(item => (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-white hover:bg-teal-600 transition-colors rounded-xl">
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-40 no-print shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {mobileNavItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={cn("flex flex-col items-center gap-1 py-2 px-3", item.isMain && "relative -top-5")}
          >
            {item.isMain ? (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-violet-500/40 ring-4 ring-white">
                <item.icon className="w-6 h-6" />
              </div>
            ) : (
              <>
                <item.icon className={cn("w-5 h-5 transition-colors", pathname === item.path ? "text-teal-600" : "text-gray-400")} />
                <span className={cn("text-xs font-medium transition-colors", pathname === item.path ? "text-teal-600" : "text-gray-400")}>{item.label}</span>
              </>
            )}
          </Link>
        ))}
      </nav>

      {/* Desktop Sidebar (md and up) */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-teal-700 to-teal-800 z-40 overflow-y-auto no-print shadow-xl">
        <div className="h-16 flex items-center px-6 gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-violet-500 flex items-center justify-center shadow-lg">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight flex-1">FinFlow</span>
          <NotificationBell />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { icon: <Home size={20} />, label: 'Dashboard', href: '/dashboard' },
            { icon: <Clock size={20} />, label: 'History', href: '/history' },
            { icon: <PiggyBank size={20} />, label: 'Budgets', href: '/budgets' },
            { icon: <BarChart3 size={20} />, label: 'Insights', href: '/insights' },
            { icon: <FileText size={20} />, label: 'Reports', href: '/reports' },
            { icon: <Settings size={20} />, label: 'Settings', href: '/settings' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                pathname === item.href ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20" : "text-teal-200 hover:bg-white/10 hover:text-white"
              )}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-teal-600/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative rounded-full overflow-hidden bg-teal-600 flex items-center justify-center flex-shrink-0">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Profile" fill className="object-cover" sizes="40px" />
              ) : (
                <span className="text-white font-bold text-sm">{userName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="text-white font-medium text-sm truncate">{userName}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn("pt-14 pb-20 md:pt-0 md:pb-0", "md:ml-64", "min-h-screen")}>
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Print Header */}
      <div className="print-only fixed top-0 left-0 right-0 p-4 bg-white border-b">
        <div className="flex justify-between items-center">
          <span className="font-bold text-xl">FinFlow</span>
          <span className="text-sm text-gray-500">Printed on {getTodayIndianDate()}</span>
        </div>
      </div>
    </div>
  );
}
