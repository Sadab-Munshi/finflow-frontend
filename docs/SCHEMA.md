---
name: schema
description: Database schema summary — the 7 RLS-protected tables this frontend touches directly, and where the rest live
last_updated: 2026-10-06
audience: [human, agent]
related: [migration-notes, auth, state]
---

# Database Schema (as used by this frontend)

Authoritative SQL: **`supabase/migrations/001_create_tables.sql`** (the SQL file
stays the single source of truth — this doc summarizes it). The full table
catalog including API-only tables (`ai_usage`, `report_queue`, `reports`,
`analytics_cache`, `feedback`, `banned_ips`) lives in
`finflow-api/docs/SCHEMA.md`.

Two access lanes (`docs/CONVENTIONS.md#data-fetching`): browser reads/writes go
to the **RLS-protected tables below** via the anon client; everything else goes
through finflow-api with the service-role key (RLS bypassed there).

## Tables + RLS summary

| Table | Migration lines | RLS policies (effect) | Read/write from this app |
|---|---|---|---|
| `transactions` | `001_create_tables.sql:5-36` | full CRUD where `auth.uid() = user_id` (4 policies) | `lib/db.ts:8-89`; columns: `id, user_id, amount, type CHECK income/expense, category, note, date (text in repo SQL, `date` in prod — see quirks), created_at` |
| `budgets` | `:39-69` | full CRUD own-row | `lib/db.ts:92-146`; `user_id, category, amount, month (text), created_at` |
| `settings` | `:71-100` | view/insert/update own row (no delete) | `lib/db.ts:149-186`, `UserContext:40-42`, profile/settings pages; many nullable pref columns + `is_admin` (no longer read here — admin moved out), `avatar_url`, `name`, bot linkage |
| `notifications` | `:102-135` | full CRUD own row | `lib/api-client.ts:170-188` (API mirror) — backend also writes |
| `push_subscriptions` | `:137-163` | view/insert/delete own row (no update — upsert via API) | written via API (`lib/api-client.ts:340`) |
| `user_management` | `:165-183` | **SELECT own row only** ("view own ban status") | ban checks in `lib/supabase/middleware.ts:56-61` + `UserContext` + `trackLogin` upsert goes through API |
| `user_heartbeat` | `:184-…` | view + upsert + update own row | `context/UserContext.tsx:96-103` (30 s ping) |

## Notable schema quirks

- **`transactions.date` has drifted between repo and prod**: migration
  `001_create_tables.sql:12` declares `date text NOT NULL`, but the live
  production column is a real **`date` type** (verified 2026-10-06 — a
  `date ~ regex` query errors with "operator does not exist"). Treat SQL as
  type-agnostic (`t.date::text` before any string ops); in app code, compare
  `YYYY-MM-DD` strings only after `normalizeDateToYMD` (`lib/utils.ts:23`).
- `settings.user_id` is the joining key across nearly every feature; several
  columns are `NOT NULL` only by first migration — later columns are nullable
  additions made outside this SQL file. <!-- TODO: verify whether later ALTERs were applied manually; only 001 exists in-repo -->
- API-side tables enforced by unique upsert keys (`ai_usage`, `report_queue`,
  `reports`, `analytics_cache`) — see the API repo's SCHEMA doc; do not query
  them from the browser (no policies → denied, correct).

## Migrations 002–012 (all service-role-only — browser never touches)

| # | File | Contents |
|---|---|---|
| 002 | `002_signup_cap_and_streaks.sql` | Signup cap counter + user streak fields |
| 004 | `004_admin_audit_and_presence.sql` | `admin_audit` (Vertex's Activity page) + presence |
| 005 | `005_user_events.sql` | Event timeline (UserDrawer activity, product events) |
| 006 | `006_feedback_workflow.sql` | Feedback inbox with status |
| 007 | `007_notification_campaigns.sql` | `notification_templates` + `notification_campaigns` + `notifications.campaign_id` (open-rate joins) |
| 008 | `008_ai_daily_usage.sql` | `ai_usage_daily` — per-user daily AI cap |
| 009 | `009_segments_and_feature_flags.sql` | Segments, feature flags, campaign segment columns |
| 010 | `010_signup_waitlist.sql` | `signup_waitlist` (email, reason, unique) — closed-signup card capture |
| 011 | `011_waitlist_invite_tracking.sql` | `signup_waitlist.invite_sent_at` + `invites` |
| 012 | `012_email_templates.sql` | `email_templates` (admin-editable outbound wrappers, seeded `admin_notification`) |

All are RLS-enabled with **no public policies**: every browser request is
denied by design; finflow-api does everything with the service role
(admin panel reads → `GET /api/admin/*` relays by JWT-matched role).
Migration 003 has no in-repo file (reserved number — see
`docs/MIGRATION_NOTES.md`).

## Dashboard auth email templates

`supabase/email-templates/` holds **paste-in** HTML bodies for Supabase →
Authentication → Emails (invite, magic link/OTP, confirm signup, reset
password) — self-contained branded wrappers using `{{ .ConfirmationURL }}`
and `{{ .Token }}`. They're not auto-applied; the `README.md` next to them
lists tab → file → subject.

## Storage buckets

| Bucket | Used for | Access |
|---|---|---|
| avatars (public) | profile pictures (`app/profile/page.tsx`) | public read matches `next.config.ts:24-32` image pattern |
| `reports` | monthly PDFs | owned by finflow-api (signed URLs in `reports` table rows → rendered on `/reports`) |

## Changing the schema

1. Write the SQL in a new `supabase/migrations/00N_*.sql` (do not edit 001).
2. Apply manually in the Supabase SQL editor (no runner) and record it per
   `docs/MIGRATION_NOTES.md#conventions`.
3. Every new browser-accessed table/column needs an RLS policy in the same
   change — the anon key sees nothing without one.
4. Update `lib/types.ts` + this doc in the same PR.
