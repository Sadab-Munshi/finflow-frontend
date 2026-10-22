import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

test('Add Transaction tabs UI redesign — Scan, Voice, NLP & i18n integrity', async (t) => {
  await t.test('ScanTab has clean viewfinder + side-by-side Open Camera & Upload File actions without duplicate clutter', () => {
    const scanSrc = read('app/add/components/ScanTab.tsx')
    assert.match(scanSrc, /gridTemplateColumns:\s*'1fr 1fr'/, 'Scan actions must be arranged side-by-side in 2 equal columns')
    assert.match(scanSrc, /t\('openCamera'\)/, 'Left button renders Open Camera')
    assert.match(scanSrc, /t\('uploadFile'\)/, 'Right button renders Upload File')
    assert.match(scanSrc, /capture="environment"/, 'Camera input captures rear camera on mobile')
    assert.match(scanSrc, /accept="image\/\*,\.pdf,application\/pdf/, 'Unified Upload File input accepts both images and PDF documents')
    assert.doesNotMatch(scanSrc, /Upload PDF Bill/, 'Duplicate separate orange Upload PDF Bill card removed')
    assert.doesNotMatch(scanSrc, /Supported Formats/, 'Redundant 3-card Supported Formats box removed')
  })

  await t.test('VoiceTab includes tactile teal mic button, visible timer, waveform, Cancel & Done controls, and example phrases', () => {
    const voiceSrc = read('app/add/components/VoiceTab.tsx')
    assert.match(voiceSrc, /MAX_RECORDING_SECONDS/, 'Enforces max recording window with visible timer')
    assert.match(voiceSrc, /handleVoiceCancel/, 'Supports explicit Cancel without sending unwanted audio')
    assert.match(voiceSrc, /handleVoiceStop/, 'Supports explicit Stop & Parse control')
    assert.match(voiceSrc, /t\('voiceTrySaying'\)/, 'Renders Try Saying example prompts')
    assert.match(voiceSrc, /t\('tryAgain'\)/, 'Renders 1-tap Try Again button on error')
  })

  await t.test('NLPTab includes Smart Text Entry card, Clear button, keyboard shortcut, and 1-tap Quick Examples', () => {
    const nlpSrc = read('app/add/components/NLPTab.tsx')
    assert.match(nlpSrc, /t\('nlpCardTitle'\)/, 'Renders Smart Text Entry header')
    assert.match(nlpSrc, /t\('clear'\)/, 'Renders Clear input action when text is entered')
    assert.match(nlpSrc, /e\.metaKey \|\| e\.ctrlKey/, 'Supports Cmd/Ctrl + Enter keyboard shortcut')
    assert.match(nlpSrc, /t\('quickExamples'\)/, 'Renders 1-tap Quick Examples list')
  })

  await t.test('AddPage syncs activeTab dynamically when URL ?tab= query changes (fixes FAB speed-dial switching)', () => {
    const pageSrc = read('app/add/page.tsx')
    assert.match(pageSrc, /useEffect\(\(\)\s*=>\s*\{\s*setActiveTab\(urlTab\)/, 'Syncs tab state when searchParams changes')
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
