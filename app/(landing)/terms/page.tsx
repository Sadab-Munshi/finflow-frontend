import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FinFlow | Terms of Service',
}

export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
          Terms of Service
        </h1>
        <p className="text-neutral-600">
          Effective Date: March 1, 2026
        </p>
      </div>

      <div className="prose prose-neutral max-w-none">
        <p className="text-lg text-neutral-700 leading-relaxed mb-8">
          Please read these Terms of Service carefully before using FinFlow. By accessing 
          or using our service, you agree to be bound by these terms.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Acceptance
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            By creating an account or using FinFlow, you agree to these Terms of Service 
            and our Privacy Policy. If you do not agree with any part of these terms, 
            you may not use our service. You must be at least 18 years old to use FinFlow. 
            By using our service, you represent that you meet this age requirement.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Use of Service
          </h2>
          <div className="space-y-4 text-neutral-700 leading-relaxed">
            <p>
              FinFlow provides tools for personal financial tracking and management. 
              Our service includes features for recording transactions, tracking budgets, 
              generating reports, and receiving AI-powered insights about your finances.
            </p>
            <p>
              You are responsible for maintaining the confidentiality of your account 
              credentials and for all activities that occur under your account. You agree 
              to notify us immediately of any unauthorized use of your account.
            </p>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of our 
              service at any time. We will make reasonable efforts to notify you of 
              significant changes that may affect your use of the service.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            AI Features
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            FinFlow includes AI-powered features designed to help you manage your finances 
            more efficiently. These features process your data to provide insights, 
            categorize transactions, scan receipts, and transcribe voice input. While we 
            strive for accuracy, AI-generated content may contain errors. You are responsible 
            for reviewing and verifying all AI-generated information before relying on it. 
            The AI features are provided as a convenience and should not replace your own 
            judgment or professional financial advice.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Your Data
          </h2>
          <div className="space-y-4 text-neutral-700 leading-relaxed">
            <p>
              You retain ownership of all data you enter into FinFlow. We do not claim 
              any ownership rights over your financial information.
            </p>
            <p>
              You are responsible for the accuracy and completeness of the data you enter. 
              FinFlow relies on the information you provide to generate insights and reports, 
              so accurate input is essential for meaningful output.
            </p>
            <p>
              We encourage you to regularly back up your data using our export features. 
              While we take measures to protect your data, you are responsible for 
              maintaining copies of your important financial records.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Prohibited Use
          </h2>
          <p className="text-neutral-700 leading-relaxed mb-4">
            You agree not to use FinFlow for any unlawful purpose or in any way that could 
            damage, disable, or overburden our service. Specifically, you may not:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-neutral-700 leading-relaxed">
            <li>Use the service for any illegal activities or to facilitate illegal transactions</li>
            <li>Attempt to gain unauthorized access to any part of our service or systems</li>
            <li>Interfere with or disrupt the integrity or performance of the service</li>
            <li>Reverse engineer or attempt to extract the source code of our software</li>
            <li>Use automated systems or software to extract data from FinFlow without permission</li>
            <li>Upload or transmit any viruses, malware, or other harmful code</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Termination
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            You may terminate your account at any time by deleting it through the app settings. 
            Upon termination, your data will be deleted from our active systems in accordance 
            with our data retention practices. We reserve the right to suspend or terminate 
            your account if you violate these Terms of Service or engage in fraudulent or 
            harmful activities. In such cases, we may delete your data without prior notice.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Changes
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            We may update these Terms of Service from time to time. When we make significant 
            changes, we will notify you through the app or by email. Your continued use of 
            FinFlow after changes become effective constitutes your acceptance of the updated 
            terms. If you do not agree to the new terms, you should stop using the service.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Disclaimer and Limitation of Liability
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            FinFlow is provided as-is without warranties of any kind. We do not guarantee 
            that the service will be error-free or uninterrupted. To the maximum extent 
            permitted by law, we are not liable for any indirect, incidental, or consequential 
            damages arising from your use of FinFlow. This includes but is not limited to 
            damages for loss of profits, data, or other intangible losses.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Contact
          </h2>
          <p className="text-neutral-700 leading-relaxed">
            If you have any questions about these Terms of Service, please contact us at{' '}
            <a
              href="mailto:contact@sadabmunshi.online"
              className="text-neutral-900 underline hover:no-underline"
            >
              contact@sadabmunshi.online
            </a>
            .
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
