---
name: deployment
description: Vercel deployment — vercel.json, env groups, verification files, service worker versioning, rollback
last_updated: 2026-10-06
audience: [human, agent]
related: [config, pwa, secrets-map, agents]
---

# Deployment

Target: **Vercel** (`vercel.json`), region `bom1` (Mumbai — primary user base is
India). Build = `next build`; note builds ignore lint + type errors
(`next.config.ts:4-9`), so merge gates must run them in CI, not at build.

⚠️ **`vercel.json:6-14` declares two Vercel Cron entries hitting
`/api/cron/monthly-report` (0 0 1 * *) and `/api/cron/process-report-queue`
(0 2 1 * *) — but no `app/api/` routes exist in this repo; the endpoints live in
the separate finflow-api service. These crons will 404** — see `docs/DEBT.md`.
Either delete them here and schedule against finflow-api directly, or re-add
server route handlers that proxy with `CRON_SECRET`. <!-- TODO: verify what the Vercel dashboard actually runs today -->

## Environment groups (names; details `docs/CONFIG.md`)

| Group | Vars | Where set |
|---|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Vercel → Environment Variables (Production + Preview) |
| Turnstile | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | same |
| Backend | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_INTERNAL_API_SECRET`⚠️, `NEXT_PUBLIC_BOT_SECRET`⚠️ | same (⚠️ scheduled for removal — `docs/DEBT.md`) |
| Analytics | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | same (optional) |
| Push | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | same (optional) |

Env **changes after deploy have no effect until the next build** for
`NEXT_PUBLIC_*` vars (inlined at build time).

## Verification & SEO files in `public/`

| File | Purpose |
|---|---|
| `public/robots.txt` | allows all, points sitemap |
| `public/BingSiteAuth.xml` | Bing Webmaster verification — **do not delete** or verification breaks |
| `public/site.webmanifest` | PWA manifest (`docs/PWA.md`) |
| `public/favicon*.png/ico`, `android-chrome-*`, `icons/*` | icon set referenced by metadata + manifest |
| `public/og-image.png` | OG/Twitter card (excluded from middleware matcher, `middleware.ts:10`) |
| `public/screen-*.png` | manifest screenshots |

## Service worker caching & versioning

`public/sw.js` is served with `must-revalidate` and `Service-Worker-Allowed: /`
(`next.config.ts:166-173`). Cache invalidation is **manual**:

1. Every SW change: bump `CACHE_NAME` (`public/sw.js:1`, currently
   `'finflow-v1'`) — old caches are deleted on activate (`:24-36`).
2. New precached asset: add to `PRECACHE_ASSETS` (`:3-13`) **and** bump the name.
3. Strategies: `/api/*` + HTML network-first (`:50-52,74`), static assets +
   `/_next/static` cache-first (`:56-58,68-70`), Supabase storage
   stale-while-revalidate (`:62-64`).
4. Long-cache warning: `/icons`, `/images`, `/assets` ship
   `max-age=2592000, immutable` headers (`next.config.ts:123-164`) — changed
   files need new filenames.
5. In-app update prompt: `components/UpdateNotification.tsx` detects a waiting
   worker and posts `SKIP_WAITING` (`public/sw.js:134-138`) — test this path in
   staging after each SW edit. Full guide: `docs/PWA.md`.

## Deploy steps

```bash
npm run lint && npx tsc --noEmit    # honest gates (build ignores both!)
npm run build && npm start          # local prod smoke test
git push                            # Vercel auto-deploys master → production
```

After deploy: load `/login` (Turnstile widget renders), sign in, check
`/dashboard` data + `/sw.js` headers (`curl -I`), confirm PostHog pageview.

## Rollback

1. **Vercel instant rollback**: Deployments → previous production deployment →
   ⋯ → "Instant Rollback" (restores prior build + env snapshot).
2. **Git revert** + push if the bad commit is already buried.
3. **Do not forget the service worker**: if the bad deploy shipped a SW change
   with a bumped `CACHE_NAME`, users on it hold broken caches — rollback must
   ship **another bump** (`finflow-v<n+1>`), not the old name, so clients
   re-activate (`public/sw.js:24-36`).
4. DB/RLS changes are manual (no migration runner) — keep forward-fix SQL ready;
   schema history: `supabase/migrations/`, policy summary `docs/SCHEMA.md`.
5. finflow-api is a separate rollback unit (its own `docs/DEPLOYMENT.md` in the
   API repo) — coordinate when a frontend deploy depends on a new API endpoint.
