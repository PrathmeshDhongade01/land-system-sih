'use client'

import { useState } from 'react'
import {
  Layers,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MapPin,
  ShieldAlert,
  ArrowRightLeft,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConflictDetectionPanelProps {
  userRole?: string | null
  onConflictDetected?: (location: { latitude: number; longitude: number; title: string } | null) => void
  onAlertsEvaluated?: () => void
  className?: string
}

export interface ConflictResultData {
  conflict_detected: boolean
  project_a: { project_code: string; project_name: string }
  project_b: { project_code: string; project_name: string }
  overlap_area_sqm: number
  overlap_area_ha: number
  overlap_centroid?: { latitude: number; longitude: number } | null
  alert_created_or_active?: boolean
  alert_key?: string
  message?: string
}

const DEFAULT_PROJECT_OPTIONS = [
  { code: 'NHAI-DEL-BOM-01', name: 'Delhi–Mumbai Expressway Corridor' },
  { code: 'NHAI-NSK-SURCHE', name: 'Nashik–Surat Economic Highway' },
<<<<<<< HEAD
=======
  { code: 'SM-NASHIK-DEMO-01', name: 'Mumbai–Nagpur Samruddhi Expressway — Nashik Corridor Demo' },
>>>>>>> 613c3c27221b6835942e50081b0cdf1c749af6a2
  { code: 'NH-334B', name: 'Rampur–Baghpat Expressway Corridor' },
  { code: 'NH-709A', name: 'Kishanganj Bypass Realignment' },
  { code: 'EW-14', name: 'Eastern Freight & Logistics Spur' },
]

export default function ConflictDetectionPanel({
  userRole,
  onConflictDetected,
  onAlertsEvaluated,
  className,
}: ConflictDetectionPanelProps) {
  const [projectA, setProjectA] = useState<string>('NHAI-DEL-BOM-01')
  const [projectB, setProjectB] = useState<string>('NHAI-NSK-SURCHE')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ConflictResultData | null>(null)

  const isSameProject = Boolean(projectA && projectB && projectA === projectB)
  const isMissingProject = !projectA || !projectB

  const ALLOWED_EVALUATE_ROLES = ['Admin', 'SLAO', 'MoRTH Nodal Officer']
  // Only disable for unauthorized role if userRole is explicitly known and not in allowed roles
  const isUnauthorizedRole = Boolean(userRole && !ALLOWED_EVALUATE_ROLES.includes(userRole))
  const canEvaluate = !isUnauthorizedRole

  const handleDetectConflict = async () => {
    if (isSameProject || isMissingProject || !canEvaluate || loading) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Use evaluate-conflict endpoint to calculate overlap and sync intelligent alert
      const res = await fetch('/api/alerts/evaluate-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_code_a: projectA,
          project_code_b: projectB,
        }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok || !json.success) {
        if (res.status === 403) {
          setError('Your role does not have permission to evaluate GIS conflicts.')
        } else if (res.status === 401) {
          setError('Authentication required. Please sign in to evaluate GIS conflicts.')
        } else {
          setError(json.error || 'Failed to evaluate spatial conflict.')
        }
        if (onConflictDetected) onConflictDetected(null)
      } else {
        setResult(json)
        if (json.conflict_detected && json.overlap_centroid) {
          if (onConflictDetected) {
            onConflictDetected({
              latitude: json.overlap_centroid.latitude,
              longitude: json.overlap_centroid.longitude,
              title: `Potential GIS Conflict: ${json.project_a?.project_code || projectA} ↔ ${json.project_b?.project_code || projectB}`,
            })
          }
        } else {
          if (onConflictDetected) onConflictDetected(null)
        }

        if (onAlertsEvaluated) {
          onAlertsEvaluated()
        }
      }
    } catch (err: any) {
      console.error('[ConflictDetectionPanel] Error:', err)
      setError('Spatial conflict detection service unavailable.')
      if (onConflictDetected) onConflictDetected(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSwapProjects = () => {
    setProjectA(projectB)
    setProjectB(projectA)
  }

  return (
    <section
      aria-label="GIS Spatial Conflict Detection Module"
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm',
        className
      )}
    >
      {/* Panel Header */}
      <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300">
              <Layers className="size-4" />
            </div>
            <h2 className="font-serif text-base font-semibold text-foreground">
              GIS Conflict Detection
            </h2>
            <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[10px] font-bold">
              Multi-Corridor GIS Analysis
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Identify overlapping infrastructure acquisition corridors before they create coordination delays or duplicated acquisition.
          </p>
        </div>

        {/* Prototype Data Notice Badge */}
        <div className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 shrink-0">
          <Info className="size-3 text-amber-600 shrink-0" />
          <span>Prototype Corridor GIS Layer</span>
        </div>
      </div>

      {/* Selectors & Actions Toolbar */}
      <div className="p-5 bg-muted/20 border-b border-border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
          {/* Project A Selector */}
          <div className="md:col-span-5 space-y-1">
            <label className="block text-xs font-semibold text-foreground">
              Project Corridor A <span className="text-red-500">*</span>
            </label>
            <select
              value={projectA}
              onChange={(e) => setProjectA(e.target.value)}
              className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground shadow-2xs focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
            >
              {DEFAULT_PROJECT_OPTIONS.map((p) => (
                <option key={`a-${p.code}`} value={p.code}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex items-center justify-center pt-4 md:pt-5">
            <button
              type="button"
              onClick={handleSwapProjects}
              title="Swap Project A and B"
              className="size-8 flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ArrowRightLeft className="size-3.5" />
            </button>
          </div>

          {/* Project B Selector */}
          <div className="md:col-span-5 space-y-1">
            <label className="block text-xs font-semibold text-foreground">
              Project Corridor B <span className="text-red-500">*</span>
            </label>
            <select
              value={projectB}
              onChange={(e) => setProjectB(e.target.value)}
              className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground shadow-2xs focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
            >
              {DEFAULT_PROJECT_OPTIONS.map((p) => (
                <option key={`b-${p.code}`} value={p.code}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Validation Error Warnings */}
        {isSameProject && (
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
            <AlertCircle className="size-3.5 shrink-0 text-amber-600" />
            Please select two different project corridors to calculate spatial overlap.
          </p>
        )}

        {isUnauthorizedRole && (
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
            <AlertCircle className="size-3.5 shrink-0 text-amber-600" />
            GIS conflict evaluation requires Admin, SLAO, or MoRTH Nodal Officer access.
          </p>
        )}

        {/* Detect Conflict Action Button */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-muted-foreground">
            Calculates 60m RoW corridor intersections &amp; auto-syncs high-priority alerts.
          </p>

          <button
            type="button"
            onClick={handleDetectConflict}
            disabled={loading || isSameProject || isMissingProject || !canEvaluate}
            title={
              isUnauthorizedRole
                ? 'GIS conflict evaluation requires Admin, SLAO, or MoRTH Nodal Officer access.'
                : isSameProject
                ? 'Please select two different projects'
                : undefined
            }
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                <span>Running Spatial Analysis...</span>
              </>
            ) : (
              <>
                <ShieldAlert className="size-3.5" />
                <span>Detect Spatial Conflict</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 p-4 px-5 text-xs text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200 flex items-center gap-3">
          <AlertCircle className="size-5 text-red-600 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-semibold text-red-900 dark:text-red-100">Conflict Detection Error</p>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Result Display Area */}
      {result && (
        <div className="p-5 space-y-4">
          {result.conflict_detected ? (
            /* CONFLICT RESULT CARD (RED/AMBER THEME) */
            <div className="rounded-lg border border-red-300 bg-red-50/60 dark:bg-red-950/30 dark:border-red-900/60 p-5 space-y-4 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/50 dark:text-red-200">
                    <AlertTriangle className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-base font-bold text-red-900 dark:text-red-100">
                        Potential Spatial Conflict Detected
                      </h3>
                      <span className="rounded-md bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 text-[10px] font-extrabold uppercase dark:bg-red-950 dark:text-red-300">
                        High Priority Alert Created
                      </span>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-0.5 font-medium">
                      Corridor Right-of-Way overlap detected between {result.project_a.project_code} and {result.project_b.project_code}
                    </p>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-md border border-red-200 bg-white/80 dark:bg-red-950/40 p-3 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
                    Overlap Area (sqm)
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-red-900 dark:text-red-100">
                    {result.overlap_area_sqm.toLocaleString('en-IN')} sqm
                  </p>
                </div>

                <div className="rounded-md border border-red-200 bg-white/80 dark:bg-red-950/40 p-3 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
                    Overlap Area (hectares)
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-red-900 dark:text-red-100">
                    {result.overlap_area_ha} Ha
                  </p>
                </div>

                <div className="rounded-md border border-red-200 bg-white/80 dark:bg-red-950/40 p-3 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
                    Conflict Location
                  </p>
                  {result.overlap_centroid ? (
                    <p className="mt-1 font-mono text-xs font-semibold text-red-900 dark:text-red-100 flex items-center gap-1">
                      <MapPin className="size-3.5 text-red-600 shrink-0" />
                      <span>{result.overlap_centroid.latitude}, {result.overlap_centroid.longitude}</span>
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-red-800">Coordinates pending</p>
                  )}
                </div>
              </div>

              {/* Recommendation Box */}
              <div className="rounded-md border border-red-200 bg-white/60 dark:bg-red-950/20 p-3 text-xs text-red-900 dark:text-red-200 leading-relaxed font-medium">
                💡 <strong>Recommendation:</strong> Coordinate with the concerned department and review overlapping acquisition corridors before proceeding further with statutory notifications or awards.
              </div>
            </div>
          ) : (
            /* NO-CONFLICT RESULT CARD (EMERALD/GREEN THEME) */
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-900/50 p-5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-emerald-900 dark:text-emerald-100">
                    No Spatial Conflict Detected
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    No corridor Right-of-Way overlap found between {result.project_a.project_code} and {result.project_b.project_code} (Overlap Area: 0 sqm).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
