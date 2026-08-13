import type { Metadata } from 'next'
import UserGuideContent from './UserGuideContent'

export const metadata: Metadata = {
  title: {
    absolute: 'FinFlow / User Guide',
  },
  description:
    'Learn how to use FinFlow — add expenses by voice, scan receipts, set budgets and read AI insights.',
  alternates: { canonical: 'https://app.sadabmunshi.me/user-guide' },
}

export default function UserGuidePage() {
  return <UserGuideContent />
}
