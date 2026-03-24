import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FinFlow | Privacy Policy',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
          Privacy Policy
        </h1>
        <p className="text-neutral-600">
          Effective Date: March 1, 2026
        </p>
      </div>

      <div className="prose prose-neutral max-w-none">
        <p className="text-lg text-neutral-700 leading-relaxed mb-8">
          At FinFlow, we believe your financial data belongs to you. This Privacy Policy explains 
          what information we collect, how we use it, and your rights regarding your data.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            What We Collect
          </h2>
          <div className="space-y-4 text-neutral-700 leading-relaxed">
            <p>
              <strong>Account Information:</strong> When you create an account, we collect your 
              email address and authentication information. This is necessary to provide you 
              with access to your account across devices.
            </p>
            <p>
              <strong>Financial Data:</strong> The transactions, budgets, and financial information 
              you enter into FinFlow are stored securely. By default, this data is stored locally 
              on your device unless you choose to enable cloud synchronization.
            </p>
            <p>
              <strong>Usage Data:</strong> We collect anonymous information about how you interact 
              with FinFlow, such as which features you use most. This helps us improve the app. 
              This data does not include your personal financial information.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            AI Features
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            When you use AI-powered features like receipt scanning, voice transcription, or 
            financial insights, certain data is processed by AI providers. This may include 
            receipt images, voice recordings, or transaction descriptions. We only send the 
            minimum data necessary, and we work with AI providers who maintain strict 
            confidentiality and data protection standards. Your data is not used to train 
            AI models without your explicit consent.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            How We Use Your Data
          </h2>
          <div className="space-y-4 text-neutral-700 leading-relaxed">
            <p>
              <strong>To Provide Services:</strong> We use your data to operate FinFlow, 
              process your transactions, generate reports, and deliver the features you request.
            </p>
            <p>
              <strong>To Improve Our Services:</strong> We analyze anonymous usage patterns 
              to understand how our app is used and to make improvements.
            </p>
            <p>
              <strong>To Communicate With You:</strong> We may send you service-related 
              notifications, security alerts, and occasional updates about new features. 
              You can opt out of non-essential communications at any time.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Data Security
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            We take the security of your data seriously. We use industry-standard encryption 
            to protect your information both in transit and at rest. Local data storage keeps 
            your financial information on your device, under your control. When you choose 
            cloud synchronization, your data is encrypted before being transmitted and stored 
            on secure servers.
          </p>
          <p className="text-neutral-700 leading-relaxed mt-4">
            While we strive to protect your data, no security system is completely impenetrable. 
            We encourage you to use strong passwords and keep your devices secure.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Your Rights
          </h2>
          <div className="space-y-4 text-neutral-700 leading-relaxed">
            <p>
              <strong>Access and Export:</strong> You can access all your data at any time 
              through the app. We also provide export functionality so you can download 
              your financial data in standard formats.
            </p>
            <p>
              <strong>Correction:</strong> You can edit or correct any information you have 
              entered into FinFlow at any time.
            </p>
            <p>
              <strong>Deletion:</strong> You can delete your account and all associated data 
              at any time. Once deleted, your data cannot be recovered.
            </p>
            <p>
              <strong>Control:</strong> You choose whether to store data locally only or 
              enable cloud synchronization. You can change this setting at any time.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Changes to This Policy
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            We may update this Privacy Policy from time to time to reflect changes in our 
            practices or for legal reasons. If we make significant changes, we will notify 
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
            . We are committed to addressing your concerns and will respond as quickly as possible.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-neutral-100">
        <Link
          href="/"
          className="text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
