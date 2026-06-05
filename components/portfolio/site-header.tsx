import { Navigation } from 'lucide-react'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-glass-border glass-panel">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-glass-border bg-accent-neon/10">
            <Navigation className="h-3.5 w-3.5 text-accent-neon" aria-hidden="true" />
          </span>
          <p className="font-mono text-sm tracking-tight text-foreground">
            ENVOYDIRECT <span className="text-muted-foreground">//</span>{' '}
            <span className="text-muted-foreground">SOFTWARE ARCHITECT &amp; SOLUTIONS SPECIALIST</span>
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <div className="inline-flex items-center gap-2 rounded-full border border-glass-border glass-panel px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="status-ping absolute inline-flex h-2 w-2 rounded-full bg-status-green" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-status-green" />
            </span>
            <span className="font-mono text-xs tracking-tight text-foreground">
              STATUS: OPEN TO CUSTOM CLIENT BUILDS
            </span>
          </div>
          <p className="font-mono text-[11px] tracking-tight text-muted-foreground">
            LOC // ONTARIO, CA • EST // 24H_CLOCK_FORMAT
          </p>
        </div>
      </div>
    </header>
  )
}
