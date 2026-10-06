---
name: conventions
description: Naming, import aliases, use-client rules, data fetching, loading/error UX, i18n, forbidden list
last_updated: 2026-10-06
audience: [human, agent]
related: [agents, architecture, state, design-system]
---

# Conventions

## Naming

| Thing | Convention | Example |
|---|---|---|
| Page folders | kebab-case, match the URL | `app/privacy-security/`, `app/backup-restore/` |
| Route groups | `(name)` parentheses, no URL segment | `app/(auth)/`, `app/(landing)/` |
| Components | PascalCase `.tsx`, one default export per file | `components/auth/LoginForm.tsx`, `components/ui/InstallPrompt.tsx` |
| Client-side page content | `<Name>Content.tsx` sibling of server `page.tsx` | `app/(auth)/login/LoginContent.tsx` |
| Hooks | `useX.tsx` in feature folder | `app/add/hooks/useTransaction.tsx` |
| lib modules | kebab or camelCase single words | `lib/api-client.ts`, `lib/utils.ts`, `lib/notification-utils.ts` |
| Context | `<Name>Context.tsx` + `<Name>Provider` + `use<Name>()` | `context/LanguageContext.tsx:166` |
| Env vars | `NEXT_PUBLIC_*` only when the browser must see them | `.env.example` |

## Imports

- Alias `@/*` → repo root (`tsconfig.json` `paths`) — canonical: `import Layout from '@/components/layout/Layout'` (`app/dashboard/page.tsx:20`). Relative `./` only for same-folder siblings (e.g. tab components in `app/add/page.tsx`).
- shadcn/ui primitives come from `@/components/ui/*` per `components.json` aliases; class compositing always via `cn()` from `@/lib/utils`.
- Heavy libs are **dynamically imported**, never top-level: `import('jspdf')` inside the handler (`app/history/page.tsx:148`), `next/dynamic` for PostHog/InstallPrompt/UpdateNotification (`app/layout.tsx:13-15`), three.js isolated in `app/add/components/ParticleSphere.tsx` and chunked via the `threeVendor` webpack group (`next.config.ts:45-55`).

## Server vs client components

- Default = RSC. Add `'use client'` **only** at the level that needs it, at line 1 (`context/UserContext.tsx:1`, `app/dashboard/page.tsx:1`).
- Established app-page pattern: client page fetching in `useEffect` + skeleton — accept it; don't refactor pages to RSC one-by-one without a dedicated PR.
- Public/SEO pages keep metadata on a server `page.tsx` that renders a client `*Content.tsx` (`app/(landing)/support/page.tsx`). Never export `metadata` from a client file — Next ignores it.
- Route handlers live only in `app/*/**/route.ts` (today: just `app/auth/callback/route.ts`).

## Data fetching — two lanes, don't cross them

1. **Supabase direct (browser)** for own-user CRUD tables — `lib/db.ts` functions
   (`getTransactions:8`, `addTransaction:17`, budget/settings fns) using
   `lib/supabase/client.ts`. RLS enforces scoping.
2. **finflow-api (`api-client`)** for anything privileged or external: AI
   (`lib/api-client.ts:93-142`), notifications, feedback, reports, push, admin,
   ban/track, bot notifies. Token injected from the active session
   (`lib/api-client.ts:14-27`) — never hand-roll `fetch` with the JWT.
- `lib/analytics-api.ts` is a thin typed wrapper over api-client's transport for
  the analytics feature (`lib/analytics-api.ts:44-62`).
- `lib/storage.ts` (localStorage mirror) is legacy — do not add new storage
  without reading `docs/DEBT.md` first.

## Loading & error UX

- Route-level fallback: colocated `loading.tsx` → domain skeleton from
  `components/skeletons/*` (mapping table in `docs/ROUTES.md`). New app pages
  get both a `loading.tsx` and a matching skeleton.
- Client data loads show the same skeleton in-component (established pattern in
  app pages) — never a bare spinner for full-page content.
- Errors: `react-hot-toast` (`Toaster` mounted in `app/layout.tsx:4`);
  api-client throws `Error(error.error || 'API error: N')`
  (`lib/api-client.ts:38-43`) — catch at the call site and toast the message.
- Form validation surfaces inline (react-hook-form + zod resolvers).

## i18n via LanguageContext

- All user-visible strings are keys in the triple `en`/`hi`/`bn` map in
  `context/LanguageContext.tsx:8-160`; consume with `const { t } = useLanguage()`.
- Fallback is the key itself (`:179`) — a missing translation silently renders
  the raw key, so add all three languages in the same edit (`skills/add-translation.md`).
- Language persists in `localStorage['finflow_language']` (`:171-176`) and is
  also offered in settings. Money stays in INR formatting from `lib/utils.ts`
  regardless of language.

## Forbidden (with reasons)

1. **No new `NEXT_PUBLIC_` secrets.** `NEXT_PUBLIC_*` ships the value into the
   browser bundle — two such secrets already exist as High debt (`docs/DEBT.md`).
   Private server secrets must never appear in client-reachable code.
2. **No cross-importing Supabase clients.** `server.ts` uses `next/headers`
   (breaks the client build); `client.ts` in a server module breaks SSR cookie
   sync (full matrix: `docs/AUTH.md`).
3. **No ad-hoc `fetch` to finflow-api or Supabase endpoints.** Single choke points
   exist for auth, headers, error shape: `lib/api-client.ts`, `lib/db.ts`.
4. **No hardcoded strings in JSX** — bypasses hi/bn and renders raw English (or
   worse, the key) for non-English users.
5. **No server-local or `new Date().toISOString()` business dates** — the app is
   IST-first; `toISOString()` shifts the calendar day for Indian users. Use
   `lib/utils.ts:23,57,120`.
6. **No new global state stores** (Redux/Zustand/Jotai). Two contexts are the
   deliberate ceiling (`docs/DECISIONS.md`).
7. **No inline `<style>`/styled-jsx/styled-components** — Tailwind v4 tokens in
   `app/globals.css` are the single styling source (`docs/DESIGN_SYSTEM.md`).
8. **No editing `public/sw.js` without a `CACHE_NAME` bump** — users' old caches
   only clear via the activate handler (`public/sw.js:24-36`); a stale
   `finflow-v1` is forever.
9. **No `any` escapes for shared types** — extend `lib/types.ts` /
   `lib/analytics-types.ts`. `tsconfig` `strict: true`, but builds ignore errors
   (`next.config.ts:7-9`), so discipline is social, not enforced.
10. **No renaming/moving the admin path** `app/admin-dy26zyfv` without updating
    guards, docs, and external references together (`docs/ROUTES.md`).
