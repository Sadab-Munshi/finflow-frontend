'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, History, PiggyBank, BarChart2, FileText, Settings,
  User, PenLine, LogOut, X, Menu, Plus
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
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)

  const mobileBottomNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { path: '/history', icon: History, label: t('history') },
    { path: '/add', icon: Plus, label: t('add'), isMain: true },
    { path: '/insights', icon: BarChart2, label: t('insights') },
    { path: '/profile', icon: User, label: t('profile') },
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

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    setProfileDropdownOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const userName = user?.userName || ''
  const email = user?.email || ''
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

  const ProfileSkeleton = ({ showEmail = false }: { showEmail?: boolean }) => (
    <div className="flex items-center gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-teal-600/50" />
      <div className="flex-1 min-w-0">
        <div className="h-4 w-24 bg-teal-600/50 rounded" />
        {showEmail && <div className="h-3 w-32 bg-teal-600/30 rounded mt-1.5" />}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/40 via-white to-amber-50/30">
      {/* Fixed Notification Bell — always top right, both modes */}
      <div className="fixed top-4 right-4 z-[51] no-print">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-600/25">
          <NotificationBell />
        </div>
      </div>

      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 w-11 h-11 rounded-full bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-teal-600/25 no-print"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Portrait Sidebar (Mobile Drawer) */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 no-print">
            {/* Dark overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Sidebar panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 h-screen w-72 bg-gradient-to-b from-teal-700 to-teal-800 flex flex-col z-50 overflow-y-auto"
            >
              {/* Close button */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Profile Section at top */}
              <Link
                href="/profile"
                onClick={() => setSidebarOpen(false)}
                className="block p-5 pb-4 hover:bg-white/5 transition-colors"
              >
                {loading ? (
                  <ProfileSkeleton showEmail />
                ) : (
                  <div className="flex items-center gap-3">
                    <AvatarCircle size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{userName}</p>
                      <p className="text-teal-200/70 text-xs truncate mt-0.5">{email}</p>
                    </div>
                  </div>
                )}
              </Link>

              {/* Divider */}
              <div className="mx-4 border-t border-teal-600/50" />

              {/* Nav Items */}
              <nav className="flex-1 p-3 space-y-1 mt-1">
                {sidebarNavItems.map(item => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                      pathname === item.path
                        ? 'bg-white text-teal-700 shadow-lg'
                        : 'text-white hover:bg-white/10'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-40 no-print shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {mobileBottomNavItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={cn('flex flex-col items-center gap-1 py-2 px-3', item.isMain && 'relative -top-5')}
          >
            {item.isMain ? (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-violet-500/40 ring-4 ring-white">
                <item.icon className="w-6 h-6" />
              </div>
            ) : (
              <>
                <item.icon className={cn('w-5 h-5 transition-colors', pathname === item.path ? 'text-teal-600' : 'text-gray-400')} />
                <span className={cn('text-xs font-medium transition-colors', pathname === item.path ? 'text-teal-600' : 'text-gray-400')}>{item.label}</span>
              </>
            )}
          </Link>
        ))}
      </nav>

      {/* Landscape Sidebar (Desktop — fixed left panel) */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-teal-700 to-teal-800 z-40 overflow-y-auto no-print shadow-xl">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 flex-shrink-0">
          <Image
            src="/images/finflow-logo.png"
            alt="FinFlow"
            width={120}
            height={40}
            style={{ objectFit: 'contain', pointerEvents: 'none' }}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarNavItems.map(item => (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                pathname === item.path
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                  : 'text-teal-200 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Profile Section with Dropdown */}
        <div className="relative p-4 border-t border-teal-600/50 flex-shrink-0" ref={profileDropdownRef}>
          <AnimatePresence>
            {profileDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
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
                  className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors w-full border-t border-gray-100"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-3 w-full hover:bg-white/5 rounded-xl p-2 -m-2 transition-colors"
          >
            {loading ? (
              <ProfileSkeleton />
            ) : (
              <>
                <AvatarCircle size={40} />
                <span className="text-white font-medium text-sm truncate flex-1 text-left">{userName}</span>
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
