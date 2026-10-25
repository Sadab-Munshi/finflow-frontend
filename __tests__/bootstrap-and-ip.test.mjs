import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const exists = rel => fs.existsSync(path.join(ROOT, rel))

const USER_CTX = 'context/UserContext.tsx'
const GATE_CTX = 'context/SubscriptionGateContext.tsx'
const MIDDLEWARE = 'lib/supabase/middleware.ts'
const API_CLIENT = 'lib/api-client.ts'
const RELAY = 'app/api/[...path]/route.ts'

function sourceFiles(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(entry => {
    const rel = `${dir}/${entry.name}`
    if (entry.isDirectory()) return sourceFiles(rel)
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : []
  })
}

/** Strip comments so prose *about* a table doesn't count as a query. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

test('admin tables are unreachable from client code', async t => {
  const ADMIN_TABLES = [
    'super_admins',
    'user_management',
    'subscription_overrides',
    'subscription_settings',
  ]

  await t.test('no file under app/, components/, context/, lib/ or hooks/ queries them', () => {
    const offenders = []
    for (const dir of ['app', 'components', 'context', 'lib', 'hooks']) {
      if (!exists(dir)) continue
      for (const file of sourceFiles(dir)) {
        if (file.startsWith('app/api/')) continue // server-side relay, not client
        const src = stripComments(read(file))
        for (const table of ADMIN_TABLES) {
          // Any .from('table') or supabase table reference is a leak.
          if (src.includes(`'${table}'`) || src.includes(`"${table}"`)) {
            offenders.push(`${file} -> ${table}`)
          }
        }
      }
    }
    assert.deepEqual(offenders, [], `client code still touches admin tables:\n${offenders.join('\n')}`)
  })

  await t.test('the subscription gate no longer creates a Supabase client at all', () => {
    const src = stripComments(read(GATE_CTX))
    assert.doesNotMatch(src, /createClient/, 'the gate must not talk to Supabase directly')
    assert.doesNotMatch(src, /\.from\(/, 'no PostgREST queries in the gate')
  })

  await t.test('the subscription gate holds no realtime channels', () => {
    const src = read(GATE_CTX)
    assert.doesNotMatch(src, /postgres_changes/, 'realtime channels removed by design')
    assert.doesNotMatch(src, /\.channel\(/, 'no channel subscription')
  })

  await t.test('the Edge middleware no longer reads user_management', () => {
    assert.doesNotMatch(stripComments(read(MIDDLEWARE)), /user_management/)
  })

  await t.test('the gate consumes the shared bootstrap payload instead of refetching', () => {
    const src = read(GATE_CTX)
    assert.match(src, /useUser\(\)/, 'must read from the shared provider')
    assert.match(src, /bootstrap\?\.settings/, 'settings come from bootstrap')
    assert.match(src, /bootstrap\?\.features/, 'features come from bootstrap')
    assert.match(src, /effectiveTier/, 'tier must be the resolved one')
  })
})

test('bootstrap consolidation', async t => {
  await t.test('the client exposes one bootstrap call', () => {
    const src = read(API_CLIENT)
    assert.match(src, /export async function getUserBootstrap/)
    assert.match(src, /request\('\/api\/user\/bootstrap'\)/, 'must call the relay path')
  })

  await t.test('the bandwidth-wasting ipify lookups are gone', () => {
    for (const file of [USER_CTX, API_CLIENT]) {
      assert.doesNotMatch(stripComments(read(file)), /api\.ipify\.org/, `${file} still calls ipify`)
    }
  })

  await t.test('the duplicate ban-poll functions no longer exist', () => {
    assert.doesNotMatch(read(API_CLIENT), /export async function checkBan/)
    assert.doesNotMatch(read(API_CLIENT), /export async function checkIpBan/)
    assert.doesNotMatch(read(USER_CTX), /checkIpBan|checkBan\(/)
  })

  await t.test('UserContext no longer runs a 20s ban poll', () => {
    const src = read(USER_CTX)
    assert.doesNotMatch(src, /setInterval\(checkBanStatus/)
    // The single remaining timer is the presence heartbeat.
    assert.match(src, /setInterval\(ping, 30000\)/)
  })

  await t.test('UserContext reads the ban state from bootstrap', () => {
    assert.match(read(USER_CTX), /payload\.banned/)
  })

  await t.test('notifications go through the validated API, not PostgREST', () => {
    for (const file of ['app/notifications/page.tsx', 'components/notifications/NotificationBell.tsx']) {
      const src = stripComments(read(file))
      assert.doesNotMatch(src, /from\('notifications'\)/, `${file} still queries PostgREST`)
    }
  })
})

test('navigation prefetching is disabled', async t => {
  await t.test('the sidebar nav rows opt out', () => {
    const src = read('components/layout/sidebar/SidebarNavList.tsx')
    assert.match(src, /prefetch=\{false\}/, 'sidebar rows must not prefetch every route')
  })

  await t.test('every Link in the layout chrome opts out', () => {
    const files = [
      'components/layout/Layout.tsx',
      'components/layout/AppTopBar.tsx',
      'components/layout/sidebar/AccountMenu.tsx',
      'components/layout/sidebar/MobileNavDrawer.tsx',
      'components/layout/sidebar/PremiumSidebar.tsx',
      'components/layout/sidebar/SidebarNavList.tsx',
    ]
    for (const file of files) {
      const src = read(file)
      // JSX attributes may span lines, so capture up to the closing '>' of the
      // opening tag including newlines.
      const links = src.match(/<Link\b[\s\S]*?>/g) || []
      for (const link of links) {
        assert.match(
          link,
          /prefetch=\{false\}/,
          `${file}: ${link.replace(/\s+/g, ' ').slice(0, 70)}… prefetches`
        )
      }
    }
  })
})

test('relay maps the versioned user API', async t => {
  await t.test('user/* is rewritten to v1/user/*', () => {
    const src = read(RELAY)
    assert.match(src, /PATH_REWRITES/)
    assert.match(src, /\{ match: \/\^user\\\/\/, replace: 'v1\/user\/' \}/, 'the rewrite rule must be explicit')
  })

  await t.test('every other path is still forwarded verbatim', () => {
    const src = stripComments(read(RELAY))
    // Only the single documented rule may exist. (The type annotation
    // `Array<{ match: RegExp; replace: string }>` is not a rule.)
    const rules = src.match(/\{ match: \//g) || []
    assert.equal(rules.length, 1, 'adding a second rewrite must be a deliberate, reviewed change')
  })
})

test('dual-stack migration', async t => {
  await t.test('the migration adds cidr additively', () => {
    const file = 'supabase/migrations/016_dual_stack_ip_bans.sql'
    assert.ok(exists(file), 'migration missing')
    const sql = read(file)
    assert.match(sql, /ADD COLUMN IF NOT EXISTS cidr text/)
    // Non-destructive: no DROP of the existing key, no data rewrite.
    assert.doesNotMatch(sql, /DROP COLUMN/i)
    assert.doesNotMatch(sql, /DELETE FROM/i)
    assert.doesNotMatch(sql, /UPDATE public\.banned_ips\s+SET/i)
  })
})
