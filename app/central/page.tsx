import { getAuthenticatedUserWithProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PortalAccessDenied from '@/components/portal/PortalAccessDenied'
import CentralPortalView from '@/components/portal/CentralPortalView'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = new Set(['MoRTH Nodal Officer', 'Admin'])

export default async function CentralPortalPage() {
  const auth = await getAuthenticatedUserWithProfile()

  if (auth.status === 401 || !auth.user) {
    redirect('/login?next=/central')
  }

  const profile = auth.profile
  const userRole = profile?.role || 'Viewer'

  if (!ALLOWED_ROLES.has(userRole)) {
    return (
      <PortalAccessDenied
        requestedPortal="Central Officer Portal"
        requiredRoles={['MoRTH Nodal Officer']}
        currentRole={userRole}
        userEmail={profile?.email}
      />
    )
  }

  return (
    <CentralPortalView
      userEmail={profile?.email}
      userRole={userRole}
    />
  )
}
