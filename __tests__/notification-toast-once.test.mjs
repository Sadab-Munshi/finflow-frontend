/**
 * Regression guard for "old notifications pop up as toasts when the app loads".
 *
 * History, so nobody re-introduces these:
 *   * PR #66 — the layout chrome is rendered by each page instead of a shared
 *     app/layout.tsx, so every navigation unmounts and remounts the bell. The
 *     toast sequence hung off the mount effect and its deps changed on
 *     navigation, so every route change replayed it.
 *   * PR #67 — tried to track "toasted" in a `shown` column that does not exist
 *     in the live schema, producing PGRST204 on every toast.
 *   * The sessionStorage ledger that followed still replayed up to two
 *     historical notifications per NEW TAB, because storage is per-tab. It
 *     suppressed repeats within a tab and nothing more.
 *
 * The rule now: the initial load fills the list and the bell badge and NOTHING
 * else. A toast requires a genuine INSERT arriving over the Realtime socket
 * while the user is connected. History is not an event.
 *
 * These are structural assertions: the repo has no DOM harness, so the
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
 * path glob such as `app/*\/loading.tsx` otherwise opens a phantom block
 * comment that swallows everything up to the next real `*\/`.
 */
function stripComments(src) {
  return src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

const bell = stripComments(read(BELL))
const api = stripComments(read(API))

/** The one mount effect that records who is signed in. */
function mountEffect() {
  return bell.match(
    /useEffect\(\(\) => \{\s*const id = currentUser\?\.userId[\s\S]*?\}, \[currentUser\?\.userId\]\)/
  )
}

/** The realtime subscription callback — the only legitimate toast source. */
function realtimeBlock() {
  const start = bell.indexOf('notifications-realtime')
  const end = bell.indexOf('const handleMarkAsRead')
  assert.ok(start > -1 && end > start, 'could not bound the realtime handler')
  return bell.slice(start, end)
}

test('initial load never toasts historical notifications', async (t) => {
  await t.test('the mount effect starts no toast sequence', () => {
    const effect = mountEffect()
    assert.ok(effect, 'could not locate the mount effect')
    assert.doesNotMatch(effect[0], /toast/i, 'mount must not toast')
    assert.doesNotMatch(effect[0], /getNotifications/, 'mount must not fetch notifications itself')
    assert.doesNotMatch(effect[0], /showUnseen/, 'the unseen-toast mount path must stay deleted')
  })

  await t.test('nothing fetches unread notifications for toasting', () => {
    // `getNotifications(limit, true)` was the historical-unread query. The list
    // fetch is the only notification read the component may make.
    assert.doesNotMatch(
      bell,
      /getNotifications\([^)]*,\s*true\s*\)/,
      'a mount-time unread query is what replayed old notifications'
    )
  })

  await t.test('no session-storage toast ledger survives', () => {
    assert.doesNotMatch(bell, /sessionStorage/, 'the per-tab ledger is gone for good')
    assert.doesNotMatch(bell, /localStorage/, 'a toast ledger must not come back as localStorage')
    assert.doesNotMatch(bell, /TOAST_LEDGER|readToastedIds|rememberToastedIds|ledgerClaimed/)
  })

  await t.test('the initial fetch still fills the list and the badge', () => {
    // Requirement 3: the mount fetch is for the list + count only.
    assert.match(bell, /const loadNotifications = useCallback/, 'list fetch must remain')
    assert.match(bell, /await getNotifications\(NOTIFICATIONS_LIMIT\)/)
    assert.match(bell, /setNotifications\(data\)/, 'list is populated')
    assert.match(bell, /setUnreadCount\(data\.filter\(\(n: Notification\) => !n\.read\)\.length\)/, 'badge is populated')
    assert.match(bell, /useEffect\(\(\) => \{\s*if \(!userId\) return\s*loadNotifications\(\)/, 'mount still loads the list')
  })
})

test('toasts come only from the realtime subscription', async (t) => {
  await t.test('a toast call site exists exactly once, inside the socket handler', () => {
    const calls = bell.match(/\btoast\(/g) || []
    assert.equal(calls.length, 1, `expected 1 toast() call site, found ${calls.length}`)

    const rt = realtimeBlock()
    assert.match(rt, /\btoast\(/, 'the single toast must live in the realtime handler')
    assert.match(rt, /event: 'INSERT'/, 'it fires on INSERT only')
    assert.match(rt, /table: 'notifications'/)
    assert.match(rt, /filter: `user_id=eq\.\$\{userId\}`/, 'scoped to the signed-in user')
  })

  await t.test('duplicate socket frames cannot double-toast', () => {
    // A reconnect/resubscribe can replay the same INSERT. The guard is an
    // in-memory Set — never storage, never the database.
    assert.match(bell, /const recentlyToastedIds = new Set<string>\(\)/, 'in-memory dedupe set')
    assert.match(bell, /function claimRealtimeToast\(id: string\): boolean/)
    assert.match(bell, /if \(recentlyToastedIds\.has\(id\)\) return false/, 'repeat frames are dropped')
    const rt = realtimeBlock()
    assert.match(rt, /if \(!claimRealtimeToast\(newNotification\.id\)\) return/, 'the handler checks before toasting')
  })

  await t.test('the realtime handler makes no notification mutation', () => {
    const rt = realtimeBlock()
    assert.doesNotMatch(rt, /markNotificationRead\(/)
    assert.doesNotMatch(rt, /markNotificationsShown/)
  })

  await t.test('toast clicks navigate through the ref, not the router', () => {
    // Depending on `router` in the subscription callback re-subscribes on every
    // navigation, which is how the old bug spread.
    const rt = realtimeBlock()
    assert.match(rt, /routerRef\.current\.push\(/)
    assert.doesNotMatch(rt, /\brouter\.push\(/)
  })
})

test('notification code touches only the `read` column', async (t) => {
  await t.test('the dead mark-shown transport is gone from the client', () => {
    assert.doesNotMatch(api, /markNotificationsShown/)
    assert.doesNotMatch(api, /mark-shown/)
  })

  await t.test('no source file references a `shown` column', () => {
    for (const file of [BELL, API, 'lib/types.ts', 'app/notifications/page.tsx']) {
      const src = stripComments(read(file))
      assert.doesNotMatch(src, /\.shown\b/, `${file} still reads .shown`)
      assert.doesNotMatch(src, /\bshown\s*:/, `${file} still writes a shown field`)
    }
  })

  await t.test('no notification view is persisted to the database', () => {
    // A toast is a UI event; opening the app must not write anything.
    const rt = realtimeBlock()
    assert.doesNotMatch(rt, /\.update\(|\.upsert\(|\.insert\(/)
    assert.doesNotMatch(bell, /\.update\(|\.upsert\(|\.insert\(/)
  })

  await t.test('an explicit user action may still mark as read', () => {
    assert.match(bell, /const handleMarkAsRead[\s\S]{0,220}markNotificationRead\(notificationId\)/)
  })
})
