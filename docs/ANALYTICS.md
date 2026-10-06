---
name: analytics
description: Two meanings of analytics — PostHog product telemetry AND the in-app analytics feature suite
last_updated: 2026-10-06
audience: [human, agent]
related: [config, architecture, routes]
---

# Analytics (two systems)

## A. Product analytics — PostHog

- Init: `lib/posthog.ts:3-15` (`initPostHog`), loaded via `next/dynamic` from
  the root layout (`components/PostHogProvider.tsx`, mounted
  `app/layout.tsx:13`).
- Config: `capture_pageview: true`, `person_profiles: 'identified_only'`
  (`lib/posthog.ts:7-8`) — anonymous traffic is not profiled.
- Identity: `posthog.identify(userId)` happens inside `UserContext` after login
  (`context/UserContext.tsx` — posthog imported at `:5`).
- Env: `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` — note the
  **hardcoded fallback key** at `lib/posthog.ts:5` (tracked in `docs/DEBT.md`);
  always set env in each deployment.
- CSP allowlist for the named host + asset CDN lives in
  `next.config.ts` CSP `script-src`/`connect-src`.
- Guidance: capture events for meaningful product actions only; never send
  amounts, notes, or transaction details (financial data stays out of
  telemetry). <!-- ASSUMPTION: implicit in identified_only + no financial events found in code -->

## B. In-app analytics feature (`/analytics` page)

User-facing money analytics computed by finflow-api + cached server-side:

| Tab/feature | API endpoint | Client fetch | Response type |
|---|---|---|---|
| Rolling averages + seasonality | `GET /api/analytics/rolling-averages` | `lib/analytics-api.ts:44` | `RollingAveragesResponse` (`lib/analytics-types.ts`) |
| Cash-flow forecast | `GET /api/analytics/cash-flow-forecast` | `lib/analytics-api.ts:49` | `CashFlowForecastResponse` |
| Anomaly detection (z ≥ 2.0) | `GET /api/analytics/anomaly-detection` | `lib/analytics-api.ts:54` | `AnomalyDetectionResponse` |
| YoY comparison | `GET /api/analytics/yoy-comparison` | `lib/analytics-api.ts:59` | `YoYComparisonResponse` |

- All four accept `forceRefresh` → `?refresh=true` (bypasses the 24 h server
  cache); the page's refresh button passes it (`lib/analytics-api.ts:44-62`).
- Rendering: `components/analytics/{RollingAveragesChart, SeasonalityChart,
  AnomalyList, YoYComparison}.tsx` on Recharts (vendor-chunked,
  `next.config.ts:58-66`); skeleton `AnalyticsSkeleton` + `app/analytics/loading.tsx`.
- API response envelope: `{ data, cached, computed_at }` — `cached` drives the
  "last generated" UI cues.
- Server-side computation details (SQL tables, 24 h TTL, cron pre-warm) are in
  the API repo's docs (`finflow-api/docs/AI.md`, `finflow-api/docs/JOBS.md`).
- Note: `/analytics` is **not** in the middleware protected list — client-only
  guard (`docs/DEBT.md`, `docs/ROUTES.md`).

## Related but different

`trackLogin` (login geo/device records), `user_heartbeat` (online presence),
and ban checks are *telemetry for the admin panel*, not product analytics —
documented in `docs/AUTH.md` and `docs/STATE.md`.
