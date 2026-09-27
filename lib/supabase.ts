import { createClient } from '@supabase/supabase-js'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

const defaultUrl = 'https://udpruwshnzrqlhrslbsf.supabase.co'
const defaultKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcHJ1d3NobnpycWxocnNsYnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjYyOTYsImV4cCI6MjEwNDAwMjI5Nn0.ORuBuT5dsSEKMHfOakevG2LU24v5Aesjny75i_WTW2U'

const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

const supabaseUrl =
  rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
    ? rawUrl
    : defaultUrl
const supabaseKey = rawKey || defaultKey

export const supabase = createClient(supabaseUrl, supabaseKey)

export function getSupabaseClient() {
  if (typeof window !== 'undefined') {
    return createBrowserClient()
  }
  return supabase
}

/* -------------------------------------------------------------------------- */
/* Canonical Database Type Definitions                                        */
/* -------------------------------------------------------------------------- */

export type UserRole =
  | 'Admin'
  | 'SLAO'
  | 'CALA'
  | 'MoRTH Nodal Officer'
  | 'Field Officer'
  | 'Viewer'

export interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  department: string | null
  designation: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Project {
  id?: string
  project_code: string
  project_name: string
  state?: string | null
  district?: string | null
  department?: string | null
  corridor_length_km?: number | null
  status?: 'Draft' | 'Active' | 'Under Review' | 'Completed' | 'On Hold' | string | null
  total_area_required_ha?: number | string | null
  created_at?: string
  updated_at?: string
}

export interface LandParcel {
  id?: string
  project_id?: string | null
  project_code?: string | null
  parcel_number?: string | null
  owner_name: string
  village_name: string
  district?: string | null
  survey_number?: string | null
  land_type?: string | null
  notified_area_sqm?: number | null
  affected_area_sqm?: number | null
  possession_status?: 'Pending' | 'In Progress' | 'Acquired' | 'Possession Taken' | 'Completed' | string | null
  field_verification_status?: 'Pending' | 'Verified' | 'Needs Review' | string | null
  field_verified_at?: string | null
  field_verified_by?: string | null
  field_remarks?: string | null
  compensation_amount?: number | null
  compensation_assessed?: number | null
  compensation_approved?: number | null
  compensation_paid?: number | null
  payment_status?: 'Not Assessed' | 'Assessed' | 'Approved' | 'Payment Pending' | 'Paid' | string | null
  payment_reference?: string | null
  payment_released_at?: string | null
  rehabilitation_status?: 'Not Started' | 'Eligible' | 'In Progress' | 'Completed' | string | null
  rehabilitation_amount?: number | null
  rehabilitation_remarks?: string | null
  rehabilitation_completed_at?: string | null
  latitude?: number | null
  longitude?: number | null
  created_at?: string
  updated_at?: string
}

export interface StatutoryWorkflow {
  id?: string
  project_code: string
  land_parcel_id?: string | null
  workflow_type?: string | null
  stage_name?: string | null
  status?: 'Pending' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Completed' | string | null
  assigned_to?: string | null
  submitted_by?: string | null
  approved_by?: string | null
  remarks?: string | null
  created_at?: string
  updated_at?: string
  approved_at?: string | null
}

export type AssignmentStatus = 'Active' | 'Completed' | 'Cancelled'

export interface ParcelAssignment {
  id?: string
  parcel_id: string
  assigned_officer_id: string
  assigned_by: string
  assigned_at?: string
  unassigned_at?: string | null
  status: AssignmentStatus
  remarks?: string | null
  created_at?: string
  updated_at?: string
}

/* -------------------------------------------------------------------------- */
/* Dynamic Dashboard KPI Aggregation Helper                                   */
/* -------------------------------------------------------------------------- */

export interface DashboardKpis {
  totalProjects: number
  totalNotifiedAreaHa: number
  areaAcquiredHa: number
  compensationDisbursedCrores: number
  affectedFamiliesCount: number
  acquiredPercentage: number
  rehabilitatedPercentage: number
  rehabilitatedFamiliesCount: number
}

function isJwtOrAuthError(err: any): boolean {
  if (!err) return false
  const msg = (typeof err === 'string' ? err : err.message || '').toLowerCase()
  return (
    msg.includes('jwt') ||
    msg.includes('issued at future') ||
    msg.includes('token') ||
    msg.includes('expired') ||
    msg.includes('unauthorized') ||
    msg.includes('claim')
  )
}

