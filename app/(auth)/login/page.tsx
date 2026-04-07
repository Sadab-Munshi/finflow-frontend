import type { Metadata } from 'next'
import LoginContent from './LoginContent'

export const metadata: Metadata = {
  title: 'FinFlow / Login',
  description: 'Log in to your FinFlow account.',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return <LoginContent />
}
