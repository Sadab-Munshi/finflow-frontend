import type { Metadata } from 'next'
import BackButton from '@/components/landing/BackButton'

export const metadata: Metadata = {
  title: {
    absolute: 'FinFlow | Terms of Service',
  },
}

export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">

      {/* ── back button ── */}
      <BackButton />

      <div className="mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
          Terms of Service
        </h1>
        <p className="text-neutral-600">
          Effective Date: August 13, 2026
        </p>
      </div>

      <div className="prose prose-neutral max-w-none">
        <p className="text-lg text-neutral-700 leading-relaxed mb-8">
          Please read these Terms of Service carefully before using FinFlow. By accessing
          or using our service, you agree to be bound by these terms.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Acceptance of Terms &amp; Consent
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            By creating an account or using FinFlow, you agree to be bound by these Terms of
            Service.
          </p>
          <p className="text-neutral-700 leading-relaxed mt-4">
            <strong>Unbundled Privacy Consent:</strong> Processing of your personal data (such
            as transaction logs, receipt scans, and voice inputs) is governed separately by our{' '}
            <a href="/privacy" className="text-neutral-900 underline hover:no-underline">
              Privacy Policy
            </a>
            . Your agreement to these Terms of Service does not automatically imply consent
            for data processing; explicit, affirmative consent for personal data collection
            is obtained separately during onboarding or feature usage.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Age Requirement &amp; Protection of Minors
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            You must be at least 18 years of age to register for and use FinFlow. In
            compliance with Section 9 of the DPDP Act, 2023, FinFlow does not knowingly
            collect, process, or track personal data belonging to children (individuals
            under 18 years of age) or persons with disability under guardianship without
            verifiable parental or legal guardian consent.
          </p>
          <p className="text-neutral-700 leading-relaxed mt-4">
            If we learn that we have inadvertently collected data from a child under 18
            without verified parental consent, we will permanently delete that data
            immediately.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Description of Service
          </h2>
          <div className="space-y-4 text-neutral-700 leading-relaxed">
            <p>
              FinFlow provides tools for personal financial tracking and management, including
              transaction recording, budget monitoring, automated monthly reports, receipt
              scanning, voice-based input, and AI-powered financial insights. The service is
              accessible via our web application at app.sadabmunshi.me, with optional
              integration through WhatsApp and Telegram bots.
            </p>
            <p>
              You are responsible for maintaining the confidentiality of your account
              credentials and for all activity that occurs under your account. You agree
              to notify us immediately of any unauthorised access or use.
            </p>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of the
              service at any time. We will make reasonable efforts to notify you of
              significant changes that may affect your use of the platform.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            AI Features &amp; Third-Party Processors
          </h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            FinFlow utilizes third-party AI technologies (acting as Data Processors under
            the DPDP Act) for automated receipt scanning, voice transcription, and financial
            insights.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-neutral-700 leading-relaxed">
            <li>
              AI features process data strictly to fulfill user requests and under
              contractually binding confidentiality agreements.
            </li>
            <li>
              AI processing outputs are provided for informational tracking only and do not
              constitute certified financial advice.
            </li>
          </ul>
          <p className="text-neutral-700 leading-relaxed mt-4">
            While we strive for accuracy, AI-generated content may contain errors. You are
            solely responsible for reviewing and verifying all AI-generated information
            before relying on it.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Your Data &amp; Ownership
          </h2>
          <div className="space-y-4 text-neutral-700 leading-relaxed">
            <p>
              You retain full ownership of all data you enter into FinFlow. We do not claim
              any ownership rights over your financial information. FinFlow acts as a Data
              Fiduciary under the DPDP Act, 2023, and processes your personal data as a
              Data Principal only for the purposes described in our Privacy Policy.
            </p>
            <p>
              You are responsible for the accuracy and completeness of the data you provide.
              FinFlow relies on the information you enter to generate insights, reports, and
              alerts — accurate input is essential for meaningful output.
            </p>
            <p>
              We encourage you to regularly export your data using the built-in export
              features. While we implement robust safeguards, maintaining your own backups
              of important financial records is always recommended.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Prohibited Use
          </h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            You agree not to use FinFlow for any unlawful purpose or in any way that could
            damage, disable, or overburden the service. Specifically, you may not:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-neutral-700 leading-relaxed">
            <li>Use the service for any illegal activities or to facilitate illegal transactions</li>
            <li>Attempt to gain unauthorised access to any part of the service or its systems</li>
            <li>Interfere with or disrupt the integrity or performance of the platform</li>
            <li>Reverse-engineer, decompile, or attempt to extract the source code of our software</li>
            <li>Use automated systems or bots to scrape data from FinFlow without express permission</li>
            <li>Upload or transmit any viruses, malware, or other harmful code</li>
            <li>Impersonate another person or misrepresent your affiliation with any entity</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Account Termination
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            You may terminate your account at any time by navigating to Settings and selecting
            Delete Account. Upon deletion, all your data is permanently removed from our
            systems and cannot be recovered. We reserve the right to suspend or terminate
            your account if you violate these Terms of Service or engage in fraudulent or
            harmful activities.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Changes to These Terms
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            We may update these Terms of Service from time to time. When we make significant
            changes, we will notify you through the app or by email. Your continued use of
            FinFlow after the updated terms take effect constitutes your acceptance. If you
            do not agree with the revised terms, you should discontinue use of the service.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Disclaimer &amp; Limitation of Liability
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            FinFlow is provided on an &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo; basis
            without warranties of any kind, whether express or implied. We do not guarantee
            that the service will be error-free, uninterrupted, or free from security
            vulnerabilities. To the maximum extent permitted by applicable law, we shall not
            be liable for any indirect, incidental, special, or consequential damages arising
            from your use of FinFlow, including but not limited to loss of profits, data,
            or other intangible losses.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Governing Law
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            These Terms of Service shall be governed by and construed in accordance with the
            laws of India. Any disputes arising out of or in connection with these terms shall
            be subject to the exclusive jurisdiction of the courts in India.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Contact
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            If you have any questions about these Terms of Service, please contact us at{' '}
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