export async function fetchDashboardKpis(
  customClient?: any,
  projectCode?: string | null
): Promise<{ kpis: DashboardKpis | null; error: string | null }> {
  try {
    const dbClient = customClient || getSupabaseClient()

    let projectsQuery = dbClient.from('projects').select('id, project_code, total_area_required_ha, status')
    let parcelsQuery = dbClient.from('land_parcels').select('project_code, owner_name, notified_area_sqm, affected_area_sqm, possession_status, compensation_paid, rehabilitation_status')

    if (projectCode && projectCode !== 'ALL') {
      projectsQuery = projectsQuery.eq('project_code', projectCode)
      parcelsQuery = parcelsQuery.eq('project_code', projectCode)
    }

    let [projectsRes, parcelsRes] = await Promise.all([projectsQuery, parcelsQuery])

    if (isJwtOrAuthError(projectsRes?.error) || isJwtOrAuthError(parcelsRes?.error)) {
      const { data: refreshData } = await dbClient.auth.refreshSession()
      if (refreshData?.session) {
        let retryProjects = dbClient.from('projects').select('id, project_code, total_area_required_ha, status')
        let retryParcels = dbClient.from('land_parcels').select('project_code, owner_name, notified_area_sqm, affected_area_sqm, possession_status, compensation_paid, rehabilitation_status')
        if (projectCode && projectCode !== 'ALL') {
          retryProjects = retryProjects.eq('project_code', projectCode)
          retryParcels = retryParcels.eq('project_code', projectCode)
        }
        ;[projectsRes, parcelsRes] = await Promise.all([retryProjects, retryParcels])
      }
    }

    if (projectsRes.error) throw new Error(`Projects database query failed: ${projectsRes.error.message}`)
    if (parcelsRes.error) throw new Error(`Land parcels database query failed: ${parcelsRes.error.message}`)

    const projects = (projectsRes.data || []) as any[]
    const parcels = (parcelsRes.data || []) as any[]

    const totalProjects = projects.length

    // 1. Total Notified Area: SUM of projects.total_area_required_ha
    const totalNotifiedAreaHa = projects.reduce((sum: number, p: any) => {
      const val = parseFloat(String(p.total_area_required_ha || 0))
      return sum + (isNaN(val) ? 0 : val)
    }, 0)

    // Acquired statuses present in DB: 'Possessed', 'Possession Taken', 'Acquired', 'Completed'
    const ACQUIRED_STATUSES = new Set(['Possessed', 'Possession Taken', 'Acquired', 'Completed'])

    // 2. Area Acquired (ha): SUM(affected_area_sqm or notified_area_sqm) / 10000 for acquired parcels
    const totalAcquiredSqm = parcels.reduce((sum: number, p: any) => {
      const status = (p.possession_status || '').trim()
      if (ACQUIRED_STATUSES.has(status)) {
        const sqm = parseFloat(String(p.affected_area_sqm || p.notified_area_sqm || 0))
        return sum + (isNaN(sqm) ? 0 : sqm)
      }
      return sum
    }, 0)
    const areaAcquiredHa = totalAcquiredSqm / 10000

    // 3. Compensation Disbursed (in Crores): SUM(compensation_paid) / 10,000,000
    const totalCompensationPaid = parcels.reduce((sum: number, p: any) => {
      const val = parseFloat(String(p.compensation_paid || 0))
      return sum + (isNaN(val) ? 0 : val)
    }, 0)
    const compensationDisbursedCrores = totalCompensationPaid / 10000000

    // 4. Affected Families: COUNT(DISTINCT owner_name)
    const uniqueOwners = new Set(
      parcels
        .map((p: any) => (p.owner_name || '').trim())
        .filter((name: string) => name.length > 0)
    )
    const affectedFamiliesCount = uniqueOwners.size

    // 5. Rehabilitated Families: COUNT(DISTINCT owner_name) where rehabilitation_status is 'Completed'
    const rehabilitatedOwners = new Set(
      parcels
        .filter((p: any) => (p.rehabilitation_status || '').trim() === 'Completed')
        .map((p: any) => (p.owner_name || '').trim())
        .filter((name: string) => name.length > 0)
    )
    const rehabilitatedFamiliesCount = rehabilitatedOwners.size

    const acquiredPercentage =
      totalNotifiedAreaHa > 0
        ? Math.min(100, Math.round((areaAcquiredHa / totalNotifiedAreaHa) * 100))
        : parcels.length > 0
        ? Math.round(
            (parcels.filter((p: any) => ACQUIRED_STATUSES.has((p.possession_status || '').trim())).length /
              parcels.length) *
              100
          )
        : 0

    const rehabilitatedPercentage =
      affectedFamiliesCount > 0
        ? Math.round((rehabilitatedFamiliesCount / affectedFamiliesCount) * 100)
        : 0

    return {
      kpis: {
        totalProjects,
        totalNotifiedAreaHa,
        areaAcquiredHa,
        compensationDisbursedCrores,
        affectedFamiliesCount,
        acquiredPercentage,
        rehabilitatedPercentage,
        rehabilitatedFamiliesCount,
      },
      error: null,
    }
  } catch (err: any) {
    console.error('Error in fetchDashboardKpis:', err)
    return { kpis: null, error: err?.message || 'Failed to calculate dynamic KPIs from Supabase database' }
  }
}

