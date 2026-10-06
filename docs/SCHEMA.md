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
| `transactions` | `001_create_tables.sql:5-36` | full CRUD where `auth.uid() = user_id` (4 policies) | `lib/db.ts:8-89`; columns: `id, user_id, amount, type CHECK income/expense, category, note, date (text!), created_at` |
| `budgets` | `:39-69` | full CRUD own-row | `lib/db.ts:92-146`; `user_id, category, amount, month (text), created_at` |
| `settings` | `:71-100` | view/insert/update own row (no delete) | `lib/db.ts:149-186`, `UserContext:40-42`, profile/settings/admin pages; many nullable pref columns + `is_admin`, `avatar_url`, `name`, bot linkage |
| `notifications` | `:102-135` | full CRUD own row | `lib/api-client.ts:170-188` (API mirror) — backend also writes |
| `push_subscriptions` | `:137-163` | view/insert/delete own row (no update — upsert via API) | written via API (`lib/api-client.ts:340`) |
| `user_management` | `:165-183` | **SELECT own row only** ("view own ban status") | ban checks in `lib/supabase/middleware.ts:56-61` + `UserContext` + `trackLogin` upsert goes through API |
| `user_heartbeat` | `:184-…` | view + upsert + update own row | `context/UserContext.tsx:96-103` (30 s ping) |

## Notable schema quirks

- **`transactions.date` is `text`** (`001_create_tables.sql:12`), not `date` —
  normalization burden lives in the app (`lib/utils.ts:23`). Compare as
  `YYYY-MM-DD` strings only after `normalizeDateToYMD`.
- `settings.user_id` is the joining key across nearly every feature; several
  columns are `NOT NULL` only by first migration — later columns are nullable
  additions made outside this SQL file. <!-- TODO: verify whether later ALTERs were applied manually; only 001 exists in-repo -->
- API-side tables enforced by unique upsert keys (`ai_usage`, `report_queue`,
  `reports`, `analytics_cache`) — see the API repo's SCHEMA doc; do not query
  them from the browser (no policies → denied, correct).

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
