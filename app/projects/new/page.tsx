'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  FileText,
  FolderPlus,
  Loader2,
  MapPin,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
  'Multi-State / Corridor',
]

const PROJECT_TYPES = [
  'National Highway','State Highway','Railway','Irrigation',
  'Power Transmission','Urban Development','Defence','Other',
]

const ACQUIRING_AUTHORITIES = [
  'NHAI – National Highways Authority of India',
  'MoRD – Ministry of Rural Development',
  'Ministry of Railways',
  'Central Water Commission',
  'Power Grid Corporation of India',
  'DFCCIL – Dedicated Freight Corridor',
  'State PWD',
  'State Irrigation Department',
  'Urban Development Authority',
  'Defence Estates Office',
  'Other',
]

const ALLOWED_ROLES = new Set(['Admin', 'SLAO', 'MoRTH Nodal Officer'])

/* -------------------------------------------------------------------------- */
/* Chakra Emblem                                                              */
/* -------------------------------------------------------------------------- */

function ChakraEmblem({ className }: { className?: string }) {
  const spokes = Array.from({ length: 24 })
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Ashoka Chakra">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle cx="50" cy="50" r="6" fill="currentColor" />
      {spokes.map((_, i) => (
        <line key={i} x1="50" y1="50" x2="50" y2="8" stroke="currentColor" strokeWidth="1.5"
          transform={`rotate(${(i * 360) / 24} 50 50)`} />
      ))}
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/* Step indicator                                                              */
/* -------------------------------------------------------------------------- */

function StepIndicator({ step, currentStep }: { step: number; label: string; currentStep: number }) {
  const done    = currentStep > step
  const active  = currentStep === step
  return (
    <div className={cn(
      'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
      done   ? 'bg-green-600 text-white' :
      active ? 'bg-primary text-primary-foreground' :
               'bg-muted text-muted-foreground'
    )}>
      {done ? <CheckCircle2 className="size-4" /> : step}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Form field helpers                                                          */
/* -------------------------------------------------------------------------- */

function Field({ label, required, children, hint }: {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors'

const selectClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors cursor-pointer'

/* -------------------------------------------------------------------------- */
/* File upload zone                                                            */
/* -------------------------------------------------------------------------- */

function FileUploadZone({
  label, accept, hint, file, onFile, icon: Icon,
}: {
  label: string
  accept: string
  hint: string
  file: File | null
  onFile: (f: File | null) => void
  icon: React.ElementType
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-green-300 bg-green-50 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="size-4 shrink-0 text-green-600" />
            <span className="truncate text-xs font-medium text-green-800">{file.name}</span>
            <span className="text-[10px] text-green-600">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
          <button type="button" onClick={() => onFile(null)}
            className="shrink-0 text-muted-foreground hover:text-red-600 transition-colors">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/20 px-4 py-6 transition-colors hover:bg-muted/40">
          <Icon className="size-6 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Click to upload</span>
          <span className="text-[11px] text-muted-foreground text-center">{hint}</span>
          <input type="file" className="sr-only" accept={accept}
            onChange={(e) => onFile(e.target.files?.[0] || null)} />
        </label>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function CreateProjectPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [createdProject, setCreatedProject] = useState<any>(null)

  // Step 1 fields
  const [projectName, setProjectName] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [state, setState] = useState('')
  const [district, setDistrict] = useState('')
  const [projectType, setProjectType] = useState('')
  const [acquiringAuthority, setAcquiringAuthority] = useState('')
  const [totalArea, setTotalArea] = useState('')
  const [corridorLength, setCorridorLength] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [description, setDescription] = useState('')

  // Step 2 files
  const [gisFile, setGisFile] = useState<File | null>(null)
  const [docFile, setDocFile] = useState<File | null>(null)

  // Auth check
  useEffect(() => {
    const client = createClient()
    client.auth.getUser().then((res: any) => {
      const data = res?.data
      if (!data?.user) {
        router.push('/login')
        return
      }
      client.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
        .then((profRes: any) => {
          const prof = profRes?.data
          const role = prof?.role || null
          setUserRole(role)
          setAuthChecked(true)
          if (role && !ALLOWED_ROLES.has(role)) {
            // Not authorized — redirect after brief delay
            setTimeout(() => router.push('/'), 2000)
          }
        })
    })
  }, [router])

  // Auto-generate project code from name
  useEffect(() => {
    if (projectName && !projectCode) {
      const code = projectName
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .split(/\s+/)
        .slice(0, 4)
        .map((w) => w.slice(0, 4))
        .join('-')
      setProjectCode(code)
    }
  }, [projectName, projectCode])

  const step1Valid = projectName.trim() && projectCode.trim()
  const step2Valid = true // files are optional

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)

    try {
      const fd = new FormData()
      fd.append('project_name', projectName.trim())
      fd.append('project_code', projectCode.trim())
      if (state) fd.append('state', state)
      if (district) fd.append('district', district)
      if (projectType) fd.append('project_type', projectType)
      if (acquiringAuthority) fd.append('acquiring_authority', acquiringAuthority)
      if (totalArea) fd.append('total_area_required_ha', totalArea)
      if (corridorLength) fd.append('corridor_length_km', corridorLength)
      if (targetDate) fd.append('target_date', targetDate)
      if (description) fd.append('description', description)
      if (gisFile) fd.append('gis_file', gisFile)
      if (docFile) fd.append('proposal_document', docFile)

      const res = await fetch('/api/projects', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))

      if (!res.ok || !json.success) {
        setSubmitError(json.error || 'Failed to create project. Please try again.')
        return
      }

      setCreatedProject(json.data)
      setSubmitted(true)
    } catch (err: any) {
      setSubmitError(err?.message || 'Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Loading / auth states ── */
  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  if (userRole && !ALLOWED_ROLES.has(userRole)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <AlertCircle className="size-10 text-red-500" />
        <h1 className="font-serif text-xl font-semibold text-foreground">Access Restricted</h1>
        <p className="text-sm text-muted-foreground">
          Only Admin, SLAO, or MoRD Nodal Officers can create acquisition projects.
        </p>
        <p className="text-xs text-muted-foreground">Redirecting to dashboard…</p>
      </div>
    )
  }

  /* ── Success state ── */
  if (submitted && createdProject) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="size-8 text-green-600" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Project Created!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono font-medium text-foreground">{createdProject.project_code}</span> · {createdProject.project_name}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 text-left text-sm w-full max-w-md space-y-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium text-foreground">{createdProject.status || 'Draft'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Review Status</span><span className="font-medium text-green-700">{createdProject.review_status || 'Submitted'}</span></div>
          {createdProject.state && <div className="flex justify-between"><span className="text-muted-foreground">State</span><span className="font-medium text-foreground">{createdProject.state}</span></div>}
          {createdProject.total_area_required_ha && <div className="flex justify-between"><span className="text-muted-foreground">Area</span><span className="font-medium text-foreground">{createdProject.total_area_required_ha} Ha</span></div>}
        </div>
        <div className="flex gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Back to Dashboard
          </Link>
          <button type="button" onClick={() => { setSubmitted(false); setStep(1); setProjectName(''); setProjectCode(''); setState(''); setDistrict(''); setProjectType(''); setAcquiringAuthority(''); setTotalArea(''); setCorridorLength(''); setTargetDate(''); setDescription(''); setGisFile(null); setDocFile(null); }}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            Create Another
          </button>
        </div>
      </div>
    )
  }

  const steps = [
    { n: 1, label: 'Project Details' },
    { n: 2, label: 'GIS & Documents' },
    { n: 3, label: 'Review & Submit' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex h-1 w-full">
          <div className="flex-1 bg-amber-500" />
          <div className="flex-1 bg-card" />
          <div className="flex-1 bg-emerald-600" />
        </div>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 p-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ChakraEmblem className="size-6" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Government of India · Ministry of Rural Development
              </p>
              <h1 className="font-serif text-base font-semibold text-foreground">
                Create Acquisition Project
              </h1>
            </div>
          </div>
          <Link href="/" className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors">
            <X className="size-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
        {/* Step progress */}
        <div className="mb-8 flex items-center gap-3">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <StepIndicator step={s.n} label={s.label} currentStep={step} />
                <span className={cn(
                  'hidden sm:block text-xs font-medium',
                  step === s.n ? 'text-foreground' : 'text-muted-foreground',
                )}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Project Details ── */}
        {step === 1 && (
          <div className="rounded-lg border border-border bg-card shadow-sm p-6 space-y-5">
            <div>
              <h2 className="font-serif text-lg font-semibold text-foreground">Project Details</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Basic information about the land acquisition project</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Project Name" required>
                <input className={inputClass} value={projectName} onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Delhi–Mumbai Expressway Corridor" />
              </Field>

              <Field label="Project Code" required hint="Auto-generated — you may edit">
                <input className={cn(inputClass, 'font-mono')} value={projectCode} onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                  placeholder="e.g. NHAI-DEL-BOM-01" />
              </Field>

              <Field label="State">
                <select className={selectClass} value={state} onChange={(e) => setState(e.target.value)}>
                  <option value="">Select state…</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="District">
                <input className={inputClass} value={district} onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Meerut / Multi-District" />
              </Field>

              <Field label="Project Type">
                <select className={selectClass} value={projectType} onChange={(e) => setProjectType(e.target.value)}>
                  <option value="">Select type…</option>
                  {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              <Field label="Acquiring Authority">
                <select className={selectClass} value={acquiringAuthority} onChange={(e) => setAcquiringAuthority(e.target.value)}>
                  <option value="">Select authority…</option>
                  {ACQUIRING_AUTHORITIES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>

              <Field label="Land Required (Hectares)">
                <input className={cn(inputClass, 'font-mono')} type="number" min="0" step="0.01"
                  value={totalArea} onChange={(e) => setTotalArea(e.target.value)}
                  placeholder="e.g. 1250.50" />
              </Field>

              <Field label="Corridor Length (km)">
                <input className={cn(inputClass, 'font-mono')} type="number" min="0" step="0.1"
                  value={corridorLength} onChange={(e) => setCorridorLength(e.target.value)}
                  placeholder="e.g. 290.5" />
              </Field>

              <Field label="Target Completion Date">
                <input className={inputClass} type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} />
              </Field>
            </div>

            <Field label="Project Description">
              <textarea className={cn(inputClass, 'min-h-[80px] resize-y')} rows={3}
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the project, its objectives, and socioeconomic significance…" />
            </Field>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setStep(2)} disabled={!step1Valid}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                Next: GIS & Documents
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: GIS & Documents ── */}
        {step === 2 && (
          <div className="rounded-lg border border-border bg-card shadow-sm p-6 space-y-5">
            <div>
              <h2 className="font-serif text-lg font-semibold text-foreground">GIS Data & Documents</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Upload project boundary and proposal documents (optional)</p>
            </div>

            <FileUploadZone
              label="Project Boundary — GIS File"
              accept=".geojson,.kml,.json"
              hint="GeoJSON or KML format · Max 20 MB"
              file={gisFile}
              onFile={setGisFile}
              icon={MapPin}
            />

            <FileUploadZone
              label="Proposal Document"
              accept=".pdf"
              hint="PDF format · Max 20 MB"
              file={docFile}
              onFile={setDocFile}
              icon={FileText}
            />

            {/* GIS preview placeholder if file uploaded */}
            {gisFile && (
              <div className="rounded-md border border-border bg-muted/20 p-4 flex items-center gap-3 text-xs text-muted-foreground">
                <MapPin className="size-4 text-primary shrink-0" />
                <span><span className="font-medium text-foreground">{gisFile.name}</span> will be stored and linked to this project. Full spatial preview available after submission.</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button type="button" onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                <ChevronLeft className="size-4" />
                Back
              </button>
              <button type="button" onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                Next: Review & Submit
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Review & Submit ── */}
        {step === 3 && (
          <div className="rounded-lg border border-border bg-card shadow-sm p-6 space-y-5">
            <div>
              <h2 className="font-serif text-lg font-semibold text-foreground">Review & Submit</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Verify project details before submission</p>
            </div>

            {/* Summary */}
            <div className="rounded-lg border border-border bg-muted/20 divide-y divide-border text-sm">
              {[
                { label: 'Project Name', value: projectName },
                { label: 'Project Code', value: projectCode, mono: true },
                { label: 'State', value: state || '—' },
                { label: 'District', value: district || '—' },
                { label: 'Project Type', value: projectType || '—' },
                { label: 'Acquiring Authority', value: acquiringAuthority || '—' },
                { label: 'Land Required', value: totalArea ? `${totalArea} Ha` : '—' },
                { label: 'Corridor Length', value: corridorLength ? `${corridorLength} km` : '—' },
                { label: 'Target Date', value: targetDate || '—' },
                { label: 'GIS File', value: gisFile ? gisFile.name : 'Not provided' },
                { label: 'Proposal Document', value: docFile ? docFile.name : 'Not provided' },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className={cn('font-medium text-foreground text-right', mono && 'font-mono')}>{value}</span>
                </div>
              ))}
              {description && (
                <div className="px-4 py-2.5">
                  <p className="text-muted-foreground mb-1">Description</p>
                  <p className="text-foreground text-xs">{description}</p>
                </div>
              )}
            </div>

            {/* Acquisition flow reminder */}
            <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold text-primary mb-1.5">Acquisition Workflow After Submission</p>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                {['Proposal Submitted','Authority Review','Section 3A Notification','Hearing of Objections','Section 3D Declaration','Award & Compensation','Rehabilitation'].map((s, i, arr) => (
                  <span key={s} className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground">{s}</span>
                    {i < arr.length - 1 && <ChevronRight className="size-3 text-muted-foreground" />}
                  </span>
                ))}
              </div>
            </div>

            {submitError && (
              <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
                <AlertCircle className="size-4 shrink-0 text-red-600" />
                <div>
                  <p className="font-semibold">Submission Failed</p>
                  <p className="mt-0.5 text-red-700">{submitError}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button type="button" onClick={() => setStep(2)} disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50">
                <ChevronLeft className="size-4" />
                Back
              </button>
              <button type="button" onClick={handleSubmit} disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? (
                  <><Loader2 className="size-4 animate-spin" />Submitting…</>
                ) : (
                  <><FolderPlus className="size-4" />Submit Project Proposal</>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
