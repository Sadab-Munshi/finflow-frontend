import AuthBackground from '@/components/auth/AuthBackground'
import SignupForm from '@/components/auth/SignupForm'

export const metadata = { title: 'Sign Up | FinFlow' }

export default function SignupPage() {
  return (
    <main className="min-h-screen overflow-y-auto flex items-center justify-center py-8 px-4">
      <AuthBackground />
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_0_60px_rgba(0,212,255,0.05)]">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 17 Q8 7 12 12 Q16 17 21 7" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Create Your Account</h1>
            <p className="text-gray-500 text-sm mt-1">Less stress, more savings. AI finance tracking made simple.✨</p>
          </div>

          <SignupForm />
        </div>
      </div>
    </main>
  )
}
