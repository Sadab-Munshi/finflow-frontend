import {
  UtensilsCrossed, Car, ShoppingBag, Zap, Film, Heart,
  GraduationCap, Home, Apple, Scissors, Wallet, Laptop,
  Briefcase, TrendingUp, Gift, MoreHorizontal,
  PenLine, Sparkles, Mic, ScanLine,
} from 'lucide-react'
import { categories } from '@/lib/categories'

export const TEAL = '#00b894'
export const RED  = '#ef4444'
export const GREEN = '#22c55e'
export const GRAY = '#9ca3af'
export const FONT = '"DM Sans", "Inter", system-ui, sans-serif'

export const categoryIconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  'Food & Dining': UtensilsCrossed,
  'Transport': Car,
  'Shopping': ShoppingBag,
  'Bills & Utilities': Zap,
  'Entertainment': Film,
  'Health': Heart,
  'Education': GraduationCap,
  'Rent': Home,
  'Groceries': Apple,
  'Personal Care': Scissors,
  'Salary': Wallet,
  'Freelance': Laptop,
  'Business': Briefcase,
  'Investment': TrendingUp,
  'Gift': Gift,
  'Other': MoreHorizontal,
}

export interface ParsedTransaction {
  amount: number
  type: 'income' | 'expense'
  category: string
  note: string
  description?: string
  date: string | null
  confidence: number
}

export function getTodayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

export function formatDateDisplay(dateStr: string): string {
  const today = getTodayIST()
  const [y, m, d] = dateStr.split('-').map(Number)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const formatted = `${d} ${months[m - 1]} ${y}`
  return dateStr === today ? `Today, ${formatted}` : formatted
}

export function resolveCategory(aiCategory: string): string {
  if (!aiCategory) return 'Other'
  const available = categories.map(c => c.name)
  const match = available.find(c => c.toLowerCase() === aiCategory.toLowerCase().trim())
  if (match) return match
  const mappings: Record<string, string> = {
    'health & medical': 'Health', 'housing & rent': 'Rent',
    'business income': 'Business', 'groceries & essentials': 'Groceries',
  }
  return mappings[aiCategory.toLowerCase().trim()] || 'Other'
}

export const tabsConfig = [
  { id: 'manual', label: 'Manual', Icon: PenLine },
  { id: 'nlp',    label: 'NLP',    Icon: Sparkles },
  { id: 'voice',  label: 'Voice',  Icon: Mic },
  { id: 'scan',   label: 'Scan',   Icon: ScanLine },
]

export const WAVEFORM_BARS = Array.from({ length: 20 }).map((_, i) => ({
  maxHeight: 20 + ((i * 7 + 3) % 20),
  duration: 0.4 + ((i * 13 + 5) % 10) / 25,
}))
