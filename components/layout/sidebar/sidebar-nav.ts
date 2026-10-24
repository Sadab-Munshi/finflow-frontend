import {
  ArrowLeftRight,
  BarChart2,
  Crown,
  FileText,
  LayoutDashboard,
  Settings,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

/**
 * Keys that exist in `messages/<locale>/nav.json` — next-intl is strictly
 * typed through global.d.ts, so this union keeps `t(item.labelKey)` honest.
 */
export type SidebarNavKey =
  | 'dashboard'
  | 'history'
  | 'budgets'
  | 'insights'
  | 'analytics'
  | 'reports'
  | 'subscription'
  | 'settings'

export interface SidebarNavItem {
  path: string
  icon: LucideIcon
  labelKey: SidebarNavKey
}

/**
 * The single source of truth for navigation. The desktop rail, the desktop
 * expanded panel and the mobile drawer all render from this list, so links,
 * order and permission surface can never drift between layouts.
 */
export const SIDEBAR_PRIMARY_NAV: SidebarNavItem[] = [
  { path: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { path: '/history', icon: ArrowLeftRight, labelKey: 'history' },
  { path: '/budgets', icon: Wallet, labelKey: 'budgets' },
  { path: '/insights', icon: BarChart2, labelKey: 'insights' },
  { path: '/analytics', icon: TrendingUp, labelKey: 'analytics' },
  { path: '/reports', icon: FileText, labelKey: 'reports' },
  { path: '/subscription', icon: Crown, labelKey: 'subscription' },
]

export const SIDEBAR_ACCOUNT_NAV: SidebarNavItem[] = [
  { path: '/settings', icon: Settings, labelKey: 'settings' },
]

/**
 * Pages that live underneath another destination. `/transaction/[id]` is still
 * part of the transaction history, and the privacy/backup screens are opened
 * from Settings — they should light up their parent row instead of leaving the
 * sidebar with no active item at all.
 */
const NAV_PARENT_ALIASES: Record<string, string[]> = {
  '/history': ['/transaction'],
  '/settings': ['/privacy-security', '/backup-restore'],
}

export function isNavActive(pathname: string | null, path: string): boolean {
  if (!pathname) return false
  if (pathname === path) return true
  if (pathname.startsWith(`${path}/`)) return true
  const aliases = NAV_PARENT_ALIASES[path]
  if (!aliases) return false
  return aliases.some(alias => pathname === alias || pathname.startsWith(`${alias}/`))
}
