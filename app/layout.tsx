import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { LanguageProvider } from '@/context/LanguageContext'
import { UserProvider } from '@/context/UserContext'
import AuthListener from '@/components/auth/AuthListener'
import PostHogProvider from '@/components/PostHogProvider'
import InstallPrompt from '@/components/ui/InstallPrompt'
import UpdateNotification from '@/components/UpdateNotification'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import './globals.css'

export const viewport: Viewport = {
  themeColor: '#0d9488',
}

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://app.sadabmunshi.online'),

  title: {
    default: 'FinFlow — Your Personal Finance Companion',
    template: '%s | FinFlow',
  },

  description:
    'Add expenses in seconds. Speak, snap or type — FinFlow understands Hindi, English & Bengali. Free to start.',

  authors: [{ name: 'FinFlow' }],
  creator: 'FinFlow',
  publisher: 'FinFlow',

  applicationName: 'FinFlow',
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FinFlow',
  },

  robots: { index: true, follow: true },

  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://app.sadabmunshi.online',
    siteName: 'FinFlow',
    title: 'FinFlow — Your Personal Finance Companion',
    description:
      'Add expenses in seconds. Speak, snap or type — FinFlow understands Hindi, English & Bengali. Free to start.',
    images: [{ url: '/finflow-logo.png', width: 1200, height: 630, alt: 'FinFlow' }],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'FinFlow — Your Personal Finance Companion',
    description:
      'Add expenses in seconds. Speak, snap or type — FinFlow understands Hindi, English & Bengali.',
    images: ['/finflow-logo.png'],
  },

  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  let cookieId = cookieStore.get('finflow_visitor')?.value
  if (!cookieId) {
    cookieId = uuidv4()
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'FinFlow',
    alternateName: ['Sadab Munshi App', 'sadab munshi finflow'],
    url: 'https://app.sadabmunshi.online',
    description:
      'Track every rupee effortlessly by voice, camera or text. AI-powered personal finance tracker by Sadab Munshi.',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web, Android, iOS',
    inLanguage: ['en', 'hi', 'bn'],
    author: {
      '@type': 'Person',
      name: 'Sadab Munshi',
      url: 'https://app.sadabmunshi.online',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
  }

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <PostHogProvider>
          <LanguageProvider>
            <UserProvider>
            <AuthListener />
            <UpdateNotification />
            <InstallPrompt />
            {children}
            <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#111827', color: '#F9FAFB', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' },
              success: { iconTheme: { primary: '#10b981', secondary: '#0A0F1E' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#0A0F1E' } },
            }}
          />
        </UserProvider>
        </LanguageProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}
