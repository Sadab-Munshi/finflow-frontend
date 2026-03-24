'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Mail, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useEffect } from 'react'

interface FAQItemProps {
  question: string
  answer: React.ReactNode
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-neutral-50 transition-colors"
      >
        <span className="font-medium text-neutral-900">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-neutral-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-neutral-500 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-5 pb-5 text-neutral-700 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  )
}

export default function SupportPage() {
  useEffect(() => {
    document.title = 'FinFlow | Support'
  }, [])

  const handleContactSupport = () => {
    window.location.href = 'mailto:contact@sadabmunshi.online'
  }

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
          Support
        </h1>
        <p className="text-lg text-neutral-600 max-w-xl mx-auto">
          Need help with FinFlow? We are here to assist you.
        </p>
      </div>

      {/* Contact Section */}
      <section className="mb-16">
        <div className="bg-neutral-50 rounded-2xl p-8 sm:p-12 text-center">
          <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-neutral-900 mb-3">
            Contact Support
          </h2>
          <p className="text-neutral-600 mb-8 max-w-md mx-auto">
            Cannot find what you are looking for? Reach out to our support team 
            and we will get back to you as soon as possible.
          </p>
          <Button size="lg" onClick={handleContactSupport}>
            Contact Support
          </Button>
        </div>
      </section>

      {/* FAQ Section */}
      <section>
        <h2 className="text-2xl font-semibold text-neutral-900 mb-8 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          <FAQItem
            question="Is my financial data safe?"
            answer={
              <>
                <p className="mb-3">
                  Yes. By default, all your financial data is stored locally on your device. 
                  This means your sensitive information never leaves your device unless you 
                  explicitly choose to enable cloud synchronization.
                </p>
                <p>
                  When cloud sync is enabled, your data is encrypted before being transmitted 
                  and stored on secure servers. We use industry-standard encryption to protect 
                  your information.
                </p>
              </>
            }
          />
          <FAQItem
            question="Can I export my data?"
            answer={
              <>
                <p className="mb-3">
                  Absolutely. FinFlow allows you to export your data at any time. You can 
                  download your transactions, budgets, and reports in standard formats like 
                  CSV and JSON.
                </p>
                <p>
                  To export your data, go to Settings and select the Export option. This 
                  ensures you always have a backup of your financial records and can easily 
                  migrate your data if needed.
                </p>
              </>
            }
          />
          <FAQItem
            question="What languages does voice input support?"
            answer={
              <>
                <p className="mb-3">
                  FinFlow supports voice input in multiple languages. Our AI can understand 
                  and process spoken transactions in most major languages including English, 
                  Spanish, French, German, Italian, Portuguese, Hindi, Arabic, Chinese, 
                  Japanese, Korean, and many others.
                </p>
                <p>
                  Simply speak naturally in your preferred language, and FinFlow will 
                  transcribe and process your transaction. The accuracy may vary based on 
                  accent and clarity of speech.
                </p>
              </>
            }
          />
          <FAQItem
            question="How do I delete my account?"
            answer={
              <>
                <p className="mb-3">
                  You can delete your account at any time from within the app. Go to Settings, 
                  then select Account, and choose Delete Account.
                </p>
                <p className="mb-3">
                  When you delete your account:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>All your data will be permanently deleted from our servers</li>
                  <li>Local data on your device will be removed</li>
                  <li>This action cannot be undone</li>
                </ul>
                <p className="mt-3">
                  We recommend exporting your data before deletion if you want to keep any records.
                </p>
              </>
            }
          />
        </div>
      </section>

      <div className="mt-16 pt-8 border-t border-neutral-100">
        <Link
          href="/"
          className="text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
    </>
  )
}
