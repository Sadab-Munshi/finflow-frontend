import type { Metadata } from 'next'
import SupportContent from './SupportContent'

export const metadata: Metadata = {
  title: 'FinFlow / Support',
  description:
    'Get help with FinFlow. Find answers to common questions or contact our support team.',
  alternates: { canonical: 'https://app.sadabmunshi.online/support' },
}

export default function SupportPage() {
  return <SupportContent />
}
