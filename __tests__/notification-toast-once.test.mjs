/**
 * Regression guard for "notification toasts replay on every tab switch".
 *
 * History, so nobody re-introduces these:
 *   * PR #66 — the layout chrome is rendered by each page instead of a shared
 *     app/layout.tsx, so every navigation unmounts and remounts the bell. The
 *     toast sequence hung off the mount effect via `showUnseenToasts`, which
 *     depended on `router`, so every route change replayed it.
 *   * PR #67 — tried to track "toasted" in a `shown` column that does not
 *     exist in the live schema, producing PGRST204 on every toast.
 *
 * The ledger now lives in sessionStorage. Nothing about a toast is persisted
 * to the database.
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
      /let ledgerClaimedForUserId:\s*string \| null = null/,
      'the once-per-session guard must live in module scope — a ref or state resets on remount'
    )
    assert.match(bell, /if \(ledgerClaimedForUserId === uid\) return/, 'the guard is never consulted')
  })

  await t.test('the ledger is claimed before awaiting the network', () => {
    // Scope to the toast callback: the helpers are defined at module level,
    // so an unscoped indexOf would find the definition instead of the call.
    const start = bell.indexOf('const showUnseenToasts')
    const end = bell.indexOf('const { user: currentUser }')
    assert.ok(start > -1 && end > start, 'could not bound the toast callback')
    const fn = bell.slice(start, end)

    const claim = fn.indexOf('ledgerClaimedForUserId = uid')
    const write = fn.indexOf('rememberToastedIds(')
    assert.ok(claim > -1, 'the session is never claimed')
    assert.ok(write > -1, 'toasted ids are never recorded')
    assert.ok(
      claim < write,
      'claiming after the write lets two concurrent mounts (loading.tsx + page) double-toast'
    )
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

test('toasting never writes to the database', async (t) => {
  const bell = stripComments(read(BELL))
  const api = stripComments(read(API))

  await t.test('the toast path makes no notification mutation', () => {
    const start = bell.indexOf('const showUnseenToasts')
    const end = bell.indexOf('const { user: currentUser }')
    assert.ok(start > -1 && end > start)
    const fn = bell.slice(start, end)

    assert.doesNotMatch(fn, /markNotificationRead\(/, 'a toast is not a read')
    assert.doesNotMatch(fn, /markAllNotificationsRead\(/)
    assert.doesNotMatch(fn, /markNotificationsShown/, 'the mark-shown endpoint was removed')
  })

  await t.test('the realtime handler makes no notification mutation', () => {
    const start = bell.indexOf('notifications-realtime')
    const end = bell.indexOf('const handleMarkAsRead')
    const rt = bell.slice(start, end)

    assert.doesNotMatch(rt, /markNotificationRead\(/)
    assert.doesNotMatch(rt, /markNotificationsShown/)
  })

  await t.test('the dead mark-shown transport is gone from the client', () => {
    assert.doesNotMatch(api, /markNotificationsShown/)
    assert.doesNotMatch(api, /mark-shown/)
  })

  await t.test('no source file references a `shown` column', () => {
    // The column is not in the live schema; reading or writing it produced
    // PGRST204 on every toast. `read` is the only flag we may touch.
    for (const file of [BELL, API, 'lib/types.ts', 'app/notifications/page.tsx']) {
      const src = stripComments(read(file))
      assert.doesNotMatch(src, /\.shown\b/, `${file} still reads .shown`)
      assert.doesNotMatch(src, /\bshown\s*:/, `${file} still writes a shown field`)
    }
  })

  await t.test('an explicit user action may still mark as read', () => {
    // handleMarkAsRead is user-initiated — this one is correct and must stay.
    assert.match(bell, /const handleMarkAsRead[\s\S]{0,220}markNotificationRead\(notificationId\)/)
  })
})

test('the toast ledger is client-side and survives a remount', async (t) => {
  const bell = stripComments(read(BELL))

  await t.test('the ledger uses sessionStorage, not the database', () => {
    assert.match(bell, /sessionStorage\.getItem\(TOAST_LEDGER_KEY\)/)
    assert.match(bell, /sessionStorage\.setItem\(TOAST_LEDGER_KEY/)
  })

  await t.test('already-toasted ids are filtered out', () => {
    assert.match(bell, /readToastedIds\(\)/)
    assert.match(bell, /filter\(\(n\) => !alreadyToasted\.has\(n\.id\)\)/)
  })

  await t.test('storage failures cannot break the bell', () => {
    // Private mode throws on access; the helpers must swallow it.
    assert.match(bell, /function readToastedIds[\s\S]{0,400}catch/)
    assert.match(bell, /function rememberToastedIds[\s\S]{0,400}catch/)
  })

  await t.test('the ledger stays bounded', () => {
    assert.match(bell, /slice\(-100\)/, 'unbounded sessionStorage growth')
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
