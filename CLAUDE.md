# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**FinFlow** is a Next.js 15 (App Router) personal finance tracker with Supabase backend, PostHog analytics, and PWA support. It is deployed on Vercel.

## Quick Commands

```bash
# Install dependencies
npm install

# Run dev server (port 3000)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint
npm run lint
```

There are **no project-level tests** (no jest/vitest/playwright configs). Testing is manual via the dev server.

## Architecture

**Framework:** Next.js 15 App Router with server components by default and client components (`'use client'`) where interactivity is needed.

**Data flow:**
```
Browser → middleware.ts (auth check + ban check) → Page (server component)
                                                      → Client Component (interactive)
                                                      → Supabase (DB + auth)
                                                      → External API (AI, push, Telegram, WhatsApp)
```

**State management:** React Context only — `UserProvider` and `LanguageProvider` wrap the entire app via `app/layout.tsx`.

**Styling:** Tailwind CSS v4 with custom `cn()` utility (`clsx` + `tailwind-merge`). UI primitives are in `components/ui/` (Radix-based).

## Key Directories & Files

| Path | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout — registers providers, service worker, metadata, PostHog, Toaster |
| `app/(auth)/` | Login, signup, forgot/reset password pages |
| `app/(landing)/` | Public landing pages (home, terms, privacy, support, guide) |
| `app/add/` | Add transaction page with 4 tabs: Manual, NLP (text), Voice, Scan (receipt) |
| `app/dashboard/` | Main dashboard — balance, stats, weekly chart, pie breakdown, recent txs |
| `app/budgets/` | Budget creation and tracking |
| `app/history/` | Full transaction history with search/filter/sort |
| `app/insights/` | AI-powered spending analytics |
| `app/reports/` | Financial report generation |
| `app/profile/` | User profile management |
| `app/settings/` | App settings (language, currency, alerts) |
| `app/backup-restore/` | Export/import financial data |
| `app/notifications/` | In-app notification center |
| `app/privacy-security/` | Privacy and security settings |
| `app/admin-dy26zyfv/` | Admin panel (obfuscated route, admin-only) |
| `app/transaction/[id]/` | Individual transaction detail |
| `components/` | Reusable UI — `auth/`, `landing/`, `layout/`, `notifications/`, `skeletons/`, `ui/` |
| `context/` | `UserContext.tsx` (user state), `LanguageContext.tsx` (i18n: en/hi/bn) |
| `lib/` | Core utilities — see below |
| `types/` | `auth.ts` — form data interfaces |
| `middleware.ts` | Next.js middleware — route protection, session refresh, ban check |
| `public/sw.js` | Service worker — caching strategies, push notification handling |

## Core Library Files (`lib/`)

| File | Purpose |
|------|---------|
| `lib/supabase/client.ts` | Browser-side Supabase client factory |
| `lib/supabase/server.ts` | Server-side Supabase client (with cookie sync for SSR) |
| `lib/supabase/middleware.ts` | `updateSession()` — checks auth, redirects unauthenticated users, checks ban status |
| `lib/api-client.ts` | All external API calls (AI parse, speech-to-text, notifications, admin, push, health) |
| `lib/db.ts` | Supabase CRUD for transactions, budgets, settings |
| `lib/categories.ts` | 16 predefined categories (expense/income/both) with colors, lookup helpers |
| `lib/types.ts` | Core TypeScript interfaces: `Transaction`, `Budget`, `User`, `Category`, `Settings`, `Notification`, `PushSubscription`, etc. |
| `lib/utils.ts` | `cn()`, Indian currency formatting, date normalization (DD/MM/YYYY, ISO, YYYY-MM-DD), date range helpers, week utilities |
| `lib/storage.ts` | localStorage CRUD for transactions, budgets, settings, user data, rate limiting, import/export |
| `lib/posthog.ts` | PostHog analytics initialization and `posthog` instance export |
| `lib/push.ts` | Push notification subscription/unsubscription via VAPID |
| `lib/notification-utils.ts` | Notification icon mapping, `timeAgo()` helper |

## Auth Flow

1. **Middleware** (`middleware.ts`) intercepts all requests to protected routes (`/dashboard`, `/history`, `/add`, `/budgets`, `/insights`, `/reports`, `/settings`, `/transaction`, `/profile`, `/notifications`). Redirects to `/login` if unauthenticated. Also checks ban status via `user_management` table.
2. **AuthListener** (`components/auth/AuthListener.tsx`) — client component that subscribes to Supabase auth state changes. On `SIGNED_IN`, stores user ID in localStorage, re-subscribes to push notifications. On `SIGNED_OUT`, redirects to `/login`.
3. **UserProvider** (`context/UserContext.tsx`) — initializes user from Supabase, performs ban check, tracks login via `api-client`, starts 30s heartbeat to `user_heartbeat` table, polls ban status every 20s.

## AI-Powered Transaction Entry (`app/add/`)

Four tabs sharing a preview card:
- **ManualTab** — form-based entry (amount, category, date, notes)
- **NLPTab** — natural language parsing (e.g., "Spent $12 on coffee today")
- **VoiceTab** — speech-to-text transcription then parsing
- **ScanTab** — receipt image OCR parsing

## Environment Variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
NEXT_PUBLIC_POSTHOG_KEY=... (optional)
NEXT_PUBLIC_POSTHOG_HOST=... (optional)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=... (optional, push notifications)
VAPID_PRIVATE_KEY=... (optional)
NEXT_PUBLIC_API_URL=... (optional, defaults to http://localhost:3001)
```

## Important Patterns

- **Server components** fetch data directly (e.g., `dashboard/page.tsx` uses `getTransactions()` from `lib/db.ts`).
- **Client components** use `'use client'` and interactivity hooks (`useState`, `useEffect`, `useRouter`).
- **Route protection** is dual-layer: middleware (server) + UserProvider ban polling (client).
- **Date handling** consistently uses IST (`Asia/Kolkata`) — `normalizeDateToYMD()`, `getISTDateOffset()`, `toIndianDate()`.
- **No test files exist** in the project source — only in `node_modules/`.