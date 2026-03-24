import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Verify that the current request is from an authenticated admin user.
 * Checks the is_admin flag in the settings table.
 * Returns the user ID if admin, or a 401 response if not.
 */
export async function verifyAdmin(req: NextRequest): Promise<{ userId: string } | NextResponse> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll() {
          // No-op for API routes - we don't need to set cookies
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service client to check is_admin (bypasses RLS)
  const serviceClient = createServiceClient()
  const { data: settings } = await serviceClient
    .from('settings')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!settings?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return { userId: user.id }
}
