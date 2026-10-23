import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

test('Responsive Landing Page Refactor — Navigation, CTA Hierarchy, Touch Targets & Grid Alignment', async (t) => {
  const layoutSrc = read('app/(landing)/layout.tsx')
  const homeSrc = read('app/(landing)/HomeContent.tsx')
  const loopsSrc = read('components/landing/MotionLoops.tsx')

  await t.test('Header replaces hamburger with horizontal nav + anchored actions on tablet/desktop', () => {
    assert.match(layoutSrc, /aria-label="Primary navigation"/, 'Renders primary horizontal nav element')
    assert.match(layoutSrc, /Features/, 'Includes Features navigation link')
    assert.match(layoutSrc, /About Us/, 'Includes About Us navigation link')
    assert.match(layoutSrc, /flex md:hidden/, 'Hides mobile hamburger menu container from md breakpoint upwards')
  })

  await t.test('CTA hierarchy: text-only borderless Login on left + elevated arrow-free Start Tracking primary CTA', () => {
    assert.equal(homeSrc.includes('Get Started'), false, 'Replaced generic Get Started copy completely')
    assert.equal(homeSrc.includes('ArrowRight'), false, 'Removed right arrow icon from primary CTA buttons')
    assert.ok(homeSrc.includes('Start Tracking'), 'Uses punchy Start Tracking primary CTA copy')

    const loginIdx = homeSrc.indexOf('href="/login"')
    const signupIdx = homeSrc.indexOf('href="/signup"')
    assert.ok(loginIdx > 0 && signupIdx > loginIdx, 'Positions secondary Login link on the left side of main CTA button')
    assert.match(homeSrc, /bg-transparent border-0 shadow-none/, 'Login link has zero fill and zero border outline')
  })

  await t.test('Responsive layout: md 2-column hero grid, expanded desktop preview card, exact container alignment & >=48px touch targets', () => {
    assert.match(homeSrc, /grid grid-cols-1 md:grid-cols-12/, 'Transitions hero into balanced 2-column grid at tablet md breakpoint')
    assert.match(loopsSrc, /max-w-md md:max-w-none/, 'Removes narrow max-w-md cap on tablet/desktop preview card')
    assert.match(loopsSrc, /min-w-\[48px\] min-h-\[48px\]/, 'Hero switcher buttons meet minimum 48px touch target')

    const containerMatches = homeSrc.match(/max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8/g) || []
    assert.equal(
      containerMatches.length,
      3,
      'Hero, Features capability cards, and How It Works use identical aligned container widths'
    )
  })
})
