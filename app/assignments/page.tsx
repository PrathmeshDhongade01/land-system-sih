'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import {
  UserCheck,
  UserPlus,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  LogOut,
  User,
  Building2,
  LandPlot,
  ChevronRight,
  History,
  RotateCcw,
  FileText,
  Layers,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Eye,
  X,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ParcelContextHub } from '@/components/ParcelContextHub'

interface AssignmentRecord {
  id: string
  parcel_id: string
  parcel_number: string
  owner_name: string
  village_name: string
  project_code: string
  assigned_officer_id: string
  assigned_officer_name: string
  assigned_officer_email: string
  assigned_by: string
  assigned_by_name: string
  assigned_at: string
  unassigned_at: string | null
  status: 'Active' | 'Completed' | 'Cancelled' | string
  remarks: string | null
  created_at?: string
  updated_at?: string
}

interface ParcelOption {
  id: string
  parcel_number: string
  owner_name: string
  village_name: string
  project_code: string
  has_active_assignment?: boolean
  active_officer_name?: string
}

interface OfficerProfile {
  id: string
  full_name: string | null
  email: string | null
  role: string
  is_active: boolean
}

interface ProjectOption {
  id: string
  project_code: string
  project_name: string
}

const MUTATION_ROLES = new Set(['Admin', 'SLAO'])

