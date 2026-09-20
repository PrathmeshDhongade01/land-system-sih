import { getAuthenticatedUserWithProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PortalAccessDenied from '@/components/portal/PortalAccessDenied'
import StatePortalView from '@/components/portal/StatePortalView'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = new Set(['SLAO', 'CALA', 'Admin'])

export default async function StatePortalPage() {
  const auth = await getAuthenticatedUserWithProfile()

  if (auth.status === 401 || !auth.user) {
    redirect('/login?next=/state')
  }

  const profile = auth.profile
  const userRole = profile?.role || 'Viewer'

  if (!ALLOWED_ROLES.has(userRole)) {
    return (
      <PortalAccessDenied
        requestedPortal="State Officer Portal"
        requiredRoles={['SLAO', 'CALA']}
        currentRole={userRole}
        userEmail={profile?.email}
      />
    )
  }

  return (
    <StatePortalView
      userEmail={profile?.email}
      userRole={userRole}
    />
  )
}
