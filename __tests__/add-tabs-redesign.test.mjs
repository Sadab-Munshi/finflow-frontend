import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

test('Add Transaction tabs UI redesign — Scan, Voice, NLP & i18n integrity', async (t) => {
  await t.test('ScanTab wires distinct actions: top box -> Gallery, left teal button -> Camera, right indigo button -> Upload File', () => {
    const scanSrc = read('app/add/components/ScanTab.tsx')
    const enAdd = JSON.parse(read('messages/en/add.json'))
    assert.match(scanSrc, /onClick=\{\(\) => galleryInputRef\.current\?\.click\(\)\}/, 'Top viewfinder box opens Photo Gallery directly')
    assert.match(scanSrc, /onClick=\{\(\) => cameraInputRef\.current\?\.click\(\)\}/, 'Left button opens rear Camera')
    assert.match(scanSrc, /onClick=\{\(\) => fileInputRef\.current\?\.click\(\)\}/, 'Right button opens Upload File picker')
    assert.match(scanSrc, /CAMERA_TEAL\s*=\s*'#0d9488'/, 'Open Camera button uses distinct Teal color')
    assert.match(scanSrc, /UPLOAD_INDIGO\s*=\s*'#4f46e5'/, 'Upload File button uses distinct Indigo color')
    assert.match(scanSrc, /whiteSpace:\s*'nowrap'/, 'Scan action labels stay single-line on narrow mobile viewports')
    assert.doesNotMatch(enAdd.scanSubtitle, /AI fills everything in seconds/i, 'Removed AI fills everything in seconds copy from Scan box')
  })

  await t.test('VoiceTab omits AI Voice Input · Up to 15s badge and displays 1 English, 1 Hindi, 1 Bengali example', () => {
    const voiceSrc = read('app/add/components/VoiceTab.tsx')
    assert.doesNotMatch(voiceSrc, /AI Voice Input · Up to 15s/, 'Removed AI Voice Input · Up to 15s badge')
    assert.match(voiceSrc, /lang:\s*'EN'/, 'Voice examples include English')
    assert.match(voiceSrc, /lang:\s*'हिन्दी'/, 'Voice examples include Hindi')
    assert.match(voiceSrc, /lang:\s*'বাংলা'/, 'Voice examples include Bengali')
  })

  await t.test('NLPTab uses clean minimal UI without generic Parse with AI text and displays 1 English, 1 Hindi, 1 Bengali example', () => {
    const nlpSrc = read('app/add/components/NLPTab.tsx')
    const enAdd = JSON.parse(read('messages/en/add.json'))
    assert.notEqual(enAdd.parseWithAI, 'Parse with AI', 'Replaced generic Parse with AI button label')
    assert.equal(enAdd.parseWithAI, 'Smart Add', 'Uses clean Smart Add CTA label')
    assert.match(nlpSrc, /lang:\s*'EN'/, 'NLP examples include English')
    assert.match(nlpSrc, /lang:\s*'हिन्दी'/, 'NLP examples include Hindi')
    assert.match(nlpSrc, /lang:\s*'বাংলা'/, 'NLP examples include Bengali')
  })

  await t.test('en, hi, and bn add.json message catalogs contain identical key sets with zero missing translations', () => {
    const en = JSON.parse(read('messages/en/add.json'))
    const hi = JSON.parse(read('messages/hi/add.json'))
    const bn = JSON.parse(read('messages/bn/add.json'))
    const enKeys = Object.keys(en).sort()
    assert.deepEqual(Object.keys(hi).sort(), enKeys, 'Hindi add.json keys match English')
    assert.deepEqual(Object.keys(bn).sort(), enKeys, 'Bengali add.json keys match English')
    for (const key of enKeys) {
      assert.ok(String(en[key]).trim().length > 0, `en.${key} is non-empty`)
      assert.ok(String(hi[key]).trim().length > 0, `hi.${key} is non-empty`)
      assert.ok(String(bn[key]).trim().length > 0, `bn.${key} is non-empty`)
    }
  })
})
