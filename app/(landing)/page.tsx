import type { Metadata } from 'next'
import HomeContent from './HomeContent'

export const metadata: Metadata = {
  title: {
    absolute: 'FinFlow',
  },
  description:
    'Free personal finance tracker for India. Track expenses by voice, WhatsApp, or photo. Hindi, English & Bengali supported.',
  alternates: {
    canonical: 'https://app.sadabmunshi.online',
  },
}

export default function HomePage() {
  return <HomeContent />
}
