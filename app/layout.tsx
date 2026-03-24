import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { LanguageProvider } from '@/context/LanguageContext'
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
  title: 'FinFlow',
  description: 'Smart personal finance tracker with AI',
  applicationName: 'FinFlow',
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FinFlow',
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
  openGraph: {
    title: 'FinFlow',
    description: 'Smart personal finance tracker with AI',
    url: 'https://app.sadabmunshi.online',
    siteName: 'FinFlow',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinFlow',
    description: 'Smart personal finance tracker with AI',
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
      <body className={inter.className}>
        <PostHogProvider>
          <LanguageProvider>
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
        </LanguageProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}
