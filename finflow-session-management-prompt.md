# FinFlow — Session Management Implementation Prompt
> Feed this entire prompt to Claude Code or GitHub Copilot for implementation.

---

## CONTEXT

You are working on **FinFlow**, a Next.js + TypeScript personal finance web app.
- **Live URL**: https://app.sadabmunshi.online/
- **Stack**: Next.js (App Router), TypeScript, Supabase (auth + database), Tailwind CSS
- **Auth**: Supabase Auth (already implemented)

---

## PROBLEM TO FIX

Currently when a user logs out on one device, they are logged out on ALL devices simultaneously. This is because a single global session is being invalidated instead of only the current device's session.

---

## GOAL

1. **Fix the logout bug** — logging out on one device must NOT affect other devices
2. **Add Telegram-style Active Sessions UI** in `app/(dashboard)/profile/privacy-security/page.tsx`
3. The new UI section must match the existing card style of that page exactly

---

## PART 1 — DATABASE: Create `user_sessions` Table in Supabase

Run this SQL in the Supabase SQL editor:

```sql
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_token text not null unique,
  device_name text,
  browser text,
  os text,
  ip_address text,
  location text,
  is_current boolean default false,
  last_active_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Index for fast lookup by user
create index on public.user_sessions(user_id);

-- RLS policies
alter table public.user_sessions enable row level security;

create policy "Users can view own sessions"
  on public.user_sessions for select
  using (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.user_sessions for delete
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.user_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.user_sessions for update
  using (auth.uid() = user_id);
```

---

## PART 2 — UTILITY: Device Detection Helper

Create `lib/device-info.ts`:

```ts
import { UAParser } from 'ua-parser-js'

export function getDeviceInfo(userAgent: string) {
  const parser = new UAParser(userAgent)
  const result = parser.getResult()

  const browser = result.browser.name ?? 'Unknown Browser'
  const os = result.os.name ?? 'Unknown OS'
  const deviceType = result.device.type ?? 'desktop'

  let device_name = 'Desktop'
  if (deviceType === 'mobile') device_name = 'Mobile'
  else if (deviceType === 'tablet') device_name = 'Tablet'

  return {
    device_name,
    browser,
    os,
  }
}
```

Install the package:
```bash
npm install ua-parser-js
npm install --save-dev @types/ua-parser-js
```

---

## PART 3 — API ROUTES

### 3a. Create session on login
Create `app/api/sessions/create/route.ts`:

```ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getDeviceInfo } from '@/lib/device-info'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userAgent = req.headers.get('user-agent') ?? ''
  const ip_address = req.headers.get('x-forwarded-for') ?? req.ip ?? 'Unknown'
  const { device_name, browser, os } = getDeviceInfo(userAgent)
  const session_token = uuidv4()

  // Mark all other sessions as not current
  await supabase
    .from('user_sessions')
    .update({ is_current: false })
    .eq('user_id', user.id)

  // Insert new session
  await supabase.from('user_sessions').insert({
    user_id: user.id,
    session_token,
    device_name,
    browser,
    os,
    ip_address,
    is_current: true,
    last_active_at: new Date().toISOString(),
  })

  // Store session token in cookie
  const response = NextResponse.json({ success: true })
  response.cookies.set('finflow_session', session_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return response
}
```

### 3b. Get all sessions
Create `app/api/sessions/route.ts`:

```ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cookieStore = cookies()
  const currentToken = cookieStore.get('finflow_session')?.value

  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('last_active_at', { ascending: false })

  // Mark which one is current based on cookie token
  const enriched = (sessions ?? []).map(s => ({
    ...s,
    is_current: s.session_token === currentToken,
  }))

  return NextResponse.json({ sessions: enriched })
}
```

### 3c. Delete a specific session
Create `app/api/sessions/[id]/route.ts`:

```ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase
    .from('user_sessions')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id) // safety: only own sessions

  return NextResponse.json({ success: true })
}
```

### 3d. Delete all OTHER sessions (keep current)
Create `app/api/sessions/logout-others/route.ts`:

```ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cookieStore = cookies()
  const currentToken = cookieStore.get('finflow_session')?.value

  await supabase
    .from('user_sessions')
    .delete()
    .eq('user_id', user.id)
    .neq('session_token', currentToken ?? '') // keep current session

  return NextResponse.json({ success: true })
}
```

---

## PART 4 — FIX THE LOGOUT BUG

Find the existing logout function (likely in a context file, auth helper, or profile page). Update it to:

```ts
async function handleLogout() {
  // 1. Get current session token from cookie
  // 2. Delete only that session from user_sessions table
  // 3. Clear the finflow_session cookie
  // 4. Call supabase.auth.signOut() 
  // 5. Redirect to /login

  const res = await fetch('/api/sessions/logout-current', { method: 'DELETE' })
  await supabase.auth.signOut()
  router.push('/login')
}
```

Create `app/api/sessions/logout-current/route.ts`:

```ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  const cookieStore = cookies()
  const currentToken = cookieStore.get('finflow_session')?.value

  if (user && currentToken) {
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', user.id)
      .eq('session_token', currentToken)
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete('finflow_session')
  return response
}
```

---

## PART 5 — UI: Active Sessions Section

In `app/(dashboard)/profile/privacy-security/page.tsx`, add a new section **below** the existing "DATA & ANALYTICS" section.

