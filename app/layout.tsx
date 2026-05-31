import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import dynamic from 'next/dynamic'
import { Toaster } from 'react-hot-toast'
import { LanguageProvider } from '@/context/LanguageContext'
import { UserProvider } from '@/context/UserContext'
import AuthListener from '@/components/auth/AuthListener'
import { WebsiteJsonLd, OrganizationJsonLd } from '@/components/JsonLd'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import './globals.css'

const PostHogProvider = dynamic(() => import('@/components/PostHogProvider'))
const InstallPrompt = dynamic(() => import('@/components/ui/InstallPrompt'))
const UpdateNotification = dynamic(() => import('@/components/UpdateNotification'))

export const viewport: Viewport = {
  themeColor: '#0d9488',
}

const inter = Inter({ subsets: ['latin'], display: 'swap', preload: true })

export const metadata: Metadata = {
  title: {
    default: 'FinFlow',
    template: '%s | FinFlow',
  },
  description:
    'Track every rupee effortlessly. Add expenses by voice, photo, or text in Hindi, English, or Bengali. Free personal finance tracker for India.',

  metadataBase: new URL('https://www.app.sadabmunshi.me'),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  openGraph: {
    type: 'website',
    siteName: 'FinFlow',
    title: 'FinFlow',
    description:
      'Track every rupee effortlessly. Voice, photo, or text — in your language.',
    url: 'https://www.app.sadabmunshi.me',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FinFlow — Personal Finance Tracker for India',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'FinFlow',
    description:
      'Track every rupee effortlessly. Voice, photo, or text — in your language.',
    images: ['/og-image.png'],
  },

  applicationName: 'FinFlow',
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FinFlow',
  },
  keywords: [
    'expense tracker India',
    'personal finance app',
    'budget tracker Hindi',
    'rupee tracker',
    'voice expense tracker',
    'WhatsApp expense bot',
    'FinFlow',
    'free finance app India',
    'monthly budget India',
    'Bengali expense tracker',
  ],
  authors: [{ name: 'Sadab Munshi', url: 'https://www.app.sadabmunshi.me' }],
  creator: 'Sadab Munshi',
  publisher: 'FinFlow',

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

  return (
    <html lang="en">
      <head>
        <WebsiteJsonLd />
        <OrganizationJsonLd />
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) { console.log('SW registered:', reg.scope); })
                    .catch(function(err) { console.log('SW registration failed:', err); });
                });
              }
            `,
          }}
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
