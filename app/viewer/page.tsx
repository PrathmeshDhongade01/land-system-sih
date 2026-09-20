import { getAuthenticatedUserWithProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ViewerPortalView from '@/components/portal/ViewerPortalView'

export const dynamic = 'force-dynamic'

export default async function ViewerPortalPage() {
  const auth = await getAuthenticatedUserWithProfile()

  if (auth.status === 401 || !auth.user) {
    redirect('/login?next=/viewer')
  }

  const profile = auth.profile
  const userRole = profile?.role || 'Viewer'

  return (
    <ViewerPortalView
      userEmail={profile?.email}
      userName={profile?.full_name}
      userRole={userRole}
    />
  )
}
