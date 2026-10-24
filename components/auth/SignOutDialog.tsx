'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, LogOut } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase/client'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The single sign-out confirmation in the product.
 *
 * Every entry point (sidebar account menu, phone drawer trigger, dashboard
 * button, profile screen) opens this dialog and nothing else calls
 * `supabase.auth.signOut()` — so the wording, the keyboard behaviour and the
 * "only after confirmation" guarantee can never drift between screens.
 *
 * Details that matter:
 * - Radix `AlertDialogAction` closes the dialog as soon as it is activated, so
 *   the confirm handler calls `preventDefault()` and closes explicitly once the
 *   request settles. That keeps the dialog (and its focus trap) mounted while
 *   the network call is in flight instead of flashing the dashboard.
 * - A ref guard, not just `pending`, blocks a second click that lands in the
 *   same tick before React has re-rendered — double-tapping "Sign Out" on a
 *   slow connection can otherwise fire two requests.
 * - `AlertDialogCancel` is a plain cancel: it changes visibility only, never
 *   auth state.
 */
export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const t = useTranslations('nav')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const inFlight = useRef(false)

  // A reopened dialog must never show the previous attempt's error or spinner.
  useEffect(() => {
    if (!open) return
    setPending(false)
    setFailed(false)
    inFlight.current = false
  }, [open])

  const handleConfirm = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault()
      if (inFlight.current) return
      inFlight.current = true
      setPending(true)
      setFailed(false)

      try {
        const supabase = createClient()
        const { error } = await supabase.auth.signOut({ scope: 'local' })
        if (error) throw error
        onOpenChange(false)
        router.push('/login')
        router.refresh()
      } catch {
        inFlight.current = false
        setPending(false)
        setFailed(true)
      }
    },
    [onOpenChange, router]
  )

  return (
    <AlertDialog
      open={open}
      onOpenChange={next => {
        // While signing out the dialog stays put: hiding it would leave the user
        // on a dashboard that is about to become unauthenticated.
        if (pending) return
        onOpenChange(next)
      }}
    >
      <AlertDialogContent size="sm" className="z-[80] no-print">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-[#fdf2f1] text-[#c0392b]">
            <LogOut strokeWidth={1.9} aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>{t('signOutConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('signOutConfirmBody')}</AlertDialogDescription>
        </AlertDialogHeader>

        {failed && (
          <p role="alert" className="text-sm font-medium text-[#c0392b]">
            {t('signOutConfirmError')}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('signOutConfirmCancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={handleConfirm}
            className="gap-2"
            aria-busy={pending}
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {pending ? t('signOutConfirmPending') : t('signOutConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Convenience wrapper for screens that have no other reason to hold the open
 * state: `const { requestSignOut, signOutDialog } = useSignOutConfirm()`.
 */
export function useSignOutConfirm() {
  const [open, setOpen] = useState(false)
  const requestSignOut = useCallback(() => setOpen(true), [])
  const signOutDialog = <SignOutDialog open={open} onOpenChange={setOpen} />
  return { requestSignOut, signOutDialog }
}
