---
name: platform-controls
description: How the app consumes Vertex's platform controls — maintenance gate, banners, signup gating, feature flags, and the PostHog product-event instrumentation feeding admin analytics
last_updated: 2026-10-08
audience: [human, agent]
related: [analytics, auth, config, routes]
---

# Platform Controls (app side)

Everything below is runtime-configured from the Vertex admin panel
(finflow-admin / `finflow-api`); nothing here is build-time.

## Maintenance / read-only / announcement — `components/PlatformGate.tsx`

Mounted once in `app/layout.tsx` inside the provider tree. On mount it calls
`GET /api/auth/app-status` (public, never 5xx) and renders:

| Field | Effect |
|---|---|
| `maintenance: true` | full-screen dark lockout card w/ "Try again" reload — **all users, all routes** |
| `read_only: true` | amber strip pinned top (courtesy signal; edits are best-effort, not hard-blocked) |
| `announcement: string` | dismissible teal strip; dismissal remembered per session **and per message text** (`sessionStorage ff-announce-dismiss:<text>`) |

**Fail-open contract:** any fetch/parse failure renders nothing extra — the
app never locks itself out on a network blip; only an affirmative
`maintenance: true` blocks. Keep this property when editing PlatformGate.

## Signup gating — `components/auth/SignupForm.tsx`

`GET /api/auth/signup-status[?email=…]` is called three ways:

1. **On mount** — platform-level block (closed / invite-only / cap reached)
   paints the blocking message and disables submit + OAuth buttons.
2. **Live, debounced (400 ms)** with the typed email — domain-whitelist
   feedback while typing; editing the email away from a rejected domain clears
   the block.
3. **Right before submit** — re-check, so limits set minutes ago apply.

Rejections are reason-aware (`reason: closed | invite_only | domain | null`
where null means cap) and each has its own user-facing string. API
unreachable = allowed (the DB trigger on `auth.users` remains the hard gate).

## Feature flags — `lib/api-client.ts → myFeatureFlags()`

```
const { flags } = await myFeatureFlags()   // GET /api/flags/me (auth'd)
if (flags.some_new_ui) { /* render new thing */ }
```

The API resolves enabled×environment×rollout-bucket×segment **server-side**;
the client just reads booleans. Missing key = OFF. Cache briefly (~60 s), do
not call per render. Full flag lifecycle: `finflow-admin/docs/FEATURE_FLAGS.md`.
No in-app flag consumers exist yet — the plumbing is one `await` away for the
first flagged feature.

## Product-event instrumentation — `lib/posthog.ts`

`track(event, props?)` / `identifyUser(id, email?)` — both SSR-safe and
never-throw (`person_profiles: 'identified_only'`).

| Event | Fired from | Props |
|---|---|---|
| `$pageview` | PostHogProvider (route change) | `path` |
| `signup_completed` | SignupForm success; AuthListener for OAuth (`created_at < 3 min` ⇒ signup) | `method` (`email`, `oauth:google`, …) |
| `login` | LoginForm success; AuthListener for OAuth | `method` |
| `transaction_added` | `app/add/hooks/useTransaction.tsx` per saved tx | `type, category, amount` |
| `ai_used` | inside api-client AI calls **on success**: parse-text → nlp, speech → voice, receipt → receipt, insights | `feature` |
| `profile_photo_uploaded` | profile page | — |

OAuth flow trick: Google/Microsoft buttons stash `ff-oauth-provider` in
sessionStorage before redirect; AuthListener consumes it on the next
`SIGNED_IN` and decides signup-vs-login by account age. It also calls
`identifyUser(user.id)` **on every session** so PostHog `distinct_id` equals
the Supabase user id — which is what lets Vertex filter analytics by
database-side user segments.

These events feed Vertex → Analytics (Events/Funnel/Features tabs); admin-side
queries live in `finflow-api/src/services/admin-analytics.ts`.
