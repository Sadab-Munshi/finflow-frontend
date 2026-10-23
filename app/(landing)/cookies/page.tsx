import type { Metadata } from 'next'
import BackButton from '@/components/landing/BackButton'

export const metadata: Metadata = {
  title: {
    absolute: 'FinFlow / Cookie Policy',
  },
  description: 'Learn how FinFlow uses essential authentication and preference cookies to keep your session secure.',
  robots: { index: false, follow: false },
}

export default function CookiePolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <BackButton />

      <div className="mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
          Cookie Policy
        </h1>
        <p className="text-neutral-600">
          Effective Date: August 13, 2026
        </p>
      </div>

      <div className="prose prose-neutral max-w-none">
        <p className="text-lg text-neutral-700 leading-relaxed mb-8">
          FinFlow uses minimal, privacy-respecting cookies and browser storage strictly required to
          keep your account authenticated, remember your language preferences, and protect forms
          against automated abuse.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Essential Authentication Cookies
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            When you sign in to FinFlow, secure HTTP-only and session cookies maintain your
            authenticated session across page reloads so you do not need to re-enter your
            credentials on every screen. Disabling these cookies prevents account sign-in from
            functioning properly.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Preference &amp; Security Storage
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            FinFlow stores non-sensitive UI preferences such as your chosen display language
            (English, हिंदी, or বাংলা) and uses security verification tokens during login and
            registration to protect your account against unauthorized automated requests. We never
            use third-party advertising trackers or cross-site ad profiling cookies.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Managing Cookies &amp; Contact
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            You can clear or block cookies at any time through your browser settings, or sign out
            from Settings to clear active session tokens immediately. For questions regarding this
            Cookie Policy, contact{' '}
            <a
              href="mailto:contact@sadabmunshi.me"
              className="text-neutral-900 underline hover:no-underline"
            >
              contact@sadabmunshi.me
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-neutral-100">
        <BackButton />
      </div>
    </div>
  )
}
