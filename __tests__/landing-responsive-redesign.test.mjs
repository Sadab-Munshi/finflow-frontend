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
  const blurTextSrc = read('components/landing/reactbits/BlurText.tsx')
  const countUpSrc = read('components/landing/reactbits/CountUpText.tsx')
  const rotatingSrc = read('components/landing/reactbits/RotatingText.tsx')

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

  await t.test('Pre-footer CTA & clean light Footer redesign invariants', () => {
    assert.equal(homeSrc.includes('—'), false, 'Removed all em-dashes from CTA and hero copy')
    assert.equal(homeSrc.includes('&mdash;'), false, 'No HTML entity em-dashes in HomeContent')
    assert.equal(layoutSrc.includes('#0B132B'), false, 'Removed old dark navy footer background')
    assert.match(
      layoutSrc,
      /<footer[^>]*bg-\[#F8FAFC\][^>]*border-t border-slate-200/,
      'Footer uses light off-white background with subtle top border'
    )
    assert.match(
      layoutSrc,
      /<span className="text-xl font-extrabold tracking-tight text-slate-950">\s*FinFlow\s*<\/span>/,
      'Footer renders high-contrast FinFlow wordmark typography'
    )
    assert.ok(
      layoutSrc.includes('Smart expense tracking built for effortless daily finances.'),
      'Footer uses concise single-line description under logo'
    )
    assert.ok(layoutSrc.includes('Cookie Policy'), 'Footer Legal navigation includes Cookie Policy')
    assert.ok(fs.existsSync(path.join(ROOT, 'app/(landing)/cookies/page.tsx')), 'Cookie Policy page route exists')
  })

  await t.test('Zero text-reveal or scroll-driven IntersectionObserver animations on landing page', () => {
    assert.equal(homeSrc.includes('BlurText'), false, 'Hero headline renders static text without BlurText')
    assert.equal(homeSrc.includes('RotatingText'), false, 'Hero tagline renders static text without RotatingText')
    for (const [name, src] of [
      ['layout.tsx', layoutSrc],
      ['HomeContent.tsx', homeSrc],
      ['MotionLoops.tsx', loopsSrc],
      ['BlurText.tsx', blurTextSrc],
      ['CountUpText.tsx', countUpSrc],
      ['RotatingText.tsx', rotatingSrc],
    ]) {
      assert.equal(src.includes('IntersectionObserver'), false, `${name} contains zero IntersectionObserver usage`)
      assert.equal(src.includes("addEventListener('scroll'"), false, `${name} contains zero scroll listeners`)
    }
  })
})
