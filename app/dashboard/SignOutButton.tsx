'use client'

import { useTranslations } from 'next-intl'
import { useSignOutConfirm } from '@/components/auth/SignOutDialog'

export default function SignOutButton() {
  const t = useTranslations('nav')
  const { requestSignOut, signOutDialog } = useSignOutConfirm()

  return (
    <>
      <button
        onClick={requestSignOut}
        className="px-6 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all text-sm font-medium"
      >
        {t('signOut')}
      </button>
      {signOutDialog}
    </>
  )
}
