---
name: skill-add-api-call
description: Checklist — call a finflow-api endpoint (or add one) from this app
last_updated: 2026-10-06
audience: [agent]
related: [agents, conventions, secrets-map]
---

# Skill: Add an API Call

## Inputs
- Endpoint on finflow-api (`METHOD /api/...`) — check the API repo's
  `docs/API.md`; if it doesn't exist, build it there first
- Auth mode: Bearer JWT (user calls) vs shared secret (server-only — **never**
  new `NEXT_PUBLIC_` secrets, `docs/DEBT.md`)
- Payload/response shapes

## Steps
1. Add an exported async function to `lib/api-client.ts` in the right section
   (grouped by domain — AI/Auth/Notifications/Admin/Push…).
2. Pick the transport:
   - JSON, JWT → `request()` (`lib/api-client.ts:20`)
   - multipart/file → `requestMultipart()` (`:46`)
   - shared-secret → ⚠️ do NOT extend `internalRequest()` (`:68`) — it leaks the
     secret to the browser. Use a server route handler (`app/api/<x>/route.ts`)
     with a non-public env var instead.
3. Type payloads inline (like `adminSendNotification`, `:265-292`) or extend
   `lib/analytics-types.ts`-style sibling types for larger domains.
4. Error handling is built in: transports throw `Error(serverMessage)`
   (`:38-43`) — wrap the call site in try/catch and `toast.error(err.message)`.
5. Confirm the API's CORS accepts this origin and headers; production origin is
   allowlisted server-side (`finflow-api` `CORS_ORIGIN`).
6. CSP: if a **new external origin** is contacted from the browser, add it to
   `connect-src` in `next.config.ts:102` — blocked otherwise.
7. Analytics-type endpoints follow the `lib/analytics-api.ts:44-62` wrapper:
   typed function + `?refresh=true` passthrough.
8. Docs: if the call creates a new user-facing capability, add it to
   `docs/ARCHITECTURE.md` feature map and note new env vars in `docs/CONFIG.md`
   + `docs/SECRETS_MAP.md` + `.env.example`.

## Verify
- Network tab shows `Authorization: Bearer <jwt>` on protected calls (never on
  public ones).
- 401 path: expired session → API 401 → toast, and `AuthListener` signs out.
- Slow network: skeleton stays until resolve (no partial UI).

## Common mistakes
- Calling the API from a server component with `lib/api-client.ts` (it's
  browser-session based — it will find no session token server-side).
- Shipping a machine secret via `NEXT_PUBLIC_*` (top security debt already;
  don't extend it).
- Forgetting the CSP entry → call fails only in production.
- Not updating the API repo first — the frontend must never invent endpoint shapes.
