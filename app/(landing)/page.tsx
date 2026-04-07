import type { Metadata } from 'next'
import HomeContent from './HomeContent'

export const metadata: Metadata = {
  title: {
    absolute: 'FinFlow — Your Personal Finance Companion',
  },
  description:
    'Add expenses in seconds. Speak, snap or type — FinFlow understands Hindi, English & Bengali. Free to start.',
  alternates: { canonical: 'https://app.sadabmunshi.online' },
}

export default function HomePage() {
  return <HomeContent />
}
