import type { Metadata } from 'next'
import BackButton from '@/components/landing/BackButton'

export const metadata: Metadata = {
  title: {
    absolute: 'FinFlow / Privacy Policy',
  },
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
          Effective Date: August 13, 2026
        </p>
      </div>

      <div className="prose prose-neutral max-w-none">
        <p className="text-lg text-neutral-700 leading-relaxed mb-8">
          At FinFlow, we believe your financial data belongs to you. This Privacy Policy explains
          what information we collect, how we use it, and the rights you have over your data.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Statutory Framework &amp; Key Definitions
          </h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            This Privacy Policy is framed in compliance with the{' '}
            <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> of India.
            For the purposes of this Policy:
          </p>
          <div className="space-y-4 text-neutral-700 leading-relaxed">
            <p>
              <strong>Data Principal:</strong> Refers to you, the individual user accessing
              FinFlow and sharing personal data.
            </p>
            <p>
              <strong>Data Fiduciary:</strong> Refers to FinFlow (operated by Sadab Munshi),
              which determines the purpose and means of processing your personal data.
            </p>
            <p>
              <strong>Data Processor:</strong> Refers to trusted third-party service providers
              (e.g., cloud hosts, AI processors, communication gateways) who process personal
              data strictly on behalf of FinFlow.
            </p>
          </div>
        </section>

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
            financial insights, certain data is processed by our AI service providers acting as
            Data Processors. This may include receipt images, voice recordings, or transaction
            descriptions. We transmit only the minimum data necessary, and we partner exclusively
            with providers who maintain strict confidentiality and data-protection standards.
            Your data is never used to train third-party AI models without your explicit consent.
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
            for marketing or advertising purposes. Data may be shared only with Data Processors
            that are strictly necessary to operate FinFlow (e.g., AI processing, email delivery),
            and only under binding confidentiality agreements.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Your Statutory Rights as a Data Principal
          </h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            Under the DPDP Act, 2023, you hold specific statutory rights regarding your
            personal financial data:
          </p>
          <div className="space-y-4 text-neutral-700 leading-relaxed">
            <p>
              <strong>Right to Access &amp; Information (Sec 11):</strong> You can request a
              summary of the personal data being processed by FinFlow, the processing
              activities undertaken, and the identities of all Data Processors with whom
              your data has been shared. You can also access and export your data at any
              time through the web app.
            </p>
            <p>
              <strong>Right to Correction &amp; Erasure (Sec 12):</strong> You can edit or
              correct inaccurate data directly within the app. You also have the right to
              request complete erasure of your personal data when the processing purpose is
              completed or upon withdrawal of consent. Account deletion permanently removes
              associated data from our systems.
            </p>
            <p>
              <strong>Right to Withdraw Consent (Sec 6(4)):</strong> You may withdraw your
              consent for data processing at any time through Account Settings. The ease of
              withdrawing consent is equivalent to giving consent. Withdrawal does not affect
              the lawfulness of processing carried out prior to withdrawal.
            </p>
            <p>
              <strong>Right to Nominate (Sec 14):</strong> You have the right to nominate
              another individual who shall, in the event of your death or incapacity, exercise
              your rights as a Data Principal.
            </p>
            <p>
              <strong>Right to Grievance Redressal (Sec 13):</strong> You have the right to
              seek redressal of any grievances regarding your personal data directly through
              our Grievance Officer and subsequently appeal to the Data Protection Board of
              India (DPBI).
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Personal Data Breach Protocol
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            In the event of a personal data breach affecting your information, FinFlow will
            notify the Data Protection Board of India (DPBI) and each affected Data Principal
            without undue delay, detailing the nature of the breach, potential impact, and
            remedial measures undertaken (Sec 8(6)).
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Multilingual Consent Notice
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            In accordance with Section 5(1) of the DPDP Act, this Privacy Policy and consent
            notices are available in English. You may request a copy of this notice or consent
            options in any of the 22 languages specified in the Eighth Schedule to the
            Constitution of India by contacting our Grievance Officer.
          </p>
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
            Grievance Redressal &amp; Data Protection Officer
          </h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            In compliance with Section 8(10) and Section 13 of the DPDP Act, 2023, FinFlow
            has appointed a Grievance Officer to handle all data protection inquiries,
            requests, and grievances.
          </p>
          <div className="space-y-2 text-neutral-700 leading-relaxed mb-6">
            <p>
              <strong>Designation:</strong> Data Protection &amp; Grievance Officer
            </p>
            <p>
              <strong>Email:</strong>{' '}
              <a
                href="mailto:contact@sadabmunshi.me"
                className="text-neutral-900 underline hover:no-underline"
              >
                contact@sadabmunshi.me
              </a>
            </p>
            <p>
              <strong>Response Timeline:</strong> All grievances will be acknowledged within
              48 hours and resolved within 30 days of receipt.
            </p>
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-3">
            Appeal to the Data Protection Board of India (DPBI)
          </h3>
          <p className="text-neutral-700 leading-relaxed">
            If you do not receive a response within 30 days or are dissatisfied with the
            resolution provided by our Grievance Officer, you have the statutory right to
            register a complaint with the <strong>Data Protection Board of India (DPBI)</strong>{' '}
            in accordance with the provisions of the DPDP Act.
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
              href="mailto:contact@sadabmunshi.me"
              className="text-neutral-900 underline hover:no-underline"
            >
              contact@sadabmunshi.me
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
