---
name: state
description: State management — UserContext, LanguageContext, where data is fetched, persistence map
last_updated: 2026-10-06
audience: [human, agent]
related: [architecture, auth, conventions]
---

# State Management

No Redux/Zustand — exactly two React contexts, mounted once in the root layout
(`app/layout.tsx:5-7`). Everything else is local component state plus
server-owned data re-fetched per page mount.

## UserContext (`context/UserContext.tsx`)

Shape (`:8-19`): `{ user: { userId, email, userName, avatarUrl } | null, loading,
refreshProfile }`, exposed via `useUser()` (`:26`).

| When | What happens |
|---|---|
| Mount (`:57-150`) | `supabase.auth.getUser()` → if none, `loading=false`, done. Else: `refreshProfile()`, `trackLogin` (`:92`), heartbeat upsert to `user_heartbeat` every 30 s (`:95-107`), ban poll every 20 s (`:155-181`) |
| `refreshProfile()` (`:31-51`) | re-reads `settings.name/avatar_url` + `user_metadata.full_name`; merges into state — call it after profile edits |
| Unmount/sign-out (`:138-149`) | clears the heartbeat interval; `AuthListener` handles redirect |

Derived consumers: avatar/name in `Layout` header, gating render until
`loading` resolves on protected pages.

## LanguageContext (`context/LanguageContext.tsx`)

- `Language = 'en' | 'hi' | 'bn'` (`:5`); translations inline (~48 keys × 3,
  `en: :8`, `hi: :56`, `bn: :104`).
- `useLanguage()` → `{ language, setLanguage, t }` (`:166-184`); `t(key)` falls
  back to the raw key (`:179`).
- Persist: `localStorage['finflow_language']`, read once at init with an SSR
  guard (`:170-171`), written on change (`:176`).

## What is fetched where

| Data | Owner of truth | Fetched by | Where |
|---|---|---|---|
| Transactions, budgets, settings | Supabase (RLS) | `lib/db.ts` inside page effects | each app page on mount (+ `refreshProfile` for name/avatar) |
| AI parse results, insights, usage, reports, notifications, admin data | finflow-api | `lib/api-client.ts` / `lib/analytics-api.ts` in page effects | the feature page (`/insights`, `/reports`, `/notifications`, admin) |
| Analytics (4 features) | API + `analytics_cache` | `lib/analytics-api.ts:44-62` | `/analytics` page |
| Session/user identity | Supabase Auth cookies | middleware + `UserContext` | everywhere automatic |
| Language/UI prefs | localStorage + settings row | `LanguageContext`, `app/settings/page.tsx` | global |
| Push subscription | browser PushManager + API | `lib/push.ts`, `AuthListener:23-27` | on login / when user enables |
| PostHog events | PostHog | `lib/posthog.ts`, providers | auto pageview + `identify` in `UserContext` |

There is **no request-level cache or SWR** — remounting a page re-fetches.

## Browser persistence map (localStorage)

| Key | Written by | Purpose |
|---|---|---|
| `finflow_language` | `LanguageContext:176` | UI language |
| `finflow_current_user_id` | `AuthListener:19-22` (login), cleared on sign-out | keying per-user storage |
| `finflow_{userId}_transactions` etc. (`lib/storage.ts:9-15`) | `lib/storage.ts` | **legacy local mirror** of transactions/budgets/settings/insights/rate-limit — see `docs/DEBT.md` before relying on it |
| `finflow_visitor` cookie | read-only at `app/layout.tsx:104-108` | generated but **never set** — dead code, `docs/DEBT.md` |

## Rules of thumb

1. Need app-wide identity? Read `useUser()`; never re-implement `getUser()`
   loops in components.
2. Need cross-page shared data? Today that's a fresh `lib/db.ts` fetch per page —
   consider it the convention; introducing caching is an architecture decision
   (`docs/DECISIONS.md`).
3. Keep contexts free of fetch logic for *domain* data — they hold identity and
   preferences only; page-level effects own domain fetching.
