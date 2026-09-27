import { getAuthenticatedUserWithProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PortalAccessDenied from '@/components/portal/PortalAccessDenied'
import FieldPortalView from '@/components/portal/FieldPortalView'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = new Set(['Field Officer', 'Admin'])

export default async function FieldPortalPage() {
  const auth = await getAuthenticatedUserWithProfile()

  if (auth.status === 401 || !auth.user) {
    redirect('/login?next=/field')
  }

  const profile = auth.profile
  const userRole = profile?.role || 'Viewer'

  if (!ALLOWED_ROLES.has(userRole)) {
    return (
      <PortalAccessDenied
        requestedPortal="Field Officer Portal"
        requiredRoles={['Field Officer']}
        currentRole={userRole}
        userEmail={profile?.email}
      />
    )
  }

  return <FieldPortalView userEmail={profile?.email} userRole={userRole} />
}
