/**
 * Regression guard for "a banned IP keeps the user stuck in a broken app".
 *
 * Supabase Auth knows nothing about the backend blocklists, so a banned user
 * signs in perfectly well and then watches every request fail with no message
 * and no way out. The API client is the single place that can catch this: 36
 * exported functions funnel through `request()`, and `UserContext` only makes
 * one call of its own.
 *
 * The danger in the other direction is worse than the bug: `403` is used by the
 * API for tier gating (`UPGRADE_REQUIRED`), disabled features
 * (`FEATURE_DISABLED`), a missing proxy secret, admin/role failures, disabled
 * payments and order ownership. An interceptor that treats any 403 as a ban
 * would sign ordinary free-tier users out mid-session.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const API = 'lib/api-client.ts'
const LOGIN = 'app/(auth)/login/LoginContent.tsx'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

/** Comments carry prose that would trip regexes — strip line comments first. */
function stripComments(src) {
  return src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

const api = stripComments(read(API))
const login = stripComments(read(LOGIN))

function fnBody(name) {
  const start = api.indexOf(`function ${name}`)
  assert.ok(start > -1, `could not locate ${name}`)
  const end = api.indexOf('\n}', start)
  assert.ok(end > start, `could not bound ${name}`)
  return api.slice(start, end)
}

function requestBody() {
  const start = api.indexOf('async function request(')
  const end = api.indexOf('async function requestMultipart')
  assert.ok(start > -1 && end > start, 'could not bound request()')
  return api.slice(start, end)
}

function multipartBody() {
  const start = api.indexOf('async function requestMultipart')
  // Anchor on real code, not a comment: stripComments() has already removed
  // the banner comment that separates this helper from the bootstrap API.
  const end = api.indexOf('export interface BootstrapPayload')
  assert.ok(start > -1 && end > start, 'could not bound requestMultipart()')
  return api.slice(start, end)
}

test('the ban match is narrow, not "any 403"', async (t) => {
  await t.test('only a 403 can be a ban', () => {
    const detect = fnBody('detectBan')
    assert.match(detect, /if \(status !== 403\) return null/)
  })

  await t.test('codes are checked before messages', () => {
    const detect = fnBody('detectBan')
    const ipCode = detect.indexOf("'IP_BANNED'")
    const ipMsg = detect.indexOf('BAN_MESSAGE_IP')
    assert.ok(ipCode > -1, 'IP_BANNED code must be recognised')
    assert.ok(ipMsg > -1, 'message fallback must survive')
    assert.ok(ipCode < ipMsg, 'code wins over the fallback')
  })

  await t.test('the backend contract strings are exact and distinct', () => {
    assert.match(api, /const BAN_MESSAGE_IP = 'IP address is banned'/)
    assert.match(api, /const BAN_MESSAGE_ACCOUNT = 'Account is banned'/)
  })

  await t.test('no substring matching on "banned"', () => {
    // `includes('banned')` would make "Account is banned" satisfy an IP check
    // and would also match any future message that merely mentions the word.
    assert.doesNotMatch(api, /includes\(\s*'banned'/)
    assert.doesNotMatch(api, /match\(\s*\/banned/)
  })

  await t.test('tier gating and feature blocks are not bans', () => {
    const detect = fnBody('detectBan')
    assert.doesNotMatch(detect, /UPGRADE_REQUIRED/, 'a free user hitting a Pro feature must stay signed in')
    assert.doesNotMatch(detect, /FEATURE_DISABLED/)
    assert.doesNotMatch(detect, /requiredTier/)
  })
})

test('a ban evicts the user completely', async (t) => {
  await t.test('sign-out is local-scoped', () => {
    const body = fnBody('evictBannedUser')
    assert.match(body, /auth\.signOut\(\{ scope: 'local' \}\)/)
  })

  await t.test('the exit is a hard replace to the login screen', () => {
    const body = fnBody('evictBannedUser')
    assert.match(body, /window\.location\.replace\(/, 'a full navigation drops all in-memory state')
    assert.doesNotMatch(body, /router\.push|router\.replace/, 'the App Router would preserve state')
  })

  await t.test('each ban reason lands on its own message', () => {
    const body = fnBody('evictBannedUser')
    assert.match(body, /'\/login\?error=ip_banned'/)
    assert.match(body, /'\/login\?banned=true'/, 'account bans reuse the existing banner')
  })

  await t.test('concurrent requests cannot race the redirect', () => {
    assert.match(api, /let banRedirectInFlight = false/)
    const body = fnBody('evictBannedUser')
    assert.match(body, /if \(banRedirectInFlight\) return/)
    assert.match(body, /banRedirectInFlight = true/)
  })

  await t.test('the eviction is safe during server rendering', () => {
    const body = fnBody('evictBannedUser')
    assert.match(body, /typeof window === 'undefined'/)
  })

  await t.test('a failing sign-out still redirects', () => {
    const body = fnBody('evictBannedUser')
    assert.match(body, /try \{[\s\S]*catch \{[\s\S]*\}/, 'sign-out is best effort')
  })
})

test('every transport runs the interceptor', async (t) => {
  await t.test('request() checks the response', () => {
    const body = requestBody()
    assert.match(body, /const ban = detectBan\(res\.status, error\)/)
    assert.match(body, /if \(ban\) \{[\s\S]*evictBannedUser\(ban\)/)
  })

  await t.test('requestMultipart() checks too — uploads are not a hole', () => {
    const body = multipartBody()
    assert.match(body, /const ban = detectBan\(res\.status, error\)/)
    assert.match(body, /evictBannedUser\(ban\)/)
  })

  await t.test('requestMultipart() exposes status, like the JSON helper', () => {
    // It used to throw a bare Error, so callers could not tell a 403 from a 413.
    const body = multipartBody()
    assert.match(body, /Object\.assign\(err, \{ status: res\.status, code: error\.code \}\)/)
  })

  await t.test('the rejection still reaches the caller', () => {
    // Eviction must not swallow the error: callers rely on the rejection to
    // stop their own state updates.
    assert.match(requestBody(), /throw err/)
    assert.match(multipartBody(), /throw err/)
  })
})

test('the login page explains the IP ban', async (t) => {
  await t.test('it reads error=ip_banned', () => {
    assert.match(login, /searchParams\.get\('error'\) === 'ip_banned'/)
  })

  await t.test('it shows the exact required sentence in a red banner', () => {
    assert.match(
      login,
      /Access Denied: Your IP address has been banned by the administrator\./
    )
    assert.match(login, /text-rose-600/, 'the message is red')
    assert.match(login, /role="alert"/, 'the message is announced')
  })

  await t.test('the existing banners are untouched', () => {
    assert.match(login, /Email confirmed\. Please sign in to continue\./)
    assert.match(login, /Your account has been suspended\. Please contact support for assistance\./)
    assert.match(login, /searchParams\.get\('banned'\)/)
  })
})
