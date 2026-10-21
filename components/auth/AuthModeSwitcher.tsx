import Link from 'next/link'
import { cn } from '@/lib/utils'

type AuthMode = 'login' | 'signup'

interface AuthModeSwitcherProps {
  mode: AuthMode
}

export default function AuthModeSwitcher({ mode }: AuthModeSwitcherProps) {
  const isLogin = mode === 'login'

  return (
    <div className="relative grid grid-cols-2 rounded-full bg-slate-100 p-1 shadow-inner shadow-slate-200/70" aria-label="Authentication mode">
      <div
        className={cn(
          'absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-out',
          isLogin ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-hidden="true"
      />
      <Link
        href="/login"
        className={cn(
          'relative z-10 rounded-full px-4 py-2.5 text-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2',
          isLogin ? 'text-slate-950' : 'text-slate-500 hover:text-slate-800'
        )}
        aria-current={isLogin ? 'page' : undefined}
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className={cn(
          'relative z-10 rounded-full px-4 py-2.5 text-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2',
          !isLogin ? 'text-slate-950' : 'text-slate-500 hover:text-slate-800'
        )}
        aria-current={!isLogin ? 'page' : undefined}
      >
        Create account
      </Link>
    </div>
  )
}
