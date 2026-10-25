import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const exists = rel => fs.existsSync(path.join(ROOT, rel))

const PROXY = 'app/api/[...path]/route.ts'
const CLIENT = 'lib/api-client.ts'
const ANALYTICS = 'lib/analytics-api.ts'
const BASE = 'lib/api-base.ts'
const COMPRESS = 'lib/image-compress.ts'
const MIDDLEWARE = 'middleware.ts'

function sourceFiles(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(entry => {
    const rel = `${dir}/${entry.name}`
    if (entry.isDirectory()) return sourceFiles(rel)
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : []
  })
}

test('backend proxy contract', async t => {
  await t.test('the relay route exists and covers every verb the app uses', () => {
    assert.ok(exists(PROXY), 'app/api/[...path]/route.ts is missing')
    const src = read(PROXY)
    for (const verb of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
      assert.match(src, new RegExp(`export (async function|const) ${verb}`), `${verb} handler missing`)
    }
  })

  await t.test('the relay never runs in the Edge runtime (needs Buffer/streams parity)', () => {
    assert.match(read(PROXY), /export const runtime = 'nodejs'/)
  })

  await t.test('the secret header is written server-side and cannot be forged by a client', () => {
    const src = read(PROXY)
    assert.match(src, /'X-Finflow-Proxy-Secret'/, 'header name changed')
    assert.match(src, /process\.env\.FINFLOW_PROXY_SECRET/, 'secret read from a server-only var')
    // A client-supplied value must be dropped before the real one is set.
    assert.match(src, /headers\.delete\('x-finflow-proxy-secret'\)/, 'client-supplied secret not cleared')
    assert.ok(
      src.indexOf("headers.delete('x-finflow-proxy-secret')") < src.indexOf("headers.set('X-Finflow-Proxy-Secret'"),
      'delete must precede set'
    )
  })

  await t.test('the secret is never exposed through a NEXT_PUBLIC_ variable', () => {
    for (const file of [PROXY, BASE, CLIENT, ANALYTICS, COMPRESS]) {
      assert.doesNotMatch(read(file), /NEXT_PUBLIC_[A-Z_]*PROXY/, `${file} leaks the secret to the bundle`)
      assert.doesNotMatch(read(file), /NEXT_PUBLIC_[A-Z_]*SECRET/, `${file} leaks a secret to the bundle`)
    }
  })

  await t.test('cookies are not forwarded to the backend', () => {
    const src = read(PROXY)
    assert.doesNotMatch(src, /headers\.set\(['"]cookie/i, 'proxy forwards cookies')
    assert.doesNotMatch(src, /'cookie',/i, 'cookie added to the forward list')
  })

  await t.test('a single client IP is forwarded so rate-limit buckets stay per-user', () => {
    const src = read(PROXY)
    assert.match(src, /X-Forwarded-For/, 'no X-Forwarded-For handling')
    // Trust x-real-ip first: Vercel sets it and a client cannot spoof it.
    assert.match(src, /x-real-ip/)
  })

  await t.test('the body cap stays under the platform limit', () => {
    const src = read(PROXY)
    const m = src.match(/MAX_BODY_BYTES = (\d+) \* 1024 \* 1024/)
    assert.ok(m, 'MAX_BODY_BYTES not found')
    assert.ok(Number(m[1]) <= 4, `${m[1]} MB is too close to Vercel's ~4.5 MB cap`)
    assert.match(src, /413/, 'oversize bodies must return 413')
  })

  await t.test('hop-by-hop and stale entity headers are not forwarded', () => {
    const src = read(PROXY)
    for (const h of ['transfer-encoding', 'connection', 'content-encoding', 'content-length']) {
      assert.ok(src.includes(`'${h}'`), `${h} not handled`)
    }
  })

  await t.test('upstream redirects are rewritten off the backend origin', () => {
    assert.match(read(PROXY), /location/i, 'no Location rewriting')
  })
})

test('client code cannot address the backend directly', async t => {
  await t.test('no client module reads a NEXT_PUBLIC_ backend URL', () => {
    for (const file of [CLIENT, ANALYTICS]) {
      const src = read(file)
      assert.doesNotMatch(src, /NEXT_PUBLIC_API_URL/, `${file} still inlines the backend URL into the bundle`)
    }
  })

  await t.test('every request goes through apiBase()', () => {
    for (const file of [CLIENT, ANALYTICS]) {
      const src = read(file)
      assert.match(src, /import \{ apiBase \} from '\.\/api-base'/, `${file} does not use the shared base`)
      assert.doesNotMatch(src, /['"`]https?:\/\/[^'"`]*['"`]\s*\+/, `${file} builds an absolute URL by hand`)
      const fetches = src.match(/fetch\(`\$\{apiBase\(\)\}/g) || []
      const allFetches = src.match(/fetch\(/g) || []
      assert.equal(fetches.length, allFetches.length, `${file} has a fetch() that bypasses apiBase()`)
    }
  })

  await t.test('the api client no longer logs the backend URL', () => {
    assert.doesNotMatch(read(CLIENT), /console\.log\(['"]\[api-client\]/, 'the leaky request logger is back')
  })

  await t.test('apiBase() is same-origin in the browser and absolute on the server', () => {
    const src = read(BASE)
    assert.match(src, /typeof window !== 'undefined'\) return ''/, 'browser branch must be same-origin')
    assert.match(src, /process\.env\.FINFLOW_API_ORIGIN/, 'server branch must use the server-only origin')
  })

  await t.test('no source file hardcodes the production backend host', () => {
    const offenders = []
    for (const dir of ['app', 'lib', 'components', 'context', 'hooks']) {
      if (!exists(dir)) continue
      for (const file of sourceFiles(dir)) {
        if (file.startsWith('app/api/')) continue // the relay may fall back to it
        if (/finflow-api\.sadabmunshi\.me/.test(read(file))) offenders.push(file)
      }
    }
    assert.deepEqual(offenders, [], `direct backend host in: ${offenders.join(', ')}`)
  })
})

test('proxy bypasses the session middleware', async t => {
  await t.test('/api is excluded from the middleware matcher', () => {
    const src = read(MIDDLEWARE)
    assert.ok(
      src.includes('(?!api/'),
      'api/ is not excluded from the matcher'
    )
  })
})

test('receipt uploads stay under the proxy body cap', async t => {
  await t.test('the upload budget leaves headroom below 4 MB', () => {
    const src = read(COMPRESS)
    const m = src.match(/MAX_UPLOAD_BYTES = (\d+) \* 1024 \* 1024/)
    assert.ok(m, 'MAX_UPLOAD_BYTES not defined')
    assert.ok(Number(m[1]) <= 3, 'the base64 budget must stay at or below 3 MB')
  })

  await t.test('compression walks a quality ladder until the payload fits', () => {
    const src = read(COMPRESS)
    assert.match(src, /LADDER/, 'no fallback ladder')
    assert.match(src, /for \(const rung of LADDER\)/, 'the ladder is not actually tried')
    assert.match(src, /base64ByteLength/, 'no byte measurement')
  })

  await t.test('base64ByteLength accounts for padding and data-URL prefixes', () => {
    const src = read(COMPRESS)
    assert.match(src, /padding/, 'padding not handled')
    assert.match(src, /indexOf\(','\)/, 'data-URL prefix not stripped')
  })

  await t.test('ScanTab uses the budgeted compressor, not its own copy', () => {
    const src = read('app/add/components/ScanTab.tsx')
    assert.match(src, /compressImageToBudget/, 'ScanTab does not use the shared compressor')
    assert.doesNotMatch(src, /function compressImage\(/, 'a duplicate local compressor is back')
  })

  await t.test('oversized PDFs are refused with a translated message', () => {
    const src = read('app/add/components/ScanTab.tsx')
    assert.match(src, /t\('fileTooLarge'\)/, 'PDF size failure is not user-facing')
    for (const loc of ['en', 'hi', 'bn']) {
      const dict = JSON.parse(read(`messages/${loc}/add.json`))
      assert.ok(dict.fileTooLarge, `messages/${loc}/add.json is missing fileTooLarge`)
    }
  })
})
