'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Mail, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">

      {/* ── back button ── */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors mb-8"
      >
        <ArrowLeft size={16} />
        Back to Home
      </Link>

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
                  Yes. All your financial data is encrypted both in transit (TLS/SSL) and 
                  at rest on our secure cloud infrastructure. Your sensitive information is 
                  protected by industry-standard security measures at all times.
                </p>
                <p>
                  Your data is never sold, shared, or monetised. You can request full 
                  deletion of your data from Settings at any time.
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
                  FinFlow supports voice input in English, Hindi, and Bengali. Simply speak 
                  naturally in your preferred language, and FinFlow will transcribe and 
                  process your transaction automatically.
                </p>
                <p>
                  Accuracy may vary depending on accent, background noise, and clarity of 
                  speech. For best results, speak in a quiet environment.
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
                  scroll to the bottom, and select Delete Account.
                </p>
                <p className="mb-3">
                  When you delete your account:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>All your data is permanently removed from our systems</li>
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
          className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>
    </div>
    </>
  )
}
