import AuthShell from '@/components/auth/AuthShell'
import SignupForm from '@/components/auth/SignupForm'

export const metadata = {
  title: {
    absolute: 'FinFlow / Sign Up',
  },
  description: 'Create your free FinFlow account and start managing expenses effortlessly.',
  robots: { index: false, follow: false },
}

export default function SignupPage() {
  return (
    <AuthShell mode="signup">
      <SignupForm />
    </AuthShell>
  )
}
