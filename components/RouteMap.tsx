'use client'

import { MapPin, Navigation, Layers, Maximize2, Compass } from 'lucide-react'

interface RouteMapProps {
  className?: string
}

export default function RouteMap({ className }: RouteMapProps) {
  return (
    <section
      aria-label="Nashik Expressway Alignment View"
      className={`flex flex-col h-full overflow-hidden rounded-lg border border-border bg-card shadow-sm ${className || ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-saffron/15 text-saffron-foreground">
            <MapPin className="size-4" />
          </div>
          <div>
            <h2 className="font-serif text-base font-semibold text-foreground">
              Nashik Expressway Alignment View
            </h2>
            <p className="text-xs text-muted-foreground">
              NH-334B / Nashik Expressway GIS Survey Alignment Overlay
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Toggle GIS Layers"
            className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Layers className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Maximize Map"
            className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Maximize2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Visually Appealing Placeholder Card with subtle grid background */}
      <div className="relative flex-1 min-h-[260px] bg-muted/30 overflow-hidden flex flex-col items-center justify-center p-6 text-center">
        {/* Subtle grid background pattern */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Decorative alignment path lines in background */}
        <svg
          className="absolute inset-0 size-full pointer-events-none opacity-20"
          viewBox="0 0 400 200"
          preserveAspectRatio="none"
        >
          <path
            d="M 0,160 Q 100,40 200,100 T 400,20"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="4"
            strokeDasharray="6 6"
          />
          <path
            d="M 0,160 Q 100,40 200,100 T 400,20"
            fill="none"
            stroke="hsl(var(--saffron))"
            strokeWidth="2"
          />
        </svg>

        {/* Foreground Pin Card Content */}
        <div className="relative z-10 flex flex-col items-center max-w-sm">
          <div className="relative flex size-14 items-center justify-center rounded-full bg-background shadow-md border border-border mb-3">
            <div className="absolute inset-0 rounded-full bg-saffron/20 animate-ping opacity-75" />
            <MapPin className="relative size-7 text-saffron" />
          </div>

          <h3 className="font-serif text-lg font-semibold text-foreground tracking-tight">
            Nashik Expressway Alignment View
          </h3>

          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            GIS spatial survey map overlay active. Real-time satellite imagery and survey parcel boundaries loaded for the Nashik Expressway corridor.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 backdrop-blur px-2.5 py-0.5 text-[11px] font-medium text-foreground shadow-2xs">
              <Navigation className="size-3 text-primary" />
              Ch. 0+000 to 42+600
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 backdrop-blur px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-2xs">
              <Compass className="size-3 text-green-india" />
              WGS-84 Grid
            </span>
          </div>
        </div>

        {/* Floating map scale badge */}
        <div className="absolute bottom-3 right-3 rounded-md border border-border bg-card/90 backdrop-blur px-2.5 py-1 text-[11px] font-mono text-muted-foreground shadow-2xs">
          Scale 1 : 25,000
        </div>
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between border-t border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <span className="size-2 rounded-full bg-green-india" />
          Alignment Synced
        </span>
        <span>NHAI Corridor Map v2.4</span>
      </div>
    </section>
  )
}
