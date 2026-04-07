import type { Metadata } from 'next'
import BackButton from '@/components/landing/BackButton'

export const metadata: Metadata = {
  title: 'FinFlow / Privacy Policy',
  description: 'Read the FinFlow privacy policy. Your financial data is encrypted and never sold or shared.',
  robots: { index: false, follow: false },
}

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">

      {/* ── back button ── */}
      <BackButton />

      <div className="mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
          Privacy Policy
        </h1>
        <p className="text-neutral-600">
          Effective Date: March 26, 2026
        </p>
      </div>

      <div className="prose prose-neutral max-w-none">
        <p className="text-lg text-neutral-700 leading-relaxed mb-8">
          At FinFlow, we believe your financial data belongs to you. This Privacy Policy explains 
          what information we collect, how we use it, and the rights you have over your data.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            What We Collect
          </h2>
          <div className="space-y-4 text-neutral-700 leading-relaxed">
            <p>
              <strong>Account Information:</strong> When you create an account, we collect your 
              email address and authentication credentials. This is necessary to provide 
              secure access to your account across devices.
            </p>
            <p>
              <strong>Financial Data:</strong> The transactions, budgets, and financial information 
              you enter into FinFlow are stored securely on our cloud infrastructure using 
              industry-standard encryption. Your data is protected both in transit (TLS/SSL) 
              and at rest.
            </p>
            <p>
              <strong>Usage Data:</strong> We collect anonymous, aggregated information about how 
              you interact with FinFlow — such as feature usage frequency — to help us improve 
              the product. This data never includes your personal financial details.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            AI Features
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            When you use AI-powered features such as receipt scanning, voice transcription, or 
            financial insights, certain data is processed by our AI service providers. This may 
            include receipt images, voice recordings, or transaction descriptions. We transmit 
            only the minimum data necessary, and we partner exclusively with providers who 
            maintain strict confidentiality and data-protection standards. Your data is never 
            used to train third-party AI models without your explicit consent.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            How We Use Your Data
          </h2>
          <div className="space-y-4 text-neutral-700 leading-relaxed">
            <p>
              <strong>To Provide Services:</strong> We use your data to operate FinFlow, 
              process your transactions, generate reports, deliver budget alerts, and 
              power the features you request.
            </p>
            <p>
              <strong>To Improve Our Services:</strong> We analyse anonymous usage patterns 
              to understand how our platform is used and to make meaningful improvements.
            </p>
            <p>
              <strong>To Communicate With You:</strong> We may send you service-related 
              notifications, security alerts, monthly reports, and occasional updates about 
              new features. You can opt out of non-essential communications at any time 
              from Settings.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Data Security
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            We take the security of your data seriously. All information is encrypted in 
            transit using TLS/SSL and encrypted at rest on our secure cloud infrastructure. 
            Access controls, regular security audits, and monitoring help ensure that your 
            data remains protected at all times.
          </p>
          <p className="text-neutral-700 leading-relaxed mt-4">
            While we implement robust safeguards, no security system is completely 
            impenetrable. We encourage you to use a strong, unique password and to keep 
            your devices secure.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Data Sharing &amp; Third Parties
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            We do not sell, rent, or share your personal financial data with any third party 
            for marketing or advertising purposes. Data may be shared only with service 
            providers that are strictly necessary to operate FinFlow (e.g., AI processing, 
            email delivery), and only under binding confidentiality agreements.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Your Rights
          </h2>
          <div className="space-y-4 text-neutral-700 leading-relaxed">
            <p>
              <strong>Access &amp; Export:</strong> You can access all your data at any time 
              through the web app. Export functionality lets you download your financial 
              data in standard formats.
            </p>
            <p>
              <strong>Correction:</strong> You can edit or correct any information you have 
              entered into FinFlow at any time.
            </p>
            <p>
              <strong>Deletion:</strong> You can delete your account and all associated data 
              at any time from Settings. Once deleted, your data cannot be recovered.
            </p>
            <p>
              <strong>Portability:</strong> You can request a complete copy of your data in 
              a machine-readable format at any time via the Reports section.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Changes to This Policy
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            We may update this Privacy Policy from time to time to reflect changes in our 
            practices or for legal compliance. If we make significant changes, we will notify 
            you through the app or by email. The updated policy will always be available 
            on this page with the effective date clearly displayed.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Contact
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            If you have any questions about this Privacy Policy or how we handle your data, 
            please contact us at{' '}
            <a
              href="mailto:contact@sadabmunshi.online"
              className="text-neutral-900 underline hover:no-underline"
            >
              contact@sadabmunshi.online
            </a>
            . We are committed to addressing your concerns promptly.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-neutral-100">
        <BackButton />
      </div>
    </div>
  )
}
