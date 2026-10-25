/**
 * Regression guard for "notification toasts replay on every tab switch".
 *
 * Root cause (PR #66): the layout chrome is rendered by each page instead of a
 * shared app/layout.tsx, so every navigation unmounts and remounts
 * NotificationBell. The toast sequence was reachable from the mount effect via
 * `showUnseenToasts` — which itself depended on `router` — and the ledger it
 * wrote was `read` rather than `shown`, so the unread backlog drained two
 * notifications per navigation.
 *
 * These are structural assertions: the repo has no DOM test harness, so the
 * invariants that make the bug impossible are checked at the source level.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const BELL = 'components/notifications/NotificationBell.tsx'
const API = 'lib/api-client.ts'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

/**
 * Drop comments so prose cannot trip a source-level regex.
 *
 * Order matters: line comments are removed FIRST. A `//` comment containing a
 * path glob such as `app/*\u002floading.tsx` otherwise opens a phantom block
 * comment that swallows everything up to the next real `*\u002f`.
 */
function stripComments(src) {
  return src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

test('notification toasts fire once per session, not per navigation', async (t) => {
  const bell = stripComments(read(BELL))

  await t.test('the mount effect does not depend on the toast callback', () => {
    const effect = bell.match(/useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?showUnseenToasts\(id\)[\s\S]*?\},\s*\[([^\]]*)\]/)
    assert.ok(effect, 'could not locate the mount effect that shows unseen toasts')

    const deps = effect[1]
    assert.match(deps, /currentUser\?\.userId/, 'must still react to the signed-in user')
    assert.doesNotMatch(
      deps,
      /showUnseenToasts/,
      'depending on showUnseenToasts re-arms the toasts on every remount'
    )
    assert.doesNotMatch(deps, /router/, 'depending on the router replays toasts on navigation')
    assert.doesNotMatch(deps, /pathname/, 'depending on pathname replays toasts on navigation')
  })

  await t.test('a module-scope ledger survives the remount', () => {
    assert.match(
      bell,
      /let toastedForUserId:\s*string \| null = null/,
      'the once-per-session guard must live in module scope — a ref or state resets on remount'
    )
    assert.match(bell, /if \(toastedForUserId === uid\) return/, 'the guard is never consulted')
  })

  await t.test('the ledger is claimed before awaiting the network', () => {
    const body = bell.slice(bell.indexOf('toastedForUserId = uid'))
    const claim = bell.indexOf('toastedForUserId = uid')
    const write = bell.indexOf('markNotificationsShown(')
    assert.ok(claim > -1 && write > -1)
    assert.ok(
      claim < write,
      'claiming after the write lets two concurrent mounts (loading.tsx + page) double-toast'
    )
    assert.ok(body.length > 0)
  })

  await t.test('the toast callback itself is stable', () => {
    const cb = bell.match(/const showUnseenToasts = useCallback\([\s\S]*?\n  \}, \[([^\]]*)\]\)/)
    assert.ok(cb, 'could not locate showUnseenToasts')
    assert.equal(cb[1].trim(), '', `showUnseenToasts deps must be empty, got: ${cb[1]}`)
  })

  await t.test('the router is held in a ref so callbacks do not churn', () => {
    assert.match(bell, /const routerRef = useRef\(router\)/)
    assert.match(bell, /routerRef\.current\.push\(/, 'toast clicks must use the ref, not `router`')
  })
})

test('toasting does not mark notifications as read', async (t) => {
  const bell = stripComments(read(BELL))
  const api = stripComments(read(API))

  await t.test('the unseen-toast path writes `shown`, not `read`', () => {
    // Anchors are code, not comments — comments are stripped above.
    const start = bell.indexOf('const showUnseenToasts')
    const end = bell.indexOf('const { user: currentUser }')
    assert.ok(start > -1 && end > start, 'could not bound the toast callback')
    const fn = bell.slice(start, end)
    assert.match(fn, /markNotificationsShown\(/, 'toast path must set the shown ledger')
    assert.doesNotMatch(
      fn,
      /markNotificationRead\(/,
      'marking a toast as read silently clears the user\'s unread badge'
    )
  })

  await t.test('the realtime handler writes `shown`, not `read`', () => {
    const start = bell.indexOf('notifications-realtime')
    const end = bell.indexOf('const handleMarkAsRead')
    assert.ok(start > -1 && end > start, 'could not bound the realtime handler')
    const rt = bell.slice(start, end)
    assert.match(rt, /markNotificationsShown\(\[newNotification\.id\]\)/)
    assert.doesNotMatch(rt, /markNotificationRead\(/)
  })

  await t.test('an explicit user action may still mark as read', () => {
    // handleMarkAsRead is user-initiated — this one is correct and must stay.
    assert.match(bell, /const handleMarkAsRead[\s\S]{0,220}markNotificationRead\(notificationId\)/)
  })

  await t.test('the client exposes the mark-shown transport', () => {
    assert.match(api, /export async function markNotificationsShown\(ids: string\[\]\)/)
    assert.match(api, /\/api\/notifications\/mark-shown/)
  })
})

test('notifications still go through the API, never PostgREST', async (t) => {
  await t.test('the bell has no direct table access', () => {
    const bell = stripComments(read(BELL))
    assert.doesNotMatch(bell, /from\('notifications'\)/, 'client-side PostgREST query returned')
  })

  await t.test('the bell reads the session from the bootstrap context', () => {
    const bell = stripComments(read(BELL))
    assert.match(bell, /useUser\(\)/, 'the bell must not re-run auth.getUser()')
  })
})
