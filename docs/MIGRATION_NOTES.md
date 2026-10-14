---
name: migration-notes
description: Migration history — backend split to finflow-api, leftover artifacts, conventions for future migrations
last_updated: 2026-10-06
audience: [human, agent]
related: [schema, debt, decisions]
---

# Migration Notes

## History (reconstructed from code — earliest file state is post-split)

The repo was once a Next.js **monolith**: API routes, AI calls, email, push, and
admin logic lived inside this app. The backend was extracted into
`finflow-api` (Express); this repo kept the UI plus Supabase-direct data access.

## Leftover artifacts of the split (evidence)

| Artifact | Where | Status |
|---|---|---|
| `lib/storage.ts` localStorage mirror | `lib/storage.ts` | pre-Supabase/Sync transition layer; read `docs/DEBT.md` before touching |
| README claims of Next.js API routes + server-side secret vars | `README.md` (old) | corrected in this refresh (2026-10-06) |

Cleaned up 2026-10-06 (branch `fix/security-remove-admin`): the stale
`vercel.json` crons, dead deps (`web-push`, `@getbrevo/brevo`, `bcryptjs`,
`@types/bcryptjs`, `@types/web-push`), the unused `createServiceClient`, the
two browser-shipped API secrets (`NEXT_PUBLIC_INTERNAL_API_SECRET`,
`NEXT_PUBLIC_BOT_SECRET`), the dead `api.mistral.ai` CSP entry, the unset
`finflow_visitor` cookie block, and the `app/admin-dy26zyfv/` UI (admin moved
to a separate domain).

## What moved out (now owned by finflow-api)

AI (Sarvam NLP/STT, Gemini receipts, Groq insights/summaries), Brevo email,
VAPID push sending, CRON-driven report/analytics jobs, admin operations,
Turnstile verification, ban-check endpoints — consumed via `lib/api-client.ts`.

## What stayed here

Auth (Supabase), own-user CRUD on 7 RLS tables (`docs/SCHEMA.md`), PWA shell,
SW + push subscription, i18n, PostHog telemetry. (The admin UI also lived here
until 2026-10-06, when it moved to a separate domain.)

## Conventions for future migrations

1. **Data stays put, moves are code-only** — the DB is shared; never copy
   tables.
2. New domain capabilities default to **finflow-api endpoints**; browser-direct
   Supabase access only for own-user, RLS-protected CRUD.
3. When moving a feature out of this repo: delete the dead env vars, deps, and
   CSP entries in the same PR (learned from the leftovers above).
4. Schema changes: new numbered SQL file, manual apply, then update
   `docs/SCHEMA.md` + `lib/types.ts` together (see `docs/SCHEMA.md#changing-the-schema`).
5. Record notable migrations here with date + evidence, not from memory.

## Supabase migrations ledger (post-split, run manually in the SQL editor)

| File | Purpose | Notes |
|---|---|---|
| `007_notification_campaigns.sql` | Notifications 2.0 — campaigns, templates, `read` tracking, campaign stats | required by `/api/admin/notifications*` + cron dispatcher |
| `008_ai_daily_usage.sql` | per-user **daily** AI cap (`ai_usage_daily`, PK user_id+day, IST) | rows roll forever; manual prune: `delete … where day < current_date - 40` |
| `009_segments_and_feature_flags.sql` | `user_segments` + `feature_flags` (service-role only) + `notification_campaigns.segment_id/_name` | **fix 2026-10-08:** Postgres has no `CREATE POLICY IF NOT EXISTS` — policies use drop-then-create (same as 004). Safe to re-run top-to-bottom after a partial run. |

| `010_signup_waitlist.sql` | `signup_waitlist` (email unique lower-cased, reason closed/invite_only/capacity) | service-role only, no RLS policies; captured by the closed-signup card via `/api/auth/waitlist-join` |

Apply order matters: 008 before deploying the AI-limits build; 009 before the
segments/flags build. Tables are additive; nothing here alters existing data.