### Design Rules (must match existing page style):
- Section header: same style as `ACCOUNT SECURITY`, `PRIVACY`, `DATA & ANALYTICS` labels
- Cards: same `rounded-2xl border bg-white p-4` style as existing cards
- Use teal (`#0d9488`) as accent color for "This device" badge — matches app theme
- "Log out" per session: small red text button, no filled background
- "Log out all other devices": red outlined button at bottom of section
- Current session shows a green "This device" badge
- Each session card shows: device icon + device name + browser + OS + last active time
- If only 1 session (current device only): show message "No other active sessions"

### Component to create: `components/ActiveSessions.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Monitor, Smartphone, Tablet, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type Session = {
  id: string
  device_name: string
  browser: string
  os: string
  ip_address: string
  last_active_at: string
  is_current: boolean
}

export function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [logoutingId, setLogoutingId] = useState<string | null>(null)
  const [logoutingAll, setLogoutingAll] = useState(false)

  useEffect(() => {
    fetchSessions()
  }, [])

  async function fetchSessions() {
    setLoading(true)
    const res = await fetch('/api/sessions')
    const data = await res.json()
    setSessions(data.sessions ?? [])
    setLoading(false)
  }

  async function logoutSession(id: string) {
    setLogoutingId(id)
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    setSessions(prev => prev.filter(s => s.id !== id))
    setLogoutingId(null)
  }

  async function logoutAllOthers() {
    setLogoutingAll(true)
    await fetch('/api/sessions/logout-others', { method: 'DELETE' })
    setSessions(prev => prev.filter(s => s.is_current))
    setLogoutingAll(false)
  }

  function DeviceIcon({ type }: { type: string }) {
    if (type === 'Mobile') return <Smartphone className="w-5 h-5 text-teal-600" />
    if (type === 'Tablet') return <Tablet className="w-5 h-5 text-teal-600" />
    return <Monitor className="w-5 h-5 text-teal-600" />
  }

  const otherSessions = sessions.filter(s => !s.is_current)

  return (
    <div className="mt-8">
      {/* Section Header — matches existing page style */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-1">
        Active Sessions
      </p>

      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden divide-y divide-gray-50">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
          </div>
        ) : (
          <>
            {sessions.map(session => (
              <div key={session.id} className="flex items-start gap-3 p-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0 mt-0.5">
                  <DeviceIcon type={session.device_name} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {session.device_name}
                    </span>
                    {session.is_current && (
                      <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                        This device
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {session.browser} · {session.os}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Active {formatDistanceToNow(new Date(session.last_active_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Logout button (not for current device) */}
                {!session.is_current && (
                  <button
                    onClick={() => logoutSession(session.id)}
                    disabled={logoutingId === session.id}
                    className="text-xs text-red-500 font-medium shrink-0 hover:text-red-700 disabled:opacity-50 min-h-[44px] px-2 flex items-center"
                  >
                    {logoutingId === session.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Log out'
                    )}
                  </button>
                )}
              </div>
            ))}

            {/* No other sessions state */}
            {otherSessions.length === 0 && !loading && (
              <div className="px-4 py-3 text-xs text-gray-400 text-center">
                No other active sessions
              </div>
            )}

            {/* Log out all others button */}
            {otherSessions.length > 0 && (
              <div className="p-4">
                <button
                  onClick={logoutAllOthers}
                  disabled={logoutingAll}
                  className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {logoutingAll ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Logging out...</>
                  ) : (
                    'Log out all other devices'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

### Import and use in the privacy-security page:

```tsx
import { ActiveSessions } from '@/components/ActiveSessions'

// Add at the bottom of the page, after DATA & ANALYTICS section:
<ActiveSessions />
```

---

## PART 6 — CALL SESSION CREATE ON LOGIN

Find the existing login handler (likely in `app/(auth)/login/page.tsx` or an auth context). After a successful Supabase login, add:

```ts
// After supabase.auth.signInWithPassword() succeeds:
await fetch('/api/sessions/create', { method: 'POST' })
```

Also add the same call after Google OAuth login completes (in the OAuth callback handler if it exists).

---

## SUMMARY OF FILES TO CREATE/MODIFY

| File | Action |
|------|--------|
| Supabase SQL | Run migration to create `user_sessions` table |
| `lib/device-info.ts` | Create — device/browser detection |
| `app/api/sessions/route.ts` | Create — GET all sessions |
| `app/api/sessions/create/route.ts` | Create — POST create session on login |
| `app/api/sessions/[id]/route.ts` | Create — DELETE specific session |
| `app/api/sessions/logout-others/route.ts` | Create — DELETE all other sessions |
| `app/api/sessions/logout-current/route.ts` | Create — DELETE current session on logout |
| `components/ActiveSessions.tsx` | Create — UI component |
| `app/(dashboard)/profile/privacy-security/page.tsx` | Modify — add `<ActiveSessions />` at bottom |
| Login page/handler | Modify — call `/api/sessions/create` after login |
| Logout function | Modify — call `/api/sessions/logout-current` before signOut |

---

## IMPORTANT NOTES FOR IMPLEMENTER

- Install `date-fns` if not already installed: `npm install date-fns`
- Install `ua-parser-js`: `npm install ua-parser-js && npm install --save-dev @types/ua-parser-js`
- Install `uuid` if not available: `npm install uuid && npm install --save-dev @types/uuid`
- Do NOT change any existing UI styles on the privacy-security page
- The `is_current` detection is based on the `finflow_session` cookie matching the session token
- RLS policies ensure users can only see/delete their own sessions — never other users'
- The logout bug fix is in PART 4 — this is the most critical change
