/**
 * Guards for two regressions that are easy to reintroduce:
 *
 *  1. Admin terminology leaking back into the user-facing bootstrap payload.
 *     `isSuperAdmin` was removed deliberately: the user app has no use for it,
 *     and a payload with zero admin fields cannot be mined for privilege
 *     information.
 *
 *  2. The Vercel relay sending the wrong client IP. Vercel prepends the real
 *     peer and appends its own infrastructure hops, so index 0 is the client
 *     and the LAST entry is the datacentre. Reading the tail made every
 *     request look like it came from the Mumbai edge.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'

const RELAY = 'app/api/[...path]/route.ts'
const API_CLIENT = 'lib/api-client.ts'
const GATE = 'context/SubscriptionGateContext.tsx'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

function stripComments(src) {
  // Line comments first: a glob such as `app/*​/loading.tsx` inside a comment
  // otherwise opens a phantom block comment.
  return src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

test('the bootstrap payload carries no admin fields', async (t) => {
  await t.test('the client type does not declare isSuperAdmin', () => {
    const src = stripComments(read(API_CLIENT))
    assert.doesNotMatch(src, /isSuperAdmin/, 'isSuperAdmin reappeared in BootstrapPayload')
  })

  await t.test('the gate context does not expose it', () => {
    const src = stripComments(read(GATE))
    assert.doesNotMatch(src, /isSuperAdmin/, 'isSuperAdmin reappeared in the gate context')
  })

  await t.test('nothing in the app reads it', () => {
    // Broader sweep: the whole client tree.
    const roots = ['app', 'components', 'context', 'hooks', 'lib']
    const hits = []
    const walk = (dir) => {
      for (const entry of readdirSync(new URL(`../${dir}/`, import.meta.url))) {
        const rel = `${dir}/${entry}`
        const st = statSync(new URL(`../${rel}`, import.meta.url))
        if (st.isDirectory()) walk(rel)
        else if (/\.(ts|tsx)$/.test(entry)) {
          if (/isSuperAdmin/.test(read(rel))) hits.push(rel)
        }
      }
    }
    for (const r of roots) walk(r)
    assert.deepEqual(hits, [], `isSuperAdmin still referenced in: ${hits.join(', ')}`)
  })
})

test('the Vercel relay forwards the ORIGINAL client IP', async (t) => {
  const src = stripComments(read(RELAY))

  await t.test('x-forwarded-for is parsed from index 0, never the tail', () => {
    assert.doesNotMatch(
      src,
      /parts\[parts\.length\s*-\s*1\]/,
      'reading the last hop logs Vercel edge IPs instead of the user'
    )
    assert.match(src, /parts\[0\]/, 'index 0 is the original client')
  })

  await t.test('the header is read before x-real-ip', () => {
    const xff = src.indexOf("headers.get('x-forwarded-for')")
    const real = src.indexOf("headers.get('x-real-ip')")
    assert.ok(xff > -1, 'x-forwarded-for is no longer read')
    assert.ok(real > -1, 'the x-real-ip fallback was dropped')
    assert.ok(
      xff < real,
      'x-forwarded-for must be consulted first — Vercel puts the client at index 0'
    )
  })

  await t.test('empty segments are filtered out', () => {
    assert.match(src, /\.filter\(Boolean\)/, 'an empty header segment would yield an empty string')
  })
})
