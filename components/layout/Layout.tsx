'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, History, PiggyBank, BarChart2, FileText, Settings,
  User, PenLine, LogOut, X, Menu, Plus, Mic, Camera, Sparkles
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn, getTodayIndianDate } from '@/lib/utils'
import { useLanguage } from '@/context/LanguageContext'
import { useUser } from '@/context/UserContext'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/notifications/NotificationBell'

const sidebarNavItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { path: '/insights', icon: BarChart2, label: 'Insights' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLanguage()
  const { user, loading } = useUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)

  const fabSpeedDialItems = [
    { icon: PenLine,  label: 'Type',  tab: 'manual', bg: '#2563EB', color: '#ffffff' },
    { icon: Sparkles, label: 'Auto',  tab: 'text',   bg: '#7C3AED', color: '#ffffff' },
    { icon: Mic,      label: 'Voice', tab: 'voice',  bg: '#16A34A', color: '#ffffff' },
    { icon: Camera,   label: 'Scan',  tab: 'scan',   bg: '#EA580C', color: '#ffffff' },
  ]

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close side panels/modals on route change
  useEffect(() => {
    setSidebarOpen(false)
    setFabOpen(false)
    setProfileDropdownOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    setProfileDropdownOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut({ scope: 'local' })
    router.push('/login')
  }

  // Accessibility key listener for custom profile dropdown
  const handleProfileKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setProfileDropdownOpen(prev => !prev)
    } else if (e.key === 'Escape') {
      setProfileDropdownOpen(false)
    }
  }

  const userName = user?.userName || ''
  const avatarUrl = user?.avatarUrl || ''
  const initial = userName ? userName.charAt(0).toUpperCase() : ''

  const AvatarCircle = ({ size = 40, className = '' }: { size?: number; className?: string }) => (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0 overflow-hidden relative',
        className
      )}
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt="Profile" fill className="object-cover" sizes={`${size}px`} />
      ) : (
        <span className="text-white font-bold" style={{ fontSize: size * 0.35 }}>
          {initial}
        </span>
      )}
    </div>
  )

  const ProfileSkeleton = () => (
    <div className="flex items-center gap-3 animate-pulse w-full">
      <div className="w-10 h-10 rounded-full bg-teal-600/50 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-4 w-24 bg-teal-600/50 rounded" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/40 via-white to-amber-50/30">
      {/* Fixed Notification Bell */}
      <div className="fixed top-4 right-4 z-[51] no-print">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-600/25">
          <NotificationBell />
        </div>
      </div>

      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar panel"
        className="md:hidden fixed top-4 left-4 z-40 w-11 h-11 rounded-full bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-teal-600/25 no-print"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Portrait Sidebar (Mobile Drawer) */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 no-print">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 h-screen w-[72vw] max-w-[260px] bg-gradient-to-b from-teal-700 to-teal-800 flex flex-col z-50 overflow-y-auto"
            >
              <div className="px-4 pt-4 flex-shrink-0">
                <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ backgroundColor: '#D9FAF7' }}>
                  <Image
                    src="/images/finflow-logo.png"
                    alt="FinFlow"
                    width={120}
                    height={40}
                    sizes="120px"
                    style={{ objectFit: 'contain', pointerEvents: 'none' }}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="text-teal-700 hover:text-teal-900 transition-colors flex-shrink-0"
                    aria-label="Close sidebar panel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="mx-4 mt-3 border-t border-teal-600/50" />
              <nav className="flex-1 p-3 space-y-1 mt-1">
                {sidebarNavItems.map(item => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                      pathname === item.path
                        ? 'bg-white/20 text-white font-semibold'
                        : 'text-white/70 font-normal hover:bg-white/10'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                ))}
              </nav>
              <div className="mt-auto py-3 px-4 border-t border-white/20 flex-shrink-0">
                {loading ? (
                  <ProfileSkeleton />
                ) : (
                  <div className="flex items-center gap-3">
                    <AvatarCircle size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{userName}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FAB Speed Dial Backdrop */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/25 z-40 no-print"
            onClick={() => setFabOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Speed Dial — no drag */}
      <div className="fixed bottom-[72px] right-4 md:bottom-8 md:right-8 z-50 no-print">
        <AnimatePresence>
          {fabOpen && (
            <div className="absolute bottom-full mb-4 right-0 flex flex-col-reverse gap-2.5">
              {fabSpeedDialItems.map((item, index) => (
                <motion.button
                  key={item.tab}
                  initial={{ opacity: 0, scale: 0.5, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.5, x: 20 }}
                  transition={{
                    delay: index * 0.05,
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                  }}
                  onClick={() => router.push(`/add?tab=${item.tab}`)}
                  className="flex flex-row-reverse items-center gap-3 group text-left outline-none"
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white/30"
                    style={{ backgroundColor: item.bg }}
                  >
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                  </motion.div>
                  <motion.span
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ delay: index * 0.05 + 0.05 }}
                    className="bg-white rounded-full px-4 py-1.5 text-sm font-semibold shadow-md text-[#0F172A] whitespace-nowrap border border-gray-100"
                  >
                    {item.label}
                  </motion.span>
                </motion.button>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.button
          onClick={() => setFabOpen(prev => !prev)}
          whileTap={{ scale: 0.92 }}
          aria-label="Open creation selections panel"
          aria-expanded={fabOpen}
          className="w-14 h-14 rounded-full bg-[#0A7B7B] flex items-center justify-center text-white shadow-xl shadow-[#0A7B7B]/40 ring-4 ring-white outline-none"
        >
          <motion.span
            animate={{ rotate: fabOpen ? 45 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex items-center justify-center pointer-events-none"
          >
            <Plus className="w-6 h-6" />
          </motion.span>
        </motion.button>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-40 no-print shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 py-2 px-3 flex-1">
          <LayoutDashboard className={cn('w-5 h-5 transition-colors', pathname === '/dashboard' ? 'text-teal-600' : 'text-gray-400')} />
          <span className={cn('text-xs font-medium transition-colors', pathname === '/dashboard' ? 'text-teal-600' : 'text-gray-400')}>{t('dashboard')}</span>
        </Link>
        <Link href="/history" className="flex flex-col items-center gap-1 py-2 px-3 flex-1">
          <History className={cn('w-5 h-5 transition-colors', pathname === '/history' ? 'text-teal-600' : 'text-gray-400')} />
          <span className={cn('text-xs font-medium transition-colors', pathname === '/history' ? 'text-teal-600' : 'text-gray-400')}>{t('history')}</span>
        </Link>
        <Link href="/insights" className="flex flex-col items-center gap-1 py-2 px-3 flex-1">
          <BarChart2 className={cn('w-5 h-5 transition-colors', pathname === '/insights' ? 'text-teal-600' : 'text-gray-400')} />
          <span className={cn('text-xs font-medium transition-colors', pathname === '/insights' ? 'text-teal-600' : 'text-gray-400')}>{t('insights')}</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 py-2 px-3 flex-1">
          <User className={cn('w-5 h-5 transition-colors', pathname === '/profile' ? 'text-teal-600' : 'text-gray-400')} />
          <span className={cn('text-xs font-medium transition-colors', pathname === '/profile' ? 'text-teal-600' : 'text-gray-400')}>{t('profile')}</span>
        </Link>
      </nav>

      {/* Landscape Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-teal-700 to-teal-800 z-40 overflow-y-auto no-print shadow-xl">
        <div className="px-4 pt-4 flex-shrink-0">
          <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ backgroundColor: '#D9FAF7' }}>
            <Image
              src="/images/finflow-logo.png"
              alt="FinFlow"
              width={120}
              height={40}
              sizes="120px"
              style={{ objectFit: 'contain', pointerEvents: 'none' }}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        </div>
        <div className="px-3 pt-3 pb-3">
          <button
            onClick={() => router.push('/add?tab=manual')}
            className="flex items-center justify-center gap-2 w-full bg-white text-teal-700 rounded-xl py-2.5 font-semibold hover:bg-teal-50 transition-colors shadow-sm outline-none"
          >
            <Plus className="w-5 h-5" />
            <span>Add</span>
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarNavItems.map(item => (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                pathname === item.path
                  ? 'bg-white/20 text-white font-semibold'
                  : 'text-white/70 font-normal hover:bg-white/10'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="relative p-4 border-t border-teal-600/50 flex-shrink-0" ref={profileDropdownRef}>
          <AnimatePresence>
            {profileDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
              >
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">View Profile</span>
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors border-t border-gray-100"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  <PenLine className="w-4 h-4" />
                  <span className="text-sm font-medium">Edit Profile</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors w-full border-t border-gray-100 text-left outline-none"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            onKeyDown={handleProfileKeyDown}
            aria-haspopup="true"
            aria-expanded={profileDropdownOpen}
            className="flex items-center gap-3 w-full hover:bg-white/5 rounded-xl p-2 transition-colors text-left outline-none"
          >
            {loading ? (
              <ProfileSkeleton />
            ) : (
              <>
                <AvatarCircle size={40} />
                <span className="text-white font-medium text-sm truncate flex-1">{userName}</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn('pt-14 pb-20 md:pt-0 md:pb-0', 'md:ml-64', 'min-h-screen')}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="p-4 md:p-6 lg:p-8"
        >
          {children}
        </motion.div>
      </main>

      {/* Print Header */}
      <div className="print-only fixed top-0 left-0 right-0 p-4 bg-white border-b">
        <div className="flex justify-between items-center">
          <span className="font-bold text-xl">FinFlow</span>
          <span className="text-sm text-gray-500">Printed on {getTodayIndianDate()}</span>
        </div>
      </div>
    </div>
  )
              }
