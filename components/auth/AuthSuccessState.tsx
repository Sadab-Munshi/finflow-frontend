import Link from 'next/link'
import { Check, CircleHelp, MailCheck } from 'lucide-react'

interface AuthSuccessStateProps {
  email: string
}

const checklist = ['Securing your session', 'Preparing your dashboard', 'Syncing starter categories']

export default function AuthSuccessState({ email }: AuthSuccessStateProps) {
  return (
    <div className="auth-fade-up space-y-6 text-center">
      <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-teal-100">
        <div className="auth-success-ring absolute h-24 w-24 rounded-full border border-teal-300" />
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-[0_18px_45px_rgba(20,184,166,0.35)]">
          <Check className="auth-success-pop h-8 w-8" />
        </div>
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-600">Almost there</p>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.06em] text-slate-950">Check your inbox</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          We sent a confirmation link to <span className="font-bold text-slate-800">{email}</span>. Confirm it to finish creating your FinFlow workspace.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-[0_16px_45px_rgba(15,23,42,0.08)]">
        {checklist.map((item, index) => (
          <div key={item} className="flex items-center gap-3 py-2">
            <span
              className="auth-check-pop inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-white"
              style={{ animationDelay: `${index * 220}ms` }}
            >
              <Check className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-semibold text-slate-700">{item}</span>
          </div>
        ))}
      </div>

      <Link
        href="/login"
        className="group relative flex w-full items-center justify-center overflow-hidden rounded-full bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
      >
        <MailCheck className="mr-2 h-4 w-4" />
        Go to sign in
      </Link>

      <Link href="/support" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <CircleHelp className="h-4 w-4" />
        Need help confirming your email?
      </Link>
    </div>
  )
}
