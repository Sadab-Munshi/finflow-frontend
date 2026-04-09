import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNotificationsClient from './AdminNotificationsClient'

export default async function AdminNotificationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: settings } = await supabase
    .from('settings')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!settings?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="p-8 text-red-500 text-lg">Not authorized. Contact admin.</p>
      </div>
    )
  }

  return <AdminNotificationsClient />
}
