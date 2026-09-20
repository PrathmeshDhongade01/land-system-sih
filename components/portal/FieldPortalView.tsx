'use client'

import { useState, useEffect, Suspense } from 'react'
import {
  RefreshCw,
  Footprints,
  Camera,
  Upload,
  CheckCircle2,
  MapPin,
  FileCheck,
  FileText,
  CheckCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import { FieldVerificationContent } from '@/app/field-verification/page'
import FieldOfficerKpiCards from '@/components/FieldOfficerKpiCards'
import MyTasksPanel from '@/components/MyTasksPanel'
import ParcelContextHub from '@/components/ParcelContextHub'
import { cn } from '@/lib/utils'

export interface FieldPortalViewProps {
  userEmail?: string | null
  userRole?: string | null
}

export default function FieldPortalView({ userEmail, userRole }: FieldPortalViewProps) {
  const [hubParcelId, setHubParcelId] = useState<string | null>(null)
  const [isHubOpen, setIsHubOpen] = useState(false)

  // Listen to URL hash for deep linking
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 300)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background space-y-6 pb-12">
      {/* Portal Hero Sub-header */}
      <div className="border-b border-border bg-card px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Footprints className="size-4" />
            </div>
            <div>
              <h1 className="font-serif text-base font-bold text-foreground">
                Field Officer Portal
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Ground-truth parcel inspections &middot; Geo-tagged evidence &middot; Mobile verification
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
              <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
              Field Officer Mode Active
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2.5 p-3.5 bg-card border border-border rounded-xl shadow-2xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
            Quick Actions:
          </span>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('verification')
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors"
          >
            <Camera className="size-3.5" />
            <span>Open Camera</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('verification')
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-accent px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-colors"
          >
            <Upload className="size-3.5 text-primary" />
            <span>Upload Evidence</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('verification')
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-accent px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-colors"
          >
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span>Mark as Verified</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('verification')
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-accent px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-colors"
          >
            <MapPin className="size-3.5 text-blue-600" />
            <span>View Location</span>
          </button>
        </div>

        {/* Section: Field Reports & KPIs */}
        <section id="reports" aria-labelledby="field-reports-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="field-reports-heading" className="font-serif text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck className="size-4 text-emerald-600" />
              Inspection Progress &amp; Field Reports
            </h2>
            <span className="text-[11px] text-muted-foreground">Assigned survey quota</span>
          </div>
          <FieldOfficerKpiCards />
        </section>

        {/* Section: Assigned Task Queue */}
        <section id="tasks" aria-labelledby="assigned-tasks-heading">
          <MyTasksPanel
            userRole={userRole}
            onOpenParcel={(parcelId) => {
              setHubParcelId(parcelId)
              setIsHubOpen(true)
            }}
          />
        </section>

        {/* Section: Full Field Verification Workspace */}
        <section id="verification" aria-labelledby="verification-workspace-heading" className="pt-2">
          <Suspense
            fallback={
              <div className="flex items-center justify-center p-12 text-xs text-muted-foreground">
                <RefreshCw className="size-5 animate-spin text-primary mr-2" />
                <span>Loading Field Verification Workspace...</span>
              </div>
            }
          >
            <div id="evidence">
              <FieldVerificationContent />
            </div>
          </Suspense>
        </section>
      </div>

      <ParcelContextHub
        parcelId={hubParcelId}
        isOpen={isHubOpen}
        onClose={() => setIsHubOpen(false)}
        userRole={userRole}
      />
    </div>
  )
}
