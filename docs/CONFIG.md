---
name: config
description: Every environment variable — public flag, purpose, default, consuming file
last_updated: 2026-10-06
audience: [human, agent]
related: [secrets-map, deployment, auth]
---

# Configuration Reference

Unlike the API repo there is **no runtime validation** — a missing var surfaces
as a runtime failure where it's read. `NEXT_PUBLIC_*` values are inlined into
the client bundle at build time (rebuild required after change); others are
server/build-time only. Names mirror `.env.example` (created 2026-10-06 — the
repo previously had none).

## Supabase

| Name | Public? | Purpose | Default | Consumer file |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL | none (crashes on `!` assert) | `lib/supabase/client.ts:5`, `lib/supabase/server.ts:8`, `lib/supabase/middleware.ts:8` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Anon key for browser/SSR clients (RLS-guarded) | none | same files as above |

`SUPABASE_SERVICE_ROLE_KEY` was removed from this repo 2026-10-06 together with
its only consumer (`createServiceClient`) — safe to delete from Vercel env.

## ReCAPTCHA-alternative (Cloudflare Turnstile)

| Name | Public? | Purpose | Default | Consumer file |
|---|---|---|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | yes | Site key for the widget | `''` | `components/auth/TurnstileWidget.tsx` |

(`TURNSTILE_SECRET_KEY` is **not** read by this repo — verification runs on
finflow-api via `authVerifyTurnstile`, `lib/api-client.ts:119`. Providing it
here is dead config; kept in old README only.)

## Backend API

| Name | Public? | Purpose | Default | Consumer file |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | finflow-api base URL | `http://localhost:3001` | `lib/api-client.ts:3`, `lib/analytics-api.ts` (same constant) |

`NEXT_PUBLIC_INTERNAL_API_SECRET` and `NEXT_PUBLIC_BOT_SECRET` were removed
2026-10-06 — a browser bundle must never hold API secrets. Ban-check and
budget-alert calls now send the user's Bearer JWT (BLOCKED on finflow-api
accepting JWT auth, `docs/DEBT.md`). Delete both vars from Vercel env.

## Product analytics (PostHog)

| Name | Public? | Purpose | Default | Consumer file |
|---|---|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | yes | PostHog project key | **hardcoded fallback in source** (`lib/posthog.ts:5`) — set env to override | `lib/posthog.ts:5` |
| `NEXT_PUBLIC_POSTHOG_HOST` | yes | PostHog ingest host | `https://us.i.posthog.com` | `lib/posthog.ts:6` |

## Push

| Name | Public? | Purpose | Default | Consumer file |
|---|---|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | yes | `applicationServerKey` fallback | none (primary source is `GET /api/push/vapid-public-key`, `lib/api-client.ts:366`) | `lib/push.ts` |

(`VAPID_PRIVATE_KEY` is not read by this repo — sending lives in finflow-api.)

## Deployment-affecting non-env config

| Setting | Where | Effect |
|---|---|---|
| `eslint.ignoreDuringBuilds`, `typescript.ignoreBuildErrors` | `next.config.ts:4-9` | builds never fail on lint/TS — local gates only |
| `experimental.optimizePackageImports` | `next.config.ts:10-22` | tree-shaking for lucide/recharts/framer/radix/posthog |
| `images.remotePatterns` supabase storage + 1-week cache | `next.config.ts:24-37` | avatars via `next/image` |
| webpack vendor chunks `threeVendor/recharts/framer` | `next.config.ts:38-84` | keeps heavy libs out of the main bundle |
| security headers + CSP allowlist | `next.config.ts:86-180` | **new external origins must be added to CSP** `connect-src`/`script-src` or calls are blocked |
| Vercel region `bom1` | `vercel.json:2` | Mumbai region for Indian users |