export default function AssignmentsPage() {
  const router = useRouter()

  // User Profile State
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  // Data State
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([])
  const [parcelsList, setParcelsList] = useState<ParcelOption[]>([])
  const [officersList, setOfficersList] = useState<OfficerProfile[]>([])
  const [projectsList, setProjectsList] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Filters State
  const [projectFilter, setProjectFilter] = useState<string>('All')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [officerFilter, setOfficerFilter] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Assign Parcel Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false)
  const [selectedParcelId, setSelectedParcelId] = useState<string>('')
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('')
  const [assignRemarks, setAssignRemarks] = useState<string>('')
  const [assignSubmitting, setAssignSubmitting] = useState<boolean>(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  // Details & History Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false)
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentRecord | null>(null)
  const [parcelHistory, setParcelHistory] = useState<AssignmentRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState<boolean>(false)

  // Reassign Modal State
  const [isReassignModalOpen, setIsReassignModalOpen] = useState<boolean>(false)
  const [reassignTarget, setReassignTarget] = useState<AssignmentRecord | null>(null)
  const [reassignOfficerId, setReassignOfficerId] = useState<string>('')
  const [reassignRemarks, setReassignRemarks] = useState<string>('')
  const [reassignSubmitting, setReassignSubmitting] = useState<boolean>(false)
  const [reassignError, setReassignError] = useState<string | null>(null)

  // Status Change Modal State (Complete / Cancel)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false)
  const [statusTarget, setStatusTarget] = useState<AssignmentRecord | null>(null)
  const [targetStatusAction, setTargetStatusAction] = useState<'Completed' | 'Cancelled'>('Completed')
  const [statusRemarks, setStatusRemarks] = useState<string>('')
  const [statusSubmitting, setStatusSubmitting] = useState<boolean>(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  // 360 Parcel Context Hub State
  const [hubParcelId, setHubParcelId] = useState<string | null>(null)
  const [isHubOpen, setIsHubOpen] = useState<boolean>(false)

  // 1. Fetch User Profile
  useEffect(() => {
    const browserClient = createBrowserClient()
    browserClient.auth.getUser().then((res: any) => {
      const data = res?.data
      if (data?.user) {
        setUserId(data.user.id)
        setUserEmail(data.user.email ?? null)
        browserClient
          .from('profiles')
          .select('id, full_name, email, role, is_active')
          .eq('id', data.user.id)
          .maybeSingle()
          .then((profRes: any) => {
            const prof = profRes?.data
            if (prof) {
              setUserRole(prof.role)
              setUserName(prof.full_name || data.user.email || 'Officer')
            }
          })
      }
    })
  }, [])

  const handleSignOut = async () => {
    const browserClient = createBrowserClient()
    await browserClient.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // 2. Fetch Assignments via GET /api/assignments
  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const params = new URLSearchParams()
      if (userRole === 'Field Officer') {
        params.set('assigned_to_me', 'true')
      } else {
        if (statusFilter !== 'All') {
          params.set('status', statusFilter)
        }
        if (officerFilter !== 'All') {
          params.set('assigned_officer_id', officerFilter)
        }
      }

      const queryString = params.toString()
      const url = `/api/assignments${queryString ? `?${queryString}` : ''}`
      const res = await fetch(url)
      const json = await res.json()

      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'Failed to fetch parcel assignments.')
        setAssignments([])
        return
      }

      setAssignments(json.data || [])
    } catch (err: any) {
      console.error('Error fetching assignments:', err)
      setErrorMsg(err?.message || 'Network error fetching assignments.')
    } finally {
      setLoading(false)
    }
  }, [userRole, statusFilter, officerFilter])

  // 3. Fetch Dropdown Options (Parcels, Field Officers, Projects)
  const fetchDropdownOptions = useCallback(async () => {
    try {
      const browserClient = createBrowserClient()

      // Fetch officers securely via GET /api/officers for Admin / SLAO
      let officersData: OfficerProfile[] = []
      if (userRole === 'Admin' || userRole === 'SLAO') {
        try {
          const offRes = await fetch('/api/officers')
          const offJson = await offRes.json()
          if (offRes.ok && offJson.success) {
            officersData = offJson.data || []
          }
        } catch (err) {
          console.error('Error fetching officers via /api/officers:', err)
        }
      }

      const [parcelsRes, projectsRes, activeAssignmentsRes] = await Promise.all([
        browserClient
          .from('land_parcels')
          .select('id, parcel_number, parcel_no, owner_name, village_name, project_code')
          .order('parcel_number', { ascending: true }),
        browserClient
          .from('projects')
          .select('id, project_code, project_name')
          .order('project_code', { ascending: true }),
        browserClient
          .from('parcel_assignments')
          .select('parcel_id, assigned_officer_id, status')
          .eq('status', 'Active'),
      ])

      const activeMap = new Map<string, string>()
      if (activeAssignmentsRes.data) {
        for (const a of activeAssignmentsRes.data) {
          activeMap.set(a.parcel_id, a.assigned_officer_id)
        }
      }

      const officersMap = new Map<string, string>()
      if (officersData.length > 0) {
        for (const o of officersData) {
          officersMap.set(o.id, o.full_name || o.email || 'Field Officer')
        }
        setOfficersList(officersData)
      }

      if (parcelsRes.data) {
        const formattedParcels: ParcelOption[] = parcelsRes.data.map((p: any) => {
          const hasActive = activeMap.has(p.id)
          const officerId = activeMap.get(p.id)
          return {
            id: p.id,
            parcel_number: p.parcel_number || p.parcel_no || 'N/A',
            owner_name: p.owner_name || 'N/A',
            village_name: p.village_name || 'N/A',
            project_code: p.project_code || 'N/A',
            has_active_assignment: hasActive,
            active_officer_name: officerId ? officersMap.get(officerId) || 'Assigned Officer' : undefined,
          }
        })
        setParcelsList(formattedParcels)
      }

      if (projectsRes.data) {
        setProjectsList(projectsRes.data)
      }
    } catch (err) {
      console.error('Error fetching dropdown options:', err)
    }
  }, [userRole])

  useEffect(() => {
    fetchAssignments()
    fetchDropdownOptions()
  }, [fetchAssignments, fetchDropdownOptions])

  // Toast Auto-clear
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  // 4. Compute Summary KPI Statistics
  const kpis = useMemo(() => {
    const total = assignments.length
    let active = 0
    let completed = 0
    let cancelled = 0

    for (const a of assignments) {
      if (a.status === 'Active') active++
      else if (a.status === 'Completed') completed++
      else if (a.status === 'Cancelled') cancelled++
    }

    return { total, active, completed, cancelled }
  }, [assignments])

  // 5. Client-Side Filtered Assignments List
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      // Project Filter
      if (projectFilter !== 'All' && a.project_code !== projectFilter) {
        return false
      }
      // Status Filter
      if (statusFilter !== 'All' && a.status !== statusFilter) {
        return false
      }
      // Officer Filter
      if (officerFilter !== 'All' && a.assigned_officer_id !== officerFilter) {
        return false
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchParcel = (a.parcel_number || '').toLowerCase().includes(q)
        const matchOwner = (a.owner_name || '').toLowerCase().includes(q)
        const matchVillage = (a.village_name || '').toLowerCase().includes(q)
        const matchProject = (a.project_code || '').toLowerCase().includes(q)
        const matchOfficerName = (a.assigned_officer_name || '').toLowerCase().includes(q)
        const matchOfficerEmail = (a.assigned_officer_email || '').toLowerCase().includes(q)

        if (!matchParcel && !matchOwner && !matchVillage && !matchProject && !matchOfficerName && !matchOfficerEmail) {
          return false
        }
      }
      return true
    })
  }, [assignments, projectFilter, statusFilter, officerFilter, searchQuery])

  // 6. Handle Create Assignment Submission (POST /api/assignments)
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    setAssignError(null)

    if (!selectedParcelId) {
      setAssignError('Please select a land parcel.')
      return
    }

    if (!selectedOfficerId) {
      setAssignError('Please select a Field Officer.')
      return
    }

    setAssignSubmitting(true)
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcel_id: selectedParcelId,
          assigned_officer_id: selectedOfficerId,
          remarks: assignRemarks.trim() || undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        if (res.status === 409) {
          setAssignError('Parcel already has an active assignment.')
        } else {
          setAssignError(json.error || 'Failed to create parcel assignment.')
        }
        return
      }

      setSuccessToast('Parcel assignment created successfully.')
      setIsAssignModalOpen(false)
      setSelectedParcelId('')
      setSelectedOfficerId('')
      setAssignRemarks('')
      fetchAssignments()
      fetchDropdownOptions()
    } catch (err: any) {
      console.error('Error creating assignment:', err)
      setAssignError(err?.message || 'Network error submitting assignment.')
    } finally {
      setAssignSubmitting(false)
    }
  }

  // 7. Handle View Details & History
  const handleOpenDetails = async (assignment: AssignmentRecord) => {
    setSelectedAssignment(assignment)
    setIsDetailsModalOpen(true)
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/assignments?parcel_id=${assignment.parcel_id}`)
      const json = await res.json()
      if (res.ok && json.success) {
        setParcelHistory(json.data || [])
      } else {
        setParcelHistory([assignment])
      }
    } catch {
      setParcelHistory([assignment])
    } finally {
      setHistoryLoading(false)
    }
  }

  // 8. Handle Reassign Submission (PATCH /api/assignments)
  const handleOpenReassignModal = (assignment: AssignmentRecord) => {
    setReassignTarget(assignment)
    setReassignOfficerId('')
    setReassignRemarks('')
    setReassignError(null)
    setIsReassignModalOpen(true)
  }

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reassignTarget) return
    setReassignError(null)

    if (!reassignOfficerId) {
      setReassignError('Please select a new Field Officer.')
      return
    }

    if (reassignOfficerId === reassignTarget.assigned_officer_id) {
      setReassignError('New assigned officer must be different from current assigned officer.')
      return
    }

    setReassignSubmitting(true)
    try {
      const res = await fetch('/api/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reassignTarget.id,
          action: 'reassign',
          new_assigned_officer_id: reassignOfficerId,
          remarks: reassignRemarks.trim() || undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        setReassignError(json.error || 'Failed to reassign parcel.')
        return
      }

      setSuccessToast('Parcel reassigned successfully.')
      setIsReassignModalOpen(false)
      setReassignTarget(null)
      fetchAssignments()
      fetchDropdownOptions()
    } catch (err: any) {
      console.error('Error reassigning parcel:', err)
      setReassignError(err?.message || 'Network error during reassignment.')
    } finally {
      setReassignSubmitting(false)
    }
  }

  // 9. Handle Status Change Submission (Completed / Cancelled)
  const handleOpenStatusModal = (assignment: AssignmentRecord, action: 'Completed' | 'Cancelled') => {
    setStatusTarget(assignment)
    setTargetStatusAction(action)
    setStatusRemarks('')
    setStatusError(null)
    setIsStatusModalOpen(true)
  }

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!statusTarget) return
    setStatusError(null)
    setStatusSubmitting(true)

    try {
      const res = await fetch('/api/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: statusTarget.id,
          status: targetStatusAction,
          remarks: statusRemarks.trim() || undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        setStatusError(json.error || `Failed to update assignment to ${targetStatusAction}.`)
        return
      }

      setSuccessToast(`Assignment marked as ${targetStatusAction}.`)
      setIsStatusModalOpen(false)
      setStatusTarget(null)
      fetchAssignments()
      fetchDropdownOptions()
    } catch (err: any) {
      console.error('Error updating status:', err)
      setStatusError(err?.message || 'Network error updating assignment status.')
    } finally {
      setStatusSubmitting(false)
    }
  }

  // Navigation Helper to Field Verification
  const handleOpenParcelInVerification = (parcelId: string) => {
    router.push(`/field-verification?parcel_id=${parcelId}`)
  }

  const isMutationAllowed = MUTATION_ROLES.has(userRole || '')

  return (
    <div className="flex-1 bg-slate-900 text-slate-100 min-h-screen flex flex-col">
      {/* Tricolor top indicator */}
      <div className="flex h-1 w-full shrink-0">
        <div className="flex-1 bg-amber-500" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-emerald-600" />
      </div>

      {/* Top Bar Header */}
      <header className="px-8 py-5 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-blue-600/20 text-amber-400 ring-1 ring-amber-500/30">
            <UserCheck className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                MoRTH NLAMS Portal
              </span>
              <span className="text-[10px] text-slate-400">· Section 3 Field Module</span>
            </div>
            <h1 className="text-xl font-bold font-serif text-slate-100">
              {userRole === 'Field Officer' ? 'My Assigned Parcels' : 'Parcel Assignment Management'}
            </h1>
          </div>
        </div>

        {/* User Badge & Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={fetchAssignments}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition border border-slate-700 disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            <span>Refresh</span>
          </button>

          {isMutationAllowed && (
            <button
              onClick={() => {
                setAssignError(null)
                setIsAssignModalOpen(true)
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
            >
              <UserPlus className="size-4" />
              <span>Assign Parcel</span>
            </button>
          )}

          {userEmail && (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="size-8 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-xs border border-slate-700">
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-medium text-slate-200 truncate max-w-[140px]">{userName}</p>
                <p className="text-[10px] text-amber-400 font-semibold uppercase">{userRole || 'Authenticated'}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                title="Sign Out"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Success Toast Banner */}
        {successToast && (
          <div className="flex items-center justify-between bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="size-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-medium">{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="flex items-center justify-between bg-rose-950/80 border border-rose-500/50 text-rose-200 px-4 py-3 rounded-xl shadow-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="size-5 text-rose-400 shrink-0" />
              <span className="text-sm font-medium">{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* KPI Cards (Admin / SLAO View) */}
        {userRole !== 'Field Officer' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Total Assignments</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">{kpis.total}</p>
              </div>
              <div className="size-10 rounded-lg bg-blue-950/60 text-blue-400 flex items-center justify-center border border-blue-800/40">
                <Users className="size-5" />
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Active Assignments</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{kpis.active}</p>
              </div>
              <div className="size-10 rounded-lg bg-emerald-950/60 text-emerald-400 flex items-center justify-center border border-emerald-800/40">
                <Clock className="size-5" />
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Completed</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{kpis.completed}</p>
              </div>
              <div className="size-10 rounded-lg bg-amber-950/60 text-amber-400 flex items-center justify-center border border-amber-800/40">
                <CheckCircle2 className="size-5" />
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Cancelled</p>
                <p className="text-2xl font-bold text-slate-400 mt-1">{kpis.cancelled}</p>
              </div>
              <div className="size-10 rounded-lg bg-slate-900 text-slate-400 flex items-center justify-center border border-slate-700">
                <XCircle className="size-5" />
              </div>
            </div>
          </div>
        )}

        {/* Field Officer Banner */}
        {userRole === 'Field Officer' && (
          <div className="bg-gradient-to-r from-blue-950/80 to-slate-900 border border-blue-800/50 rounded-xl p-5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center ring-1 ring-blue-500/40">
                <LandPlot className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Welcome, {userName}</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  View and manage your assigned land parcels for field verification.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold uppercase text-blue-400 bg-blue-950 px-3 py-1 rounded-md border border-blue-800">
                {assignments.filter((a) => a.status === 'Active').length} Active Tasks
              </span>
            </div>
          </div>
        )}

        {/* Filters & Search Toolbar */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search parcel, owner, village, project, or officer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-400">Filters:</span>
            </div>

            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="All">All Projects</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.project_code}>
                  {p.project_code} - {p.project_name}
                </option>
              ))}
            </select>

            {/* Status Filter (Hidden for Field Officers as default view is server-scoped) */}
            {userRole !== 'Field Officer' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            )}

            {/* Officer Filter (Admin/SLAO only) */}
            {isMutationAllowed && (
              <select
                value={officerFilter}
                onChange={(e) => setOfficerFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="All">All Officers</option>
                {officersList.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.full_name || o.email || 'Officer'}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Assignments Table Section */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-700/60 flex items-center justify-between">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <FileText className="size-4 text-blue-400" />
              <span>
                {userRole === 'Field Officer' ? 'My Assigned Parcels' : 'Parcel Assignments List'}
              </span>
              <span className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700 font-normal">
                {filteredAssignments.length}
              </span>
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="size-8 animate-spin mx-auto text-blue-400" />
              <p className="text-sm">Loading parcel assignments...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <UserCheck className="size-10 mx-auto text-slate-600" />
              <p className="text-base font-semibold text-slate-300">No parcel assignments found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {userRole === 'Field Officer'
                  ? 'You currently have no active land parcel assignments for field verification.'
                  : 'No assignment records match the selected project, status, or search query.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-700/60">
                  <tr>
                    <th className="px-6 py-3.5">Parcel / Survey</th>
                    <th className="px-6 py-3.5 hidden sm:table-cell">Owner & Village</th>
                    <th className="px-6 py-3.5 hidden lg:table-cell">Project</th>
                    <th className="px-6 py-3.5">Assigned Officer</th>
                    <th className="px-6 py-3.5 hidden md:table-cell">Assigned Date</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40 text-slate-200">
                  {filteredAssignments.map((item) => {
                    return (
                      <tr key={item.id} className="hover:bg-slate-700/30 transition duration-150">
                        {/* Parcel Number */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-100 flex items-center gap-2">
                            <span>{item.parcel_number}</span>
                          </div>
                        </td>

                        {/* Owner & Village */}
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <div className="font-medium text-slate-200">{item.owner_name}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="size-3 text-slate-500" />
                            <span>{item.village_name}</span>
                          </div>
                        </td>

                        {/* Project */}
                        <td className="px-6 py-4 font-mono text-xs text-amber-400 hidden lg:table-cell">
                          {item.project_code}
                        </td>

                        {/* Assigned Officer */}
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-200 flex items-center gap-1.5">
                            <User className="size-3.5 text-blue-400 shrink-0" />
                            <span>{item.assigned_officer_name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            {item.assigned_officer_email}
                          </div>
                        </td>

                        {/* Assigned Date */}
                        <td className="px-6 py-4 text-xs text-slate-300 hidden md:table-cell">
                          {item.assigned_at
                            ? new Date(item.assigned_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 border',
                              item.status === 'Active' && 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
                              item.status === 'Completed' && 'bg-blue-950/60 text-blue-400 border-blue-800/60',
                              item.status === 'Cancelled' && 'bg-slate-900 text-slate-400 border-slate-700'
                            )}
                          >
                            {item.status === 'Active' && <Clock className="size-3" />}
                            {item.status === 'Completed' && <CheckCircle2 className="size-3" />}
                            {item.status === 'Cancelled' && <XCircle className="size-3" />}
                            <span>{item.status}</span>
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* View Details */}
                            <button
                              onClick={() => handleOpenDetails(item)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-700/60 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1"
                              title="View Assignment History & Details"
                            >
                              <Eye className="size-3.5 text-blue-400" />
                              <span>Details</span>
                            </button>

                            {/* Open Parcel in Field Verification */}
                            <button
                              onClick={() => handleOpenParcelInVerification(item.parcel_id)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-950/60 border border-blue-800/50 hover:bg-blue-900 text-blue-300 transition flex items-center gap-1"
                              title="Open in Field Verification Module"
                            >
                              <ExternalLink className="size-3.5" />
                              <span>Open Parcel</span>
                            </button>

                            {/* Open 360 Hub Drawer */}
                            <button
                              onClick={() => {
                                setHubParcelId(item.parcel_id)
                                setIsHubOpen(true)
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-950/60 border border-amber-800/50 hover:bg-amber-900 text-amber-300 transition flex items-center gap-1"
                              title="Open 360° Parcel Context Hub"
                            >
                              <Layers className="size-3.5 text-amber-400" />
                              <span>360° Hub</span>
                            </button>

                            {/* Admin/SLAO Specific Mutations */}
                            {isMutationAllowed && item.status === 'Active' && (
                              <>
                                <button
                                  onClick={() => handleOpenReassignModal(item)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-950/60 border border-amber-800/50 hover:bg-amber-900 text-amber-300 transition flex items-center gap-1"
                                  title="Reassign to Another Field Officer"
                                >
                                  <RotateCcw className="size-3.5" />
                                  <span>Reassign</span>
                                </button>

                                <button
                                  onClick={() => handleOpenStatusModal(item, 'Completed')}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-950/60 border border-emerald-800/50 hover:bg-emerald-900 text-emerald-300 transition flex items-center gap-1"
                                  title="Mark Assignment Completed"
                                >
                                  <CheckCircle2 className="size-3.5" />
                                  <span>Complete</span>
                                </button>

                                <button
                                  onClick={() => handleOpenStatusModal(item, 'Cancelled')}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-700 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800/50 text-slate-400 transition"
                                  title="Cancel Assignment"
                                >
                                  <XCircle className="size-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ==================================================================== */}
      {/* MODAL 1: ASSIGN PARCEL (Admin/SLAO Only)                             */}
      {/* ==================================================================== */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
              <h3 className="text-lg font-bold font-serif text-slate-100 flex items-center gap-2">
                <UserPlus className="size-5 text-amber-400" />
                <span>Assign Land Parcel</span>
              </h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="p-6 space-y-4">
              {assignError && (
                <div className="bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-2">
                  <AlertCircle className="size-4 text-rose-400 shrink-0" />
                  <span>{assignError}</span>
                </div>
              )}

              {/* Parcel Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Select Land Parcel *
                </label>
                <select
                  value={selectedParcelId}
                  onChange={(e) => setSelectedParcelId(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="">-- Choose Parcel --</option>
                  {parcelsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.parcel_number} · Owner: {p.owner_name} ({p.village_name} - {p.project_code})
                      {p.has_active_assignment ? ` [Already Assigned to ${p.active_officer_name}]` : ''}
                    </option>
                  ))}
                </select>
                {selectedParcelId && (
                  (() => {
                    const sel = parcelsList.find((p) => p.id === selectedParcelId)
                    if (sel?.has_active_assignment) {
                      return (
                        <p className="text-xs text-amber-400 mt-1 flex items-center gap-1 font-medium">
                          <AlertCircle className="size-3.5" />
                          <span>Warning: This parcel already has an active assignment to {sel.active_officer_name}.</span>
                        </p>
                      )
                    }
                    return null
                  })()
                )}
              </div>

              {/* Field Officer Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Select Field Officer *
                </label>
                <select
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="">-- Choose Field Officer --</option>
                  {officersList.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.full_name || o.email || 'Officer'} ({o.email})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Only active profiles with the &apos;Field Officer&apos; role are displayed.
                </p>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Assignment Instructions / Remarks
                </label>
                <textarea
                  rows={3}
                  value={assignRemarks}
                  onChange={(e) => setAssignRemarks(e.target.value)}
                  placeholder="e.g. Verify boundary coordinates and physical possession status."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignSubmitting}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {assignSubmitting && <RefreshCw className="size-4 animate-spin" />}
                  <span>Submit Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: ASSIGNMENT DETAILS & HISTORY                                */}
      {/* ==================================================================== */}
      {isDetailsModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40 shrink-0">
              <div>
                <h3 className="text-lg font-bold font-serif text-slate-100 flex items-center gap-2">
                  <FileText className="size-5 text-blue-400" />
                  <span>Parcel Assignment Details</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Parcel No: {selectedAssignment.parcel_number} ({selectedAssignment.project_code})
                </p>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
              {/* Current Assignment Overview Grid */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400">Parcel Number</p>
                  <p className="font-semibold text-slate-100 mt-0.5">{selectedAssignment.parcel_number}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Project Code</p>
                  <p className="font-mono text-xs font-semibold text-amber-400 mt-0.5">{selectedAssignment.project_code}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Owner Name</p>
                  <p className="font-medium text-slate-200 mt-0.5">{selectedAssignment.owner_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Village</p>
                  <p className="font-medium text-slate-200 mt-0.5">{selectedAssignment.village_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Assigned Officer</p>
                  <p className="font-medium text-blue-400 mt-0.5">{selectedAssignment.assigned_officer_name}</p>
                  <p className="text-[11px] text-slate-400">{selectedAssignment.assigned_officer_email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Assigned By</p>
                  <p className="font-medium text-slate-300 mt-0.5">{selectedAssignment.assigned_by_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Assigned Date</p>
                  <p className="font-medium text-slate-300 mt-0.5">
                    {selectedAssignment.assigned_at
                      ? new Date(selectedAssignment.assigned_at).toLocaleString('en-IN')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Status</p>
                  <p className="font-semibold mt-0.5">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs',
                        selectedAssignment.status === 'Active' && 'text-emerald-400 bg-emerald-950',
                        selectedAssignment.status === 'Completed' && 'text-blue-400 bg-blue-950',
                        selectedAssignment.status === 'Cancelled' && 'text-slate-400 bg-slate-950'
                      )}
                    >
                      {selectedAssignment.status}
                    </span>
                  </p>
                </div>
                {selectedAssignment.remarks && (
                  <div className="col-span-full border-t border-slate-700/60 pt-3 mt-1">
                    <p className="text-xs text-slate-400">Remarks / Instructions</p>
                    <p className="text-xs text-slate-200 italic mt-0.5 bg-slate-900 p-2.5 rounded-lg border border-slate-750">
                      &quot;{selectedAssignment.remarks}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Historical Audit Trail */}
              <div>
                <h4 className="font-semibold text-slate-100 flex items-center gap-2 mb-3">
                  <History className="size-4 text-amber-400" />
                  <span>Parcel Assignment History</span>
                </h4>

                {historyLoading ? (
                  <div className="p-6 text-center text-slate-400">
                    <RefreshCw className="size-6 animate-spin mx-auto text-amber-400" />
                    <p className="text-xs mt-2">Loading historical assignments...</p>
                  </div>
                ) : parcelHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No prior assignment history recorded.</p>
                ) : (
                  <div className="space-y-2.5">
                    {parcelHistory.map((h, idx) => (
                      <div
                        key={h.id}
                        className="bg-slate-800/40 border border-slate-750 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200">{h.assigned_officer_name}</span>
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded font-mono',
                                h.status === 'Active' && 'text-emerald-400 bg-emerald-950',
                                h.status === 'Completed' && 'text-blue-400 bg-blue-950',
                                h.status === 'Cancelled' && 'text-slate-400 bg-slate-950'
                              )}
                            >
                              {h.status}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            Assigned on:{' '}
                            {h.assigned_at
                              ? new Date(h.assigned_at).toLocaleDateString('en-IN')
                              : 'N/A'}
                            {h.unassigned_at &&
                              ` · Unassigned: ${new Date(h.unassigned_at).toLocaleDateString('en-IN')}`}
                          </p>
                          {h.remarks && <p className="text-slate-300 italic mt-1">&quot;{h.remarks}&quot;</p>}
                        </div>

                        <div className="text-right shrink-0 text-[10px] text-slate-400">
                          Record #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  setHubParcelId(selectedAssignment.parcel_id)
                  setIsHubOpen(true)
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition flex items-center gap-1.5"
              >
                <Layers className="size-3.5" />
                <span>Open 360° Hub</span>
              </button>

              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: REASSIGN PARCEL (Admin/SLAO Only)                           */}
      {/* ==================================================================== */}
      {isReassignModalOpen && reassignTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
              <h3 className="text-lg font-bold font-serif text-slate-100 flex items-center gap-2">
                <RotateCcw className="size-5 text-amber-400" />
                <span>Reassign Parcel Assignment</span>
              </h3>
              <button
                onClick={() => setIsReassignModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleReassignSubmit} className="p-6 space-y-4">
              {reassignError && (
                <div className="bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-2">
                  <AlertCircle className="size-4 text-rose-400 shrink-0" />
                  <span>{reassignError}</span>
                </div>
              )}

              {/* Explanatory Notice */}
              <div className="bg-blue-950/60 border border-blue-800/50 text-blue-200 text-xs p-3 rounded-lg flex items-start gap-2.5">
                <FileText className="size-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Reassignment closes the current active assignment (marking status as &apos;Cancelled&apos;) and creates a new active assignment record for the new Field Officer.
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Current Assigned Officer</p>
                <p className="text-sm font-semibold text-slate-100 mt-1">
                  {reassignTarget.assigned_officer_name} ({reassignTarget.assigned_officer_email})
                </p>
              </div>

              {/* New Officer Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Select New Field Officer *
                </label>
                <select
                  value={reassignOfficerId}
                  onChange={(e) => setReassignOfficerId(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="">-- Choose New Officer --</option>
                  {officersList
                    .filter((o) => o.id !== reassignTarget.assigned_officer_id)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.full_name || o.email || 'Officer'} ({o.email})
                      </option>
                    ))}
                </select>
              </div>

              {/* Reassignment Remarks */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Reassignment Reason / Remarks
                </label>
                <textarea
                  rows={3}
                  value={reassignRemarks}
                  onChange={(e) => setReassignRemarks(e.target.value)}
                  placeholder="e.g. Officer transferred / Reassigned for workload balancing."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* Form Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReassignModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassignSubmitting}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {reassignSubmitting && <RefreshCw className="size-4 animate-spin" />}
                  <span>Confirm Reassignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4: COMPLETE / CANCEL ASSIGNMENT                                */}
      {/* ==================================================================== */}
      {isStatusModalOpen && statusTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
              <h3 className="text-lg font-bold font-serif text-slate-100 flex items-center gap-2">
                {targetStatusAction === 'Completed' ? (
                  <CheckCircle2 className="size-5 text-emerald-400" />
                ) : (
                  <XCircle className="size-5 text-rose-400" />
                )}
                <span>
                  {targetStatusAction === 'Completed' ? 'Complete Assignment' : 'Cancel Assignment'}
                </span>
              </h3>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="p-6 space-y-4">
              {statusError && (
                <div className="bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-2">
                  <AlertCircle className="size-4 text-rose-400 shrink-0" />
                  <span>{statusError}</span>
                </div>
              )}

              <p className="text-sm text-slate-300">
                Are you sure you want to mark assignment for parcel{' '}
                <strong className="text-slate-100">{statusTarget.parcel_number}</strong> as{' '}
                <strong className={targetStatusAction === 'Completed' ? 'text-emerald-400' : 'text-rose-400'}>
                  {targetStatusAction}
                </strong>
                ?
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Completion / Cancellation Remarks
                </label>
                <textarea
                  rows={3}
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="Optional notes or summary..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={statusSubmitting}
                  className={cn(
                    'px-5 py-2 rounded-lg text-sm font-semibold text-white transition flex items-center gap-2 disabled:opacity-50',
                    targetStatusAction === 'Completed'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  )}
                >
                  {statusSubmitting && <RefreshCw className="size-4 animate-spin" />}
                  <span>Confirm {targetStatusAction}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 360 Parcel Context Hub Drawer */}
      <ParcelContextHub
        parcelId={hubParcelId}
        isOpen={isHubOpen}
        onClose={() => setIsHubOpen(false)}
        userRole={userRole}
      />
    </div>
  )
}
