import { Terminal, CircleDot, Clock, Telescope } from 'lucide-react'

type Phase = {
  tag: string
  state: 'ACTIVE' | 'UPCOMING' | 'HORIZON'
  description: string
}

const phases: Phase[] = [
  {
    tag: 'PHASE_01',
    state: 'ACTIVE',
    description:
      'Deploying freelance capabilities across Upwork and Fiverr for custom application development, automation hooks, and high-conversion landing pages.',
  },
  {
    tag: 'PHASE_02',
    state: 'UPCOMING',
    description:
      'Structuring advanced data dashboard frameworks, secure multi-tenant user authentication, and optimized state management systems for complex data utilities.',
  },
  {
    tag: 'PHASE_03',
    state: 'HORIZON',
    description:
      'Integrating machine learning APIs and advanced automated scrapers with large-scale data visualization pipelines and niche SaaS utilities.',
  },
]

const stateConfig = {
  ACTIVE: { icon: CircleDot, color: 'text-accent-neon', ping: true },
  UPCOMING: { icon: Clock, color: 'text-muted-foreground', ping: false },
  HORIZON: { icon: Telescope, color: 'text-muted-foreground/70', ping: false },
}

export function Roadmap() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="mb-12">
        <p className="font-mono text-xs uppercase tracking-widest text-accent-neon">
          // The Blueprint Log
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Roadmap &amp; Infrastructure Sprint
        </h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-glass-border glass-panel">
        <div className="flex items-center gap-2 border-b border-glass-border px-5 py-3">
          <Terminal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="font-mono text-xs tracking-tight text-muted-foreground">
            roadmap.log — architectural goals
          </span>
        </div>

        <ul className="divide-y divide-glass-border">
          {phases.map((phase) => {
            const config = stateConfig[phase.state]
            const Icon = config.icon
            return (
              <li
                key={phase.tag}
                className="group flex flex-col gap-3 px-5 py-6 transition-colors hover:bg-foreground/[0.02] md:flex-row md:gap-6 md:px-6"
              >
                <div className="flex shrink-0 items-center gap-3 md:w-64">
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                    {config.ping && (
                      <span className="neon-ping absolute inline-flex h-2 w-2 rounded-full bg-accent-neon" />
                    )}
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} aria-hidden="true" />
                  </span>
                  <span className="font-mono text-sm tracking-tight text-foreground">
                    {phase.tag}{' '}
                    <span className={config.color}>// {phase.state}</span>
                  </span>
                </div>
                <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                  {phase.description}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
