'use client'

import { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'

export interface Parcel {
  id?: string | number
  owner_name?: string
  village_name?: string
  notified_area_sqm?: number
  possession_status?: string
}

interface ProgressChartProps {
  parcels: Parcel[]
  className?: string
}

const COLOR_MAP: Record<string, string> = {
  Possessed: '#14532d', // green-india dark / emerald
  'Possession Taken': '#14532d', // green-india dark / emerald from Supabase
  Acquired: '#16a34a', // green-india / green
  Completed: '#22c55e', // light green
  Pending: '#ea580c', // saffron / orange
  'In Progress': '#f59e0b', // amber
  'Award Declared': '#f59e0b', // amber from Supabase
  Notified: '#2563eb', // primary blue
}

const FALLBACK_COLORS = ['#16a34a', '#ea580c', '#2563eb', '#8b5cf6', '#06b6d4', '#ec4899']

export default function ProgressChart({ parcels, className }: ProgressChartProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const statusCounts = (parcels || []).reduce((acc: Record<string, number>, parcel) => {
    const status = parcel.possession_status || 'Unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const chartData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
  }))

  const totalParcels = parcels?.length || 0
  const possessedCount = (parcels || []).filter(
    (p) =>
      p.possession_status === 'Possessed' ||
      p.possession_status === 'Possession Taken' ||
      p.possession_status === 'Acquired' ||
      p.possession_status === 'Completed',
  ).length

  const possessedPercentage =
    totalParcels > 0 ? Math.round((possessedCount / totalParcels) * 100) : 0

  return (
    <section
      aria-label="Possession Status Breakdown"
      className={`rounded-lg border border-border bg-card p-5 shadow-sm ${className || ''}`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <PieChartIcon className="size-4" />
          </div>
          <div>
            <h2 className="font-serif text-base font-semibold text-foreground">
              Land Possession Progress Breakdown
            </h2>
            <p className="text-xs text-muted-foreground">
              Distribution of survey parcels by possession status
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-green-india/10 px-2.5 py-1 text-green-india">
            <span className="size-2 rounded-full bg-green-india" />
            {possessedPercentage}% Possessed / Acquired
          </span>
          <span className="text-muted-foreground">
            ({possessedCount} of {totalParcels} parcels)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-center">
        {/* Donut Chart */}
        <div className="relative h-64 md:col-span-7 flex items-center justify-center">
          {mounted && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLOR_MAP[entry.name] ||
                        FALLBACK_COLORS[index % FALLBACK_COLORS.length]
                      }
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]
                      const name = data.name
                      const value = Number(data.value)
                      const pct = totalParcels > 0 ? Math.round((value / totalParcels) * 100) : 0
                      return (
                        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
                          <p className="font-semibold text-foreground">{name}</p>
                          <p className="text-muted-foreground">
                            {value} parcels ({pct}%)
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              {mounted ? 'No parcel status data available' : 'Loading chart...'}
            </div>
          )}

          {/* Center Donut Label */}
          {mounted && totalParcels > 0 && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-serif text-2xl font-bold tracking-tight text-foreground">
                {totalParcels}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Parcels
              </span>
            </div>
          )}
        </div>

        {/* Status Legend & Summary Cards */}
        <div className="md:col-span-5 flex flex-col gap-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Status Breakdown
          </h3>
          {chartData.map((item, index) => {
            const pct = totalParcels > 0 ? Math.round((item.value / totalParcels) * 100) : 0
            const color =
              COLOR_MAP[item.name] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]

            return (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium text-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-muted-foreground">
                  <span className="font-semibold text-foreground">{item.value}</span>
                  <span className="text-[11px]">({pct}%)</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
