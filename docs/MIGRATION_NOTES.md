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
| `vercel.json` crons for `/api/cron/monthly-report` + `process-report-queue` | `vercel.json:6-14` | **stale** — no `app/api/` in this repo; scheduled calls 404. See `docs/DEBT.md`. |
| Unused npm deps `web-push`, `@getbrevo/brevo`, `bcryptjs` (+ `@types/bcryptjs`) | `package.json` dependencies | candidates for removal after a usage grep — currently unreferenced in `app/`, `components/`, `lib/` |
| `createServiceClient` (service-role) | `lib/supabase/server.ts:5-9` | unused leftover; service-role work moved server-side |
| `NEXT_PUBLIC_INTERNAL_API_SECRET`, `NEXT_PUBLIC_BOT_SECRET` | `lib/api-client.ts:69,206` | split-era client calls to endpoints meant to be machine-only — High debt |
| CSP `connect-src` still lists `https://api.mistral.ai` | `next.config.ts:102` | Mistral was replaced by Sarvam/Groq/Gemini on the backend; allowlist entry is dead |
| `lib/storage.ts` localStorage mirror | `lib/storage.ts` | pre-Supabase/Sync transition layer; read `docs/DEBT.md` before touching |
| README claims of Next.js API routes + server-side secret vars | `README.md` (old) | corrected in this refresh (2026-10-06) |

## What moved out (now owned by finflow-api)

AI (Sarvam NLP/STT, Gemini receipts, Groq insights/summaries), Brevo email,
VAPID push sending, CRON-driven report/analytics jobs, admin operations,
Turnstile verification, ban-check endpoints — consumed via `lib/api-client.ts`.

## What stayed here

Auth (Supabase), own-user CRUD on 7 RLS tables (`docs/SCHEMA.md`), PWA shell,
SW + push subscription, i18n, PostHog telemetry, admin **UI** (calls API).

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
