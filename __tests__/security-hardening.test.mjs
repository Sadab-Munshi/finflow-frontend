import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

function loadTsModule(relPath) {
  const filePath = path.resolve(process.cwd(), relPath)
  const source = fs.readFileSync(filePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  })
  const moduleObj = { exports: {} }
  const fn = new Function('exports', 'module', 'require', transpiled.outputText)
  fn(moduleObj.exports, moduleObj, () => ({}))
  return moduleObj.exports
}

const security = loadTsModule('lib/security.ts')
const youpi = loadTsModule('lib/youpi-checkout.ts')

test('sanitizeInternalRedirect blocks open redirects and allows internal paths (HIGH-01)', () => {
  assert.equal(security.sanitizeInternalRedirect('/dashboard'), '/dashboard')
  assert.equal(
    security.sanitizeInternalRedirect('/subscription?payment=return&orderId=ord_123'),
    '/subscription?payment=return&orderId=ord_123'
  )
  assert.equal(security.sanitizeInternalRedirect('//evil.com'), '/dashboard')
  assert.equal(security.sanitizeInternalRedirect('/\\evil.com'), '/dashboard')
  assert.equal(security.sanitizeInternalRedirect('https://evil.com/phish'), '/dashboard')
  assert.equal(security.sanitizeInternalRedirect('javascript:alert(1)'), '/dashboard')
  assert.equal(security.sanitizeInternalRedirect(undefined, ''), '')
})

test('validateAvatarFile blocks SVG/HTML/oversized files and allows JPEG/PNG/WebP (HIGH-02)', () => {
  assert.deepEqual(
    security.validateAvatarFile({ name: 'avatar.png', type: 'image/png', size: 120_000 }),
    { valid: true, ext: 'png', contentType: 'image/png' }
  )
  assert.equal(
    security.validateAvatarFile({ name: 'xss.svg', type: 'image/svg+xml', size: 1024 }).valid,
    false
  )
  assert.equal(
    security.validateAvatarFile({ name: 'xss.svg', type: 'image/png', size: 1024 }).valid,
    false
  )
  assert.equal(
    security.validateAvatarFile({
      name: 'huge.png',
      type: 'image/png',
      size: security.MAX_AVATAR_SIZE_BYTES + 1,
    }).valid,
    false
  )
})

test('sanitizeCsvCell neutralizes CSV formula injection triggers (MED-02)', () => {
  assert.equal(security.sanitizeCsvCell("=CMD|' /C calc'!A0"), "'=CMD|' /C calc'!A0")
  assert.equal(security.sanitizeCsvCell('+SUM(A1:A10)'), "'+SUM(A1:A10)")
  assert.equal(security.sanitizeCsvCell('-100+200'), "'-100+200")
  assert.equal(security.sanitizeCsvCell('@IMPORTXML(...)'), "'@IMPORTXML(...)")
  assert.equal(security.sanitizeCsvCell(-450.5), '-450.5')
})

test('resolvePortalOrigin and normalizeCheckoutUrl enforce HTTPS allowlist (MED-05)', () => {
  assert.equal(
    youpi.resolvePortalOrigin('https://evil.example.com/youpi.js'),
    'https://pay.sadabmunshi.me'
  )
  assert.equal(
    youpi.normalizeCheckoutUrl(
      'https://evil.example.com/checkout/pay_123',
      'pay_123',
      'https://evil.example.com/youpi.js'
    ),
    'https://pay.sadabmunshi.me/checkout/pay_123'
  )
})