/* -------------------------------------------------------------------------- */
/* Dynamic Project Status & Latest Statutory Stage Helper                     */
/* -------------------------------------------------------------------------- */

export interface ProjectWithStage {
  id?: string
  project_code: string
  project_name: string
  district: string
  status: string
  stage: string
  updated: string
  created_at?: string
  updated_at?: string
}

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'Recently'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return 'Recently'

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  if (diffMs < 0) return 'Just now'

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours} hrs ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export async function fetchRecentProjectStatuses(
  limit = 5,
  customClient?: any
): Promise<{
  projects: ProjectWithStage[]
  totalProjects: number
  error: string | null
}> {
  try {
    const dbClient = customClient || getSupabaseClient()
    // 1. Fetch recent projects ordered by updated_at DESC (fallback created_at DESC)
    let { data: projectsData, count, error: projectsError } = await dbClient
      .from('projects')
      .select('id, project_code, project_name, state, district, status, total_area_required_ha, created_at, updated_at', { count: 'exact' })
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (projectsError && isJwtOrAuthError(projectsError)) {
      const { data: refreshData } = await dbClient.auth.refreshSession()
      if (refreshData?.session) {
        const retryRes = await dbClient
          .from('projects')
          .select('id, project_code, project_name, state, district, status, total_area_required_ha, created_at, updated_at', { count: 'exact' })
          .order('updated_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(limit)
        projectsData = retryRes.data
        count = retryRes.count
        projectsError = retryRes.error
      }
    }

    if (projectsError) throw new Error(`Projects fetch failed: ${projectsError.message}`)

    const rawProjects: any[] = projectsData || []
    const totalProjects = count ?? rawProjects.length

    if (rawProjects.length === 0) {
      return { projects: [], totalProjects: 0, error: null }
    }

    // 2. Collect unique project codes
    const projectCodes = Array.from(new Set(rawProjects.map((p: any) => p.project_code).filter(Boolean))) as string[]

    // 3. Performance-optimized batch query for latest statutory workflows
    const workflowsMap = new Map<string, string>()
    if (projectCodes.length > 0) {
      let { data: workflowsData, error: workflowsError } = await dbClient
        .from('statutory_workflows')
        .select('project_code, workflow_type, stage_name, created_at')
        .in('project_code', projectCodes)
        .order('created_at', { ascending: false })

      if (workflowsError && isJwtOrAuthError(workflowsError)) {
        const { data: refreshData } = await dbClient.auth.refreshSession()
        if (refreshData?.session) {
          const retryWf = await dbClient
            .from('statutory_workflows')
            .select('project_code, workflow_type, stage_name, created_at')
            .in('project_code', projectCodes)
            .order('created_at', { ascending: false })
          workflowsData = retryWf.data
          workflowsError = retryWf.error
        }
      }

      if (!workflowsError && workflowsData) {
        for (const wf of (workflowsData as any[])) {
          if (wf.project_code && !workflowsMap.has(wf.project_code)) {
            const stage = (wf.workflow_type || wf.stage_name || '').trim()
            if (stage) {
              workflowsMap.set(wf.project_code, stage)
            }
          }
        }
      }
    }

    // 4. Combine project details with latest statutory workflow stage
    const projects: ProjectWithStage[] = rawProjects.map((p: any) => {
      const stage = workflowsMap.get(p.project_code) || 'Workflow not initiated'
      const updatedDate = p.updated_at || p.created_at
      return {
        id: p.id,
        project_code: p.project_code || 'N/A',
        project_name: p.project_name || 'Unnamed Project',
        district: p.district || p.state || 'N/A',
        status: p.status || 'Active',
        stage,
        updated: formatRelativeTime(updatedDate),
        created_at: p.created_at,
        updated_at: p.updated_at,
      }
    })

    return { projects, totalProjects, error: null }
  } catch (err: any) {
    console.error('Error in fetchRecentProjectStatuses:', err)
    return {
      projects: [],
      totalProjects: 0,
      error: err?.message || 'Failed to fetch recent project statuses from Supabase database',
    }
  }
}