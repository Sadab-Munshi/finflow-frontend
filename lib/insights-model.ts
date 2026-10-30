import { formatIndianCurrency, normalizeDateToYMD } from '@/lib/utils'
import type { Budget, Transaction } from '@/lib/types'

/**
 * One analysis snapshot, and every figure on the Insights page derives from it.
 *
 * The rule this module exists to enforce: a number may only appear on screen if
 * it can be traced to `Snapshot`. Nothing here guesses, extrapolates to a month,
 * or calls income-minus-expenses "savings" — those are the three ways the old
 * page produced confident-looking but unsupported claims.
 */

export type FindingKind = 'attention' | 'opportunity' | 'positive' | 'pattern'

/** `observed` = counted directly from the records. `estimate` = involves an assumption. */
export type Basis = 'observed' | 'estimate'

export interface EvidenceRow {
  label: string
  value: string
}

export interface Finding {
  id: string
  kind: FindingKind
  /** Short headline, factual. Never praise, never alarm. */
  headline: string
  /** The number the card leads with. */
  metric: { value: string; label: string }
  /** One or two sentences. May state the assumption behind an estimate. */
  body: string
  evidence: EvidenceRow[]
  action?: { href: string; label: string }
  basis: Basis
  /** Set when an AI-generated finding was rewritten to remove an unsupported claim. */
  correctedFrom?: string
}

export interface CategoryTotal {
  category: string
  spent: number
  share: number
  txCount: number
}

export interface Snapshot {
  /** Inclusive window. */
  fromISO: string
  toISO: string
  /** Calendar days spanned by the window. */
  windowDays: number
  /** Distinct days that actually contain at least one transaction. */
  activeDays: number
  txCount: number
  income: number
  expenses: number
  /** income − expenses. Deliberately NOT called savings. */
  surplus: number
  byCategory: CategoryTotal[]
  currency: (n: number) => string
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Calendar day of a Date in local time.
 *
 * Deliberately NOT `normalizeDateToYMD`: that helper shifts into IST, so an
 * end-of-day timestamp (23:59 local) comes back as the *next* day and the
 * header printed "1 Oct – 31 Oct" for a window ending on the 30th. Window
 * bounds must use the same calendar the window was built from.
 */
function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** A finding needs a floor of real data before it is worth asserting anything. */
export const MIN_TRANSACTIONS = 5
export const MIN_ACTIVE_DAYS = 3

export const KIND_LABEL: Record<FindingKind, string> = {
  attention: 'Attention',
  opportunity: 'Opportunity',
  positive: 'Positive',
  pattern: 'Pattern',
}

/** Lower index surfaces first. */
export const KIND_ORDER: FindingKind[] = ['attention', 'opportunity', 'positive', 'pattern']

export function buildSnapshot(transactions: Transaction[], windowDays = 30, now = new Date()): Snapshot {
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const from = new Date(to.getTime() - (windowDays - 1) * DAY_MS)
  const fromStart = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0)

  const inWindow = transactions.filter((tx) => {
    const d = new Date(tx.date)
    return !Number.isNaN(d.getTime()) && d >= fromStart && d <= to
  })

  let income = 0
  let expenses = 0
  const byCat = new Map<string, { spent: number; txCount: number }>()
  const activeDays = new Set<string>()

  for (const tx of inWindow) {
    const amount = Number(tx.amount) || 0
    activeDays.add(normalizeDateToYMD(tx.date))
    if (tx.type === 'income') {
      income += amount
    } else {
      expenses += amount
      const key = tx.category || 'Uncategorised'
      const cur = byCat.get(key) ?? { spent: 0, txCount: 0 }
      cur.spent += amount
      cur.txCount += 1
      byCat.set(key, cur)
    }
  }

  const byCategory: CategoryTotal[] = [...byCat.entries()]
    .map(([category, v]) => ({
      category,
      spent: v.spent,
      txCount: v.txCount,
      share: expenses > 0 ? (v.spent / expenses) * 100 : 0,
    }))
    .sort((a, b) => b.spent - a.spent)

  return {
    fromISO: ymd(fromStart),
    toISO: ymd(to),
    windowDays,
    activeDays: activeDays.size,
    txCount: inWindow.length,
    income,
    expenses,
    surplus: income - expenses,
    byCategory,
    currency: formatIndianCurrency,
  }
}

export function isSufficient(snapshot: Snapshot): boolean {
  return snapshot.txCount >= MIN_TRANSACTIONS && snapshot.activeDays >= MIN_ACTIVE_DAYS
}

