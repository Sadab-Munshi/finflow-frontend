---
name: secrets-map
description: Env var inventory with exposure level, consumer, and rotation path (names only, never values)
last_updated: 2026-10-06
audience: [human, agent]
related: [config, deployment, agents]
---

# Secrets Map

Names only; values live in Vercel project env / local `.env.local`. **Public =
bundled into the browser** (not a secret at all — treat as public). Cross-repo
mirrors note where finflow-api holds the server-side counterpart of the same
credential.

| ENV_VAR | Exposure | Purpose | Consumer | Rotates via |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | project URL | all three `lib/supabase/*` clients | Supabase project change (rare) → Vercel env → redeploy |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | RLS-scoped client key | same | rotate in Supabase → update **all** apps (this + finflow-api) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | public | widget site key | `components/auth/TurnstileWidget.tsx` | Cloudflare → Turnstile → rotate site key |
| `NEXT_PUBLIC_API_URL` | public | backend base URL | `lib/api-client.ts:3`, `lib/analytics-api.ts` | config change; also update CSP `connect-src` (`next.config.ts:101`) |
| `NEXT_PUBLIC_POSTHOG_KEY` | public by design | PostHog project key | `lib/posthog.ts:4-6` | PostHog project — treat as semi-public anyway (browser analytics key) |
| `NEXT_PUBLIC_POSTHOG_HOST` | public | ingest host | `lib/posthog.ts:7` | config change; also CSP `script-src`/`connect-src` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | public | push subscribe key | `lib/push.ts` | regenerate VAPID pair on finflow-api side and update here (invalidates subscriptions) |

Removed 2026-10-06 (branch `fix/security-remove-admin`) — delete from Vercel
env: `NEXT_PUBLIC_INTERNAL_API_SECRET`, `NEXT_PUBLIC_BOT_SECRET` (shipped API
secrets into the browser bundle), `SUPABASE_SERVICE_ROLE_KEY` (no consumer
after `createServiceClient` was deleted). If any of these was ever committed to
a place outside Vercel env, treat it as exposed and rotate on the API side.

## Rules

1. Anything you consider secret **must not** get a `NEXT_PUBLIC_` prefix — Next
   inlines those at build time into client JS.
2. The two ⚠️ mirrors defeat the purpose of the backend's `x-internal-secret`
   and `x-bot-secret` checks — fixing them is the top security item in
   `docs/DEBT.md` (suggested: server route handlers proxying those calls).
3. Never echo values in logs, PostHog events, or error toasts
   (api-client's thrown `Error` may embed server error text — don't toast raw).
4. GitHub push protection should block accidental commits of values; `.gitignore`
   already excludes `.env*` (`.gitignore:14-18`).
