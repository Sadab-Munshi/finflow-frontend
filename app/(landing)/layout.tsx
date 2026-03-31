import type { Metadata } from 'next'
import LandingShell from '@/components/landing/LandingShell'

export const metadata: Metadata = {
  metadataBase: new URL('https://app.sadabmunshi.online'),
  title: 'FinFlow – Track Every Rupee by Voice, Camera or Text | Sadab Munshi',
  description:
    'FinFlow by Sadab Munshi — track every rupee effortlessly by voice, camera or text. Free, secure, and available in your language.',
  keywords: [
    'FinFlow', 'Sadab Munshi', 'expense tracker India',
    'rupee tracker', 'voice expense tracker', 'AI finance app',
  ],
  authors: [{ name: 'Sadab Munshi', url: 'https://app.sadabmunshi.online' }],
  creator: 'Sadab Munshi',
  openGraph: {
    type: 'website',
    url: 'https://app.sadabmunshi.online',
    siteName: 'FinFlow',
    title: 'FinFlow – Track Every Rupee by Voice, Camera or Text',
    description: 'Track every rupee — by voice, camera or text. Free, secure, in your language.',
    images: [{
      url: 'https://app.sadabmunshi.online/og-image.png',
      width: 1200,
      height: 630,
      alt: 'FinFlow – Smart personal finance tracker by Sadab Munshi',
      type: 'image/png',
    }],
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinFlow – Track Every Rupee by Voice, Camera or Text',
    images: ['https://app.sadabmunshi.online/og-image.png'],
  },
  alternates: { canonical: 'https://app.sadabmunshi.online' },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <LandingShell>{children}</LandingShell>
}
