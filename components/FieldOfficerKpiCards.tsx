'use client'

import { useEffect, useState } from 'react'
import { LandPlot, Clock, CheckCircle, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function FieldOfficerKpiCards() {
  const [data, setData] = useState<{
    assigned: number
    pending: number
    verified: number
    evidence: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/assignments?assigned_to_me=true&status=Active')
        const json = await res.json()
        if (json.success) {
          const tasks: any[] = json.data || []
          setData({
            assigned: tasks.length,
            pending: tasks.filter(
              (t: any) => !t.field_verification_status || t.field_verification_status === 'Pending',
            ).length,
            verified: tasks.filter((t: any) => t.field_verification_status === 'Verified').length,
            evidence: tasks.filter((t: any) => (t.evidenceCount ?? 0) > 0).length,
          })
        }
      } catch {
        setData({ assigned: 0, pending: 0, verified: 0, evidence: 0 })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const cards = [
    {
      label: 'Assigned Parcels',
      value: data?.assigned ?? 0,
      icon: LandPlot,
      ic: 'bg-blue-50 text-blue-600',
      vc: 'text-blue-700',
      bc: 'border-blue-100',
    },
    {
      label: 'Pending Verification',
      value: data?.pending ?? 0,
      icon: Clock,
      ic: 'bg-amber-50 text-amber-600',
      vc: 'text-amber-700',
      bc: 'border-amber-100',
    },
    {
      label: 'Verified',
      value: data?.verified ?? 0,
      icon: CheckCircle,
      ic: 'bg-emerald-50 text-emerald-600',
      vc: 'text-emerald-700',
      bc: 'border-emerald-100',
    },
    {
      label: 'Evidence Uploaded',
      value: data?.evidence ?? 0,
      icon: Upload,
      ic: 'bg-purple-50 text-purple-600',
      vc: 'text-purple-700',
      bc: 'border-purple-100',
    },
  ]

  return (
    <section aria-label="My field work" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <article key={card.label} className={cn('rounded-xl border bg-card p-5 shadow-sm', card.bc)}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
              <div className={cn('flex size-9 items-center justify-center rounded-lg', card.ic)}>
                <Icon className="size-4.5" />
              </div>
            </div>
            {loading ? (
              <p className="font-serif text-3xl font-bold text-muted-foreground">--</p>
            ) : (
              <p className={cn('font-serif text-3xl font-bold', card.vc)}>
                {card.value.toLocaleString('en-IN')}
              </p>
            )}
          </article>
        )
      })}
    </section>
  )
}
