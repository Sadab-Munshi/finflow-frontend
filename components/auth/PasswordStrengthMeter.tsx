import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PasswordStrengthMeterProps {
  password: string
}

const rules = [
  { label: '8+ characters', test: (value: string) => value.length >= 8 },
  { label: 'Mixed case', test: (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
  { label: 'Number', test: (value: string) => /[0-9]/.test(value) },
  { label: 'Symbol', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
]

function getStrength(password: string) {
  if (!password) return { score: 0, label: 'Add a password', color: 'bg-slate-200', text: 'text-slate-500' }

  const metRules = rules.filter((rule) => rule.test(password)).length
  let score = Math.min(metRules, 4)

  if (password.length >= 14 && score < 3) score = 3
  if (password.length >= 20 && score < 4) score = 4

  if (score <= 1) return { score, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600' }
  if (score === 2) return { score, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600' }
  if (score === 3) return { score, label: 'Good', color: 'bg-teal-500', text: 'text-teal-600' }
  return { score, label: 'Strong', color: 'bg-emerald-600', text: 'text-emerald-700' }
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null

  const strength = getStrength(password)

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              className={cn(
                'h-1.5 rounded-full transition-colors duration-300',
                segment <= strength.score ? strength.color : 'bg-slate-200'
              )}
            />
          ))}
        </div>
        <span className={cn('text-xs font-black uppercase tracking-[0.16em]', strength.text)}>
          {strength.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {rules.map((rule) => {
          const met = rule.test(password)
          return (
            <span
              key={rule.label}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all',
                met
                  ? 'border-teal-200 bg-teal-50 text-teal-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              )}
            >
              <Check className={cn('h-3 w-3 transition-opacity', met ? 'opacity-100' : 'opacity-25')} />
              {rule.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
