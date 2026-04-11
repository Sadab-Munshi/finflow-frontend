import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIndianCurrency(amount: number): string {
  const hasDecimals = amount % 1 !== 0;
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
  return formatter.format(amount);
}

/**
 * Normalize ANY date format to YYYY-MM-DD using IST timezone.
 * Handles: "DD/MM/YYYY", "YYYY-MM-DD", ISO strings with T/Z
 */
export function normalizeDateToYMD(dateStr: string): string {
  if (!dateStr) return ''

  // ISO string or timestamp (contains T or Z)
  if (dateStr.includes('T') || dateStr.includes('Z')) {
    return new Date(dateStr).toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
    }) // en-CA gives YYYY-MM-DD
  }

  // DD/MM/YYYY
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }

  // Already YYYY-MM-DD
  return dateStr
}

/**
 * Parse any date string to a JS Date object safely.
 * Replaces the old parseIndianDate which only handled DD/MM/YYYY.
 */
export function parseIndianDate(dateStr: string): Date {
  const ymd = normalizeDateToYMD(dateStr)
  if (!ymd) return new Date(NaN)
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toIndianDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getTodayIndianDate(): string {
  // Returns today's date in IST as YYYY-MM-DD (safe, unambiguous)
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  }) // en-CA always gives YYYY-MM-DD
}

export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Fixed: now handles DD/MM/YYYY, YYYY-MM-DD and ISO strings
 */
export function isDateInRange(dateStr: string, start: Date, end: Date): boolean {
  const date = parseIndianDate(dateStr)
  if (isNaN(date.getTime())) return false
  return date >= start && date <= end
}

export function getMonthName(date: Date): string {
  return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

export function getWeekDays(): string[] {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
}

/**
 * Get YYYY-MM-DD string for IST "today minus daysAgo"
 */
export function getISTDateOffset(daysAgo: number): string {
  const now = new Date()
  now.setDate(now.getDate() - daysAgo)
  return now.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  })
}

/**
 * Format a UTC timestamp to IST readable string
 * e.g. "03 Mar 2026, 11:47 PM"
 */
export function formatIST(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format a date string to IST date only (no time)
 * e.g. "03 Mar 2026"
 */
export function formatDateIST(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
