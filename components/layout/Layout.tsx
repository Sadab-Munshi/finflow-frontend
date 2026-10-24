'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, History, BarChart2, User, Menu, Plus, Mic, Camera,
  Sparkles, FileText, PenLine
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn, getTodayIndianDate } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { useUser } from '@/context/UserContext'
import { useSubscriptionGate } from '@/hooks/useSubscriptionGate'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/notifications/NotificationBell'
import PremiumSidebar from '@/components/layout/sidebar/PremiumSidebar'
import MobileNavDrawer from '@/components/layout/sidebar/MobileNavDrawer'

// Exact demo colors. Order: Auto & Type at the bottom (closest to thumb), moving up to PDF
const fabInputMethods = [
  { icon: Sparkles, labelKey: "fabAuto", color: "bg-purple-500", tab: "text", feature: "nlp_entry" },
  { icon: PenLine, labelKey: "fabType", color: "bg-blue-500", tab: "manual", feature: null },
  { icon: Mic, labelKey: "fabVoice", color: "bg-green-500", tab: "voice", feature: "voice_entry" },
  { icon: Camera, labelKey: "fabScan", color: "bg-orange-500", tab: "scan", feature: "receipt_scan" },
  { icon: FileText, labelKey: "fabPdf", color: "bg-red-500", tab: "scan", feature: "receipt_scan" },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('nav')
  const { user, loading } = useUser()
  const { checkFeature, userTier } = useSubscriptionGate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)

  // Close drawers / overlays on route change
  useEffect(() => {
    setDrawerOpen(false)
    setFabOpen(false)
  }, [pathname])

  // A rotated or resized viewport that now has room for the desktop rail must
  // never keep a stale drawer (and its scroll lock) on screen.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 900) setDrawerOpen(false)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut({ scope: 'local' })
    router.push('/login')
  }

  const userName = user?.userName || ''
  const avatarUrl = user?.avatarUrl || ''
  const planName = user?.planName || ''
  const isPro = Boolean(user?.isPro) || userTier === 'pro' || userTier === 'max'

  const isSubscriptionRoute = pathname?.startsWith('/subscription')

  return (
    <div
      className={cn(
        'min-h-screen',
        isSubscriptionRoute
          ? 'bg-[#F8FAFC]'
          : 'bg-gradient-to-br from-teal-50/40 via-white to-amber-50/30'
      )}
    >
      {/* Desktop navigation: expanded panel -> icon rail */}
      <PremiumSidebar
        name={userName}
        avatarUrl={avatarUrl}
        planName={planName}
        isPro={isPro}
        loading={loading}
        onSignOut={handleSignOut}
      />

      {/* Phone / tablet navigation drawer */}
      <MobileNavDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        name={userName}
        avatarUrl={avatarUrl}
        planName={planName}
        isPro={isPro}
        loading={loading}
        onSignOut={handleSignOut}
      />

      {/* Fixed Notification Bell — hidden on subscription/payment screens per UX spec */}
      {!isSubscriptionRoute && (
        <div className="fixed top-4 right-4 z-[51] no-print">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-600/25">
            <NotificationBell />
          </div>
        </div>
      )}

      {/* Drawer trigger — hidden on subscription/payment screens where the top app bar has Back navigation */}
      {!isSubscriptionRoute && (
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label={t('openNav')}
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          className="ff-menu-trigger no-print"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>
      )}

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

      {/* ======================================================= */}
      {/* EXACT DEMO FAB - FAST ANIMATION & THUMB-FRIENDLY ORDER */}
      {/* ======================================================= */}
      {!isSubscriptionRoute && (
      <div className="fixed bottom-20 min-[900px]:bottom-6 right-6 z-50 no-print">
        {/* Input Method Options */}
        <div
          className={cn(
            "absolute bottom-16 right-0 flex flex-col-reverse gap-3 transition-all duration-200",
            fabOpen
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-4 pointer-events-none"
          )}
        >
          {fabInputMethods.map((method, index) => {
            const Icon = method.icon
            const gate = method.feature ? checkFeature(method.feature) : null
            return (
              <button
                key={method.labelKey}
                onClick={() => {
                  setFabOpen(false)
                  // Tiny delay ensures the closing animation plays before Next.js interrupts it with a route change
                  setTimeout(() => router.push(`/add?tab=${method.tab}`), 50)
                }}
                className="flex items-center gap-3 px-4 py-2 rounded-full bg-white shadow-lg border border-gray-200 hover:scale-105 transition-transform"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white",
                    gate && !gate.enabled ? "bg-slate-400" : method.color
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="font-medium text-gray-900">{t(method.labelKey)}</span>
                {gate && !gate.allowed && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                    {!gate.enabled ? 'Off' : gate.requiredTier}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* FAB Button - Matching App Theme */}
<button
  onClick={() => setFabOpen(!fabOpen)}
  className={cn(
    "w-14 h-14 rounded-full bg-teal-600 text-white shadow-lg shadow-teal-600/30 flex items-center justify-center transition-transform hover:scale-105 hover:bg-teal-700",
    fabOpen && "rotate-45"
  )}
>
          <Plus className="h-6 w-6" />
        </button>
      </div>
      )}
      {/* ======================================================= */}

      {/* Mobile Bottom Nav */}
      <nav className="min-[900px]:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-40 no-print shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
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

      {/* Main Content — offset follows the live sidebar width */}
      <main
        className={cn(
          'ff-main min-h-screen',
          isSubscriptionRoute
            ? 'pt-0 pb-[calc(5rem+env(safe-area-inset-bottom))] min-[900px]:pb-8'
            : 'pt-14 pb-20 min-[900px]:pt-0 min-[900px]:pb-0'
        )}
      >
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className={cn(isSubscriptionRoute ? 'p-0' : 'p-4 md:p-6 lg:p-8')}
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