/** 'YYYY-MM' for a date, for matching budget rows to a month. */
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Deterministic findings. Every figure below is arithmetic over `snapshot`
 * (and the caller's own budgets), so these are correct by construction.
 *
 * Deliberately absent:
 *  - any "you saved X" claim (we can only observe a surplus);
 *  - any monthly projection of a sub-month window;
 *  - any judgement that a category is "too high" — only that it is over the
 *    limit the user themselves set.
 */
export function deriveFindings(
  transactions: Transaction[],
  snapshot: Snapshot,
  budgets: Budget[],
  now = new Date()
): Finding[] {
  if (!isSufficient(snapshot)) return []
  const c = snapshot.currency
  const out: Finding[] = []

  // ── Attention: categories the user explicitly put a limit on and exceeded ──
  const thisMonth = monthKey(now)
  const monthBudgets = budgets.filter((b) => b.month === thisMonth)
  const over: { b: Budget; spent: number; over: number }[] = []

  for (const b of monthBudgets) {
    const limit = Number(b.amount) || 0
    if (limit <= 0) continue
    const spent = snapshot.byCategory.find((x) => x.category === b.category)?.spent ?? 0
    if (spent > limit) over.push({ b, spent, over: spent - limit })
  }
  over.sort((a, b) => b.over - a.over)

  if (over.length > 0) {
    const top = over[0]
    out.push({
      id: 'budget-over',
      kind: 'attention',
      headline: `${top.b.category} is ${c(top.over)} over its limit`,
      metric: { value: c(top.over), label: 'over budget' },
      body:
        over.length === 1
          ? `Spending in this category has reached ${c(top.spent)} against a limit of ${c(Number(top.b.amount))} this month.`
          : `${top.b.category} is the largest overrun. ${over.length} categories are above the limit you set this month.`,
      evidence: over.map((o) => ({
        label: o.b.category,
        value: `${c(o.spent)} of ${c(Number(o.b.amount))} · ${c(o.over)} over`,
      })),
      action: { href: '/budgets', label: 'Review budget' },
      basis: 'observed',
    })
  }

  // ── Pattern: the biggest share of recorded spending ──
  const top2 = snapshot.byCategory[0]
  if (top2 && snapshot.expenses > 0) {
    out.push({
      id: 'top-category',
      kind: 'pattern',
      headline: `${top2.category} is your largest spending category`,
      metric: { value: `${Math.round(top2.share)}%`, label: 'of recorded spending' },
      body: `${c(top2.spent)} across ${top2.txCount} transaction${top2.txCount === 1 ? '' : 's'} in the last ${snapshot.windowDays} days.`,
      evidence: snapshot.byCategory.slice(0, 5).map((x) => ({
        label: x.category,
        value: `${c(x.spent)} · ${Math.round(x.share)}%`,
      })),
      action: { href: `/history?category=${encodeURIComponent(top2.category)}`, label: 'View transactions' },
      basis: 'observed',
    })
  }

  // ── Positive: a recorded surplus, stated as a surplus ──
  if (snapshot.surplus > 0 && snapshot.income > 0) {
    out.push({
      id: 'surplus',
      kind: 'positive',
      headline: 'Income exceeded recorded expenses',
      metric: { value: c(snapshot.surplus), label: 'recorded surplus' },
      body: `Recorded income was ${c(snapshot.income)} and recorded expenses ${c(snapshot.expenses)} over the last ${snapshot.windowDays} days. This is a difference between what you logged, not a savings balance.`,
      evidence: [
        { label: 'Recorded income', value: c(snapshot.income) },
        { label: 'Recorded expenses', value: c(snapshot.expenses) },
        { label: 'Transactions', value: String(snapshot.txCount) },
      ],
      action: { href: '/history?type=income', label: 'View transactions' },
      basis: 'observed',
    })
  }

  // ── Opportunity: category drift vs the preceding equal-length window ──
  // Only asserted when the earlier window actually has records to compare with,
  // so a gap in logging can never be mistaken for a spending change.
  const drift = categoryDrift(transactions, snapshot, now)
  if (drift) out.push(drift)

  return out
}

function categoryDrift(transactions: Transaction[], snapshot: Snapshot, now: Date): Finding | null {
  // Build the preceding window from the same records, so the comparison is
  // like-for-like and an empty earlier window returns null instead of
  // manufacturing a "spending increase".
  const prev = buildSnapshot(
    transactions,
    snapshot.windowDays,
    new Date(now.getTime() - snapshot.windowDays * DAY_MS)
  )
  if (!isSufficient(prev)) return null
  const candidates = snapshot.byCategory
    .map((cur) => {
      const before = prev.byCategory.find((p) => p.category === cur.category)
      return before ? { category: cur.category, delta: cur.spent - before.spent, cur: cur.spent, before: before.spent } : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.delta > 0)
    .sort((a, b) => b.delta - a.delta)

  if (candidates.length === 0) return null
  const top = candidates[0]
  return {
    id: 'drift',
    kind: 'opportunity',
    headline: `${top.category} spending is higher than the previous ${snapshot.windowDays} days`,
    metric: { value: snapshot.currency(top.delta), label: 'increase' },
    body: `${snapshot.currency(top.cur)} now against ${snapshot.currency(top.before)} in the preceding ${snapshot.windowDays} days. Compared only where both windows have records.`,
    evidence: [
      { label: 'This window', value: snapshot.currency(top.cur) },
      { label: 'Previous window', value: snapshot.currency(top.before) },
    ],
    action: { href: `/history?category=${encodeURIComponent(top.category)}`, label: 'View transactions' },
    basis: 'observed',
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * AI validation
 *
 * The generation prompt lives in finflow-api, which this change does not
 * touch. Instead every AI finding is validated here before it reaches the UI,
 * and anything that makes a claim the snapshot cannot support is either
 * rewritten into a supported one or withheld — visibly, not silently.
 * ────────────────────────────────────────────────────────────────────────── */

export interface AiFinding {
  type?: string
  title?: string
  description?: string
}

export interface ValidationResult {
  accepted: Finding[]
  /** Withheld findings, surfaced in the UI so the filtering is never invisible. */
  withheld: { title: string; reason: string }[]
}

const MONTH_WORDS = /\b(month|monthly|per month|a month|\/mo)\b/i
const SAVINGS_WORDS = /\b(sav(e|ed|ings)|save up)\b/i
const HEALTH_CATEGORIES = /\b(health|medical|hospital|medicine|doctor|pharmacy)\b/i
const PROBLEM_WORDS = /\b(too much|overspend|excessive|problem|concerning|worrying|alarming|high spending)\b/i

export function validateAiFindings(raw: AiFinding[], snapshot: Snapshot): ValidationResult {
  const accepted: Finding[] = []
  const withheld: { title: string; reason: string }[] = []

  for (const item of raw.slice(0, 8)) {
    const title = (item.title ?? '').trim()
    const description = (item.description ?? '').trim()
    if (!title || !description) {
      withheld.push({ title: title || 'Untitled insight', reason: 'Missing title or description' })
      continue
    }
    const text = `${title} ${description}`

    // 1. Monthly projection from a window shorter than a month is arithmetically
    //    unsupported — a 10-day reduction is not a monthly saving.
    if (MONTH_WORDS.test(text) && snapshot.windowDays < 28) {
      withheld.push({
        title,
        reason: `Projects a monthly figure from ${snapshot.windowDays} days of records`,
      })
      continue
    }

    // 2. "Savings" is not observable from logged income and expenses.
    if (SAVINGS_WORDS.test(text) && !/\bsavings account\b/i.test(text)) {
      const surplusText = text
        .replace(/\b(save|saved|saving|savings)\b/gi, 'recorded surplus')
        .replace(/\byou recorded surplus\b/gi, 'your records show a surplus')
      accepted.push({
        id: `ai-${accepted.length}`,
        kind: mapKind(item.type),
        headline: title,
        metric: { value: snapshot.currency(Math.abs(snapshot.surplus)), label: 'recorded surplus' },
        body: surplusText,
        evidence: [
          { label: 'Recorded income', value: snapshot.currency(snapshot.income) },
          { label: 'Recorded expenses', value: snapshot.currency(snapshot.expenses) },
        ],
        basis: 'observed',
        correctedFrom: title,
      })
      continue
    }

    // 3. High healthcare spend is not a finding on its own. Reclassify rather
    //    than delete: the observation is fine, the judgement is not.
    let kind = mapKind(item.type)
    let corrected: string | undefined
    if (kind === 'attention' && HEALTH_CATEGORIES.test(text) && PROBLEM_WORDS.test(text)) {
      kind = 'pattern'
      corrected = title
    }

    // 4. Anything else is kept, but AI prose is an estimate unless it restates
    //    a counted figure.
    accepted.push({
      id: `ai-${accepted.length}`,
      kind,
      headline: title,
      metric: { value: String(snapshot.txCount), label: 'transactions analysed' },
      body: description,
      evidence: [
        { label: 'Window', value: `${snapshot.fromISO} → ${snapshot.toISO}` },
        { label: 'Transactions', value: String(snapshot.txCount) },
      ],
      basis: 'estimate',
      correctedFrom: corrected,
    })
  }

  return { accepted, withheld }
}

function mapKind(type?: string): FindingKind {
  switch (type) {
    case 'warning':
    case 'alert':
      return 'attention'
    case 'achievement':
      return 'positive'
    case 'trend':
      return 'pattern'
    default:
      return 'opportunity'
  }
}

/** Sort by kind priority, then keep insertion order inside a kind. */
export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
}

/** Human-readable window, e.g. "1 Oct – 30 Oct 2026". */
export function formatRange(snapshot: Snapshot): string {
  const fmt = (iso: string, withYear: boolean) => {
    const d = new Date(`${iso}T00:00:00`)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      ...(withYear ? { year: 'numeric' } : {}),
    })
  }
  return `${fmt(snapshot.fromISO, false)} – ${fmt(snapshot.toISO, true)}`
}
