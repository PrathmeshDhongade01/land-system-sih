'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Building2,
  MapPin,
  LandPlot,
  Layers,
  FileText,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  HelpCircle,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface HierarchyPanelProps {
  onSelectParcel?: (parcelId: string) => void
}

type LevelType = 'national' | 'state' | 'district' | 'project' | 'village'

interface BreadcrumbItem {
  label: string
  level: LevelType
  state?: string
  district?: string
  project_code?: string
  village?: string
}

export default function HierarchyPanel({ onSelectParcel }: HierarchyPanelProps) {
  const [level, setLevel] = useState<LevelType>('national')
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null)
  const [selectedProjectCode, setSelectedProjectCode] = useState<string | null>(null)
  const [selectedVillage, setSelectedVillage] = useState<string | null>(null)

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHierarchy = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('level', level)

      if (level === 'state' && selectedState) {
        params.set('state', selectedState)
      } else if (level === 'district' && selectedState && selectedDistrict) {
        params.set('state', selectedState)
        params.set('district', selectedDistrict)
      } else if (level === 'project' && selectedProjectCode) {
        params.set('project_code', selectedProjectCode)
      } else if (level === 'village' && selectedProjectCode && selectedVillage) {
        params.set('project_code', selectedProjectCode)
        params.set('village', selectedVillage)
      }

      const res = await fetch(`/api/hierarchy?${params.toString()}`)
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Unable to load hierarchy data.')
      }

      setData(json)
    } catch (err: any) {
      console.error('[HierarchyPanel] Fetch error:', err)
      setError(err?.message || 'Unable to load hierarchy data.')
    } finally {
      setLoading(false)
    }
  }, [level, selectedState, selectedDistrict, selectedProjectCode, selectedVillage])

  useEffect(() => {
    fetchHierarchy()
  }, [fetchHierarchy])

  // Navigation handlers
  const handleSelectState = (stateName: string) => {
    setSelectedState(stateName)
    setLevel('state')
  }

  const handleSelectDistrict = (distName: string) => {
    setSelectedDistrict(distName)
    setLevel('district')
  }

  const handleSelectProject = (pCode: string) => {
    setSelectedProjectCode(pCode)
    setLevel('project')
  }

  const handleSelectVillage = (vName: string) => {
    setSelectedVillage(vName)
    setLevel('village')
  }

  const handleGoBack = () => {
    if (level === 'village') {
      setSelectedVillage(null)
      setLevel('project')
    } else if (level === 'project') {
      setSelectedProjectCode(null)
      setLevel('district')
    } else if (level === 'district') {
      setSelectedDistrict(null)
      setLevel('state')
    } else if (level === 'state') {
      setSelectedState(null)
      setLevel('national')
    }
  }

  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    if (item.level === 'national') {
      setSelectedState(null)
      setSelectedDistrict(null)
      setSelectedProjectCode(null)
      setSelectedVillage(null)
      setLevel('national')
    } else if (item.level === 'state') {
      setSelectedDistrict(null)
      setSelectedProjectCode(null)
      setSelectedVillage(null)
      setLevel('state')
    } else if (item.level === 'district') {
      setSelectedProjectCode(null)
      setSelectedVillage(null)
      setLevel('district')
    } else if (item.level === 'project') {
      setSelectedVillage(null)
      setLevel('project')
    }
  }

  // Construct breadcrumb trail
  const breadcrumbs: BreadcrumbItem[] = [{ label: 'India (National)', level: 'national' }]
  if (selectedState) {
    breadcrumbs.push({ label: selectedState, level: 'state', state: selectedState })
  }
  if (selectedDistrict) {
    breadcrumbs.push({
      label: selectedDistrict,
      level: 'district',
      state: selectedState || undefined,
      district: selectedDistrict,
    })
  }
  if (selectedProjectCode) {
    breadcrumbs.push({
      label: selectedProjectCode,
      level: 'project',
      project_code: selectedProjectCode,
    })
  }
  if (selectedVillage) {
    breadcrumbs.push({
      label: selectedVillage,
      level: 'village',
      project_code: selectedProjectCode || undefined,
      village: selectedVillage,
    })
  }

  return (
    <section
      aria-label="National Geographic and Project Drill-Down"
      className="rounded-lg border border-border bg-card shadow-sm overflow-hidden"
    >
      {/* Panel Header */}
      <div className="border-b border-border bg-slate-900 text-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-amber-400 ring-1 ring-slate-700">
              <Globe className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Administrative Drill-Down
                </span>
                <span className="rounded bg-blue-900/80 px-2 py-0.5 text-[10px] font-semibold text-blue-200 uppercase">
                  Level: {level}
                </span>
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-100">
                National Geographic &amp; Project Hierarchy
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {level !== 'national' && (
              <button
                type="button"
                onClick={handleGoBack}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
                aria-label="Navigate to previous hierarchy level"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchHierarchy}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
              aria-label="Refresh hierarchy data"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Breadcrumbs Trail */}
        <nav
          aria-label="Hierarchy Breadcrumb"
          className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-3 text-xs text-slate-300"
        >
          {breadcrumbs.map((item, idx) => {
            const isLast = idx === breadcrumbs.length - 1
            return (
              <div key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight className="size-3.5 text-slate-500 shrink-0" />}
                {isLast ? (
                  <span className="font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                    {item.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBreadcrumbClick(item)}
                    className="font-medium hover:text-white hover:underline transition-colors"
                  >
                    {item.label}
                  </button>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* Main Panel Content Body */}
      <div className="p-4 sm:p-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <RefreshCw className="size-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-semibold text-foreground">Loading Hierarchy Data...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Fetching server-side aggregated metrics for level: <span className="capitalize">{level}</span>
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-xs text-red-800 flex items-start gap-3 shadow-xs">
            <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-red-900">Unable to load hierarchy data</p>
              <p className="mt-1 text-red-700">{error}</p>
              <button
                type="button"
                onClick={fetchHierarchy}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="size-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* LEVEL 1: NATIONAL VIEW */}
            {level === 'national' && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  <div className="rounded-lg border border-border bg-slate-50 dark:bg-slate-900 p-3.5 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">States</p>
                    <p className="mt-1 font-serif text-2xl font-bold text-foreground">{data.total_states}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-slate-50 dark:bg-slate-900 p-3.5 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Districts</p>
                    <p className="mt-1 font-serif text-2xl font-bold text-foreground">{data.total_districts}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-slate-50 dark:bg-slate-900 p-3.5 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Projects</p>
                    <p className="mt-1 font-serif text-2xl font-bold text-foreground">{data.total_projects}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-slate-50 dark:bg-slate-900 p-3.5 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Villages</p>
                    <p className="mt-1 font-serif text-2xl font-bold text-foreground">{data.total_villages}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-slate-50 dark:bg-slate-900 p-3.5 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Parcels</p>
                    <p className="mt-1 font-serif text-2xl font-bold text-foreground">{data.total_parcels}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-slate-50 dark:bg-slate-900 p-3.5 text-center col-span-2 sm:col-span-2 lg:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notified / Affected Area</p>
                    <p className="mt-1 text-sm font-bold text-foreground">
                      {(data.total_notified_area_sqm / 10000).toFixed(2)} Ha / {(data.total_affected_area_sqm / 10000).toFixed(2)} Ha
                    </p>
                  </div>
                </div>

                {/* States Table */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
                      <MapPin className="size-4 text-primary" />
                      <span>Represented States ({data.states?.length || 0})</span>
                    </h4>
                    <span className="text-xs text-muted-foreground">Click a state to view districts</span>
                  </div>

                  {(!data.states || data.states.length === 0) ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      No states found in national hierarchy.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="px-4 py-3">State Name</th>
                            <th className="px-4 py-3 text-center">Districts</th>
                            <th className="px-4 py-3 text-center">Projects</th>
                            <th className="px-4 py-3 text-center">Villages</th>
                            <th className="px-4 py-3 text-center">Parcels</th>
                            <th className="px-4 py-3 text-right">Notified Area (sq m)</th>
                            <th className="px-4 py-3 text-right">Affected Area (sq m)</th>
                            <th className="px-4 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                          {data.states.map((st: any) => (
                            <tr
                              key={st.state}
                              onClick={() => handleSelectState(st.state)}
                              className="hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                              <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                                <MapPin className="size-3.5 text-primary shrink-0" />
                                <span>{st.state}</span>
                              </td>
                              <td className="px-4 py-3 text-center font-medium">{st.district_count}</td>
                              <td className="px-4 py-3 text-center font-medium">{st.project_count}</td>
                              <td className="px-4 py-3 text-center font-medium">{st.village_count}</td>
                              <td className="px-4 py-3 text-center font-bold text-primary">{st.parcel_count}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{st.notified_area_sqm.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{st.affected_area_sqm.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                                  <span>View Districts</span>
                                  <ChevronRight className="size-3" />
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LEVEL 2: STATE VIEW */}
            {level === 'state' && (
              <div className="space-y-6">
                {/* State Summary Banner */}
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                        State Summary
                      </span>
                      <h4 className="font-serif text-xl font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
                        <MapPin className="size-5 text-blue-600" />
                        <span>{data.state}</span>
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-white dark:bg-slate-900 border border-blue-200 px-3 py-1 font-medium text-slate-800 dark:text-slate-200">
                        Districts: <strong className="text-blue-700">{data.district_count}</strong>
                      </span>
                      <span className="rounded bg-white dark:bg-slate-900 border border-blue-200 px-3 py-1 font-medium text-slate-800 dark:text-slate-200">
                        Projects: <strong className="text-blue-700">{data.project_count}</strong>
                      </span>
                      <span className="rounded bg-white dark:bg-slate-900 border border-blue-200 px-3 py-1 font-medium text-slate-800 dark:text-slate-200">
                        Villages: <strong className="text-blue-700">{data.village_count}</strong>
                      </span>
                      <span className="rounded bg-white dark:bg-slate-900 border border-blue-200 px-3 py-1 font-medium text-slate-800 dark:text-slate-200">
                        Parcels: <strong className="text-blue-700">{data.parcel_count}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Districts List */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
                      <Building2 className="size-4 text-primary" />
                      <span>Districts in {data.state} ({data.districts?.length || 0})</span>
                    </h4>
                    <span className="text-xs text-muted-foreground">Click a district to view projects</span>
                  </div>

                  {(!data.districts || data.districts.length === 0) ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      No districts found for this state.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="px-4 py-3">District Name</th>
                            <th className="px-4 py-3 text-center">Projects</th>
                            <th className="px-4 py-3 text-center">Villages</th>
                            <th className="px-4 py-3 text-center">Parcels</th>
                            <th className="px-4 py-3 text-right">Notified Area (sq m)</th>
                            <th className="px-4 py-3 text-right">Affected Area (sq m)</th>
                            <th className="px-4 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                          {data.districts.map((dst: any) => (
                            <tr
                              key={dst.district}
                              onClick={() => handleSelectDistrict(dst.district)}
                              className="hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                              <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                                <Building2 className="size-3.5 text-primary shrink-0" />
                                <span>{dst.district}</span>
                              </td>
                              <td className="px-4 py-3 text-center font-medium">{dst.project_count}</td>
                              <td className="px-4 py-3 text-center font-medium">{dst.village_count}</td>
                              <td className="px-4 py-3 text-center font-bold text-primary">{dst.parcel_count}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{dst.notified_area_sqm.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{dst.affected_area_sqm.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                                  <span>View Projects</span>
                                  <ChevronRight className="size-3" />
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LEVEL 3: DISTRICT VIEW */}
            {level === 'district' && (
              <div className="space-y-6">
                {/* District Summary Banner */}
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        District Summary · {data.state}
                      </span>
                      <h4 className="font-serif text-xl font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
                        <Building2 className="size-5 text-emerald-600" />
                        <span>{data.district} District</span>
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-white dark:bg-slate-900 border border-emerald-200 px-3 py-1 font-medium text-slate-800 dark:text-slate-200">
                        Projects: <strong className="text-emerald-700">{data.project_count}</strong>
                      </span>
                      <span className="rounded bg-white dark:bg-slate-900 border border-emerald-200 px-3 py-1 font-medium text-slate-800 dark:text-slate-200">
                        Villages: <strong className="text-emerald-700">{data.village_count}</strong>
                      </span>
                      <span className="rounded bg-white dark:bg-slate-900 border border-emerald-200 px-3 py-1 font-medium text-slate-800 dark:text-slate-200">
                        Parcels: <strong className="text-emerald-700">{data.parcel_count}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Projects List */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
                      <Layers className="size-4 text-primary" />
                      <span>Projects Spanning {data.district} ({data.projects?.length || 0})</span>
                    </h4>
                    <span className="text-xs text-muted-foreground">Click a project to view villages</span>
                  </div>

                  {(!data.projects || data.projects.length === 0) ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      No projects found for this district.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Project Code</th>
                            <th className="px-4 py-3">Project Name</th>
                            <th className="px-4 py-3">Department</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center">Villages</th>
                            <th className="px-4 py-3 text-center">Parcels</th>
                            <th className="px-4 py-3 text-right">Length (km)</th>
                            <th className="px-4 py-3 text-right">Required (Ha)</th>
                            <th className="px-4 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                          {data.projects.map((prj: any) => (
                            <tr
                              key={prj.project_code}
                              onClick={() => handleSelectProject(prj.project_code)}
                              className="hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                              <td className="px-4 py-3 font-mono font-bold text-primary">{prj.project_code}</td>
                              <td className="px-4 py-3 font-semibold text-foreground">{prj.project_name}</td>
                              <td className="px-4 py-3 text-muted-foreground">{prj.department || 'N/A'}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                                  {prj.status || 'Active'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-medium">{prj.village_count}</td>
                              <td className="px-4 py-3 text-center font-bold text-primary">{prj.parcel_count}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">
                                {prj.corridor_length_km != null ? prj.corridor_length_km : 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-right text-muted-foreground">
                                {prj.total_area_required_ha != null ? prj.total_area_required_ha : 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                                  <span>View Villages</span>
                                  <ChevronRight className="size-3" />
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LEVEL 4: PROJECT VIEW */}
            {level === 'project' && (
              <div className="space-y-6">
                {/* Project Detail Header Card */}
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-900 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-900/60 px-2 py-0.5 rounded">
                          {data.project?.project_code}
                        </span>
                        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                          {data.project?.status}
                        </span>
                      </div>
                      <h4 className="font-serif text-xl font-bold text-amber-950 dark:text-amber-100 mt-1">
                        {data.project?.project_name}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Department: {data.project?.department || 'Ministry of Road Transport & Highways'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-white dark:bg-slate-900 border border-amber-200 px-3 py-1 font-medium text-slate-800 dark:text-slate-200">
                        Corridor Length: <strong>{data.project?.corridor_length_km ?? 'N/A'} km</strong>
                      </span>
                      <span className="rounded bg-white dark:bg-slate-900 border border-amber-200 px-3 py-1 font-medium text-slate-800 dark:text-slate-200">
                        Required Area: <strong>{data.project?.total_area_required_ha ?? 'N/A'} Ha</strong>
                      </span>
                      <span className="rounded bg-white dark:bg-slate-900 border border-amber-200 px-3 py-1 font-medium text-slate-800 dark:text-slate-200">
                        Villages: <strong>{data.project?.village_count}</strong>
                      </span>
                      <span className="rounded bg-white dark:bg-slate-900 border border-amber-200 px-3 py-1 font-medium text-slate-800 dark:text-slate-200">
                        Parcels: <strong>{data.project?.parcel_count}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Villages List */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
                      <LandPlot className="size-4 text-primary" />
                      <span>Villages Under Project {data.project?.project_code} ({data.villages?.length || 0})</span>
                    </h4>
                    <span className="text-xs text-muted-foreground">Click a village to view parcels</span>
                  </div>

                  {(!data.villages || data.villages.length === 0) ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      No villages found under this project.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Village Name</th>
                            <th className="px-4 py-3">State</th>
                            <th className="px-4 py-3">District</th>
                            <th className="px-4 py-3 text-center">Parcels</th>
                            <th className="px-4 py-3 text-right">Notified Area (sq m)</th>
                            <th className="px-4 py-3 text-right">Affected Area (sq m)</th>
                            <th className="px-4 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                          {data.villages.map((vlg: any) => (
                            <tr
                              key={vlg.village_name}
                              onClick={() => handleSelectVillage(vlg.village_name)}
                              className="hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                              <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                                <LandPlot className="size-3.5 text-primary shrink-0" />
                                <span>{vlg.village_name}</span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{vlg.state || 'N/A'}</td>
                              <td className="px-4 py-3 text-muted-foreground">{vlg.district || 'N/A'}</td>
                              <td className="px-4 py-3 text-center font-bold text-primary">{vlg.parcel_count}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{vlg.notified_area_sqm.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{vlg.affected_area_sqm.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                                  <span>View Parcels</span>
                                  <ChevronRight className="size-3" />
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LEVEL 5: VILLAGE VIEW */}
            {level === 'village' && (
              <div className="space-y-6">
                {/* Village Header Banner */}
                <div className="rounded-lg border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300">
                        Village Parcel Rollup · Project {data.project_code}
                      </span>
                      <h4 className="font-serif text-xl font-bold text-purple-950 dark:text-purple-100 flex items-center gap-2">
                        <LandPlot className="size-5 text-purple-600" />
                        <span>Village: {data.village}</span>
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Jurisdiction: {data.district}, {data.state}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded bg-white dark:bg-slate-900 border border-purple-200 px-3.5 py-1.5 font-semibold text-xs text-purple-900 dark:text-purple-200">
                        Total Parcels: <strong>{data.parcels?.length || 0}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Parcels Table */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      <span>Land Parcels in {data.village} ({data.parcels?.length || 0})</span>
                    </h4>
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-800">
                      Privacy Protected: Owner details redacted
                    </span>
                  </div>

                  {(!data.parcels || data.parcels.length === 0) ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      No parcels found in this village.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Parcel Number</th>
                            <th className="px-4 py-3">Survey No</th>
                            <th className="px-4 py-3">Khasra No</th>
                            <th className="px-4 py-3">Taluka</th>
                            <th className="px-4 py-3 text-center">Verification</th>
                            <th className="px-4 py-3 text-center">Possession</th>
                            <th className="px-4 py-3 text-right">Notified (sq m)</th>
                            <th className="px-4 py-3 text-right">Affected (sq m)</th>
                            <th className="px-4 py-3 text-center">360° Hub Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                          {data.parcels.map((pcl: any) => (
                            <tr
                              key={pcl.id}
                              className="hover:bg-muted/50 transition-colors"
                            >
                              <td className="px-4 py-3 font-mono font-bold text-primary">{pcl.parcel_number || 'N/A'}</td>
                              <td className="px-4 py-3 text-foreground font-medium">{pcl.survey_number || 'N/A'}</td>
                              <td className="px-4 py-3 text-muted-foreground">{pcl.khasra_no || 'N/A'}</td>
                              <td className="px-4 py-3 text-muted-foreground">{pcl.taluka_name || 'N/A'}</td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                    pcl.verification_status === 'Verified'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                      : pcl.verification_status === 'Needs Review'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  )}
                                >
                                  {pcl.verification_status === 'Verified' && <CheckCircle className="size-3" />}
                                  {pcl.verification_status === 'Needs Review' && <AlertTriangle className="size-3" />}
                                  {pcl.verification_status === 'Pending' && <Clock className="size-3" />}
                                  <span>{pcl.verification_status}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                  {pcl.possession_status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{pcl.notified_area_sqm.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{pcl.affected_area_sqm.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onSelectParcel && pcl.id) {
                                      onSelectParcel(pcl.id)
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                                  aria-label={`Open 360 Context Hub for parcel ${pcl.parcel_number || pcl.id}`}
                                >
                                  <Eye className="size-3.5" />
                                  <span>Open 360° Hub</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
