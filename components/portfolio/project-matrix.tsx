import { MonitorPlay } from 'lucide-react'

type Project = {
  index: string
  name: string
  statusLabel: string
  statusColor: string
  coreUtility: string
  functionalImpact: string
  stack: string[]
}

const projects: Project[] = [
  {
    index: '01',
    name: 'RadarAI',
    statusLabel: '[ STATUS: LIVE & DEPLOYED ]',
    statusColor: 'text-accent-neon',
    coreUtility:
      'A precision job-search aggregator and automated resume-matching engine designed to crawl, parse, and match candidates to active pipelines using custom semantic scoring vectors.',
    functionalImpact:
      'Reduces manual search overhead by programmatically aggregating target roles and auditing resume alignment instantly.',
    stack: ['Next.js', 'TailwindCSS', 'LLM Vector Embedding API', 'Node.js'],
  },
  {
    index: '02',
    name: 'VeloMail',
    statusLabel: '[ STATUS: PERFORMANCE OPTIMIZATION ]',
    statusColor: 'text-muted-foreground',
    coreUtility:
      'A real-time mobile email preview engine engineered to parse, validate, and preview responsive code layouts across disparate viewport footprints instantly.',
    functionalImpact:
      'Eliminates cross-client layout degradation for digital marketers, ensuring pixel-perfect compliance before pipeline dispatch.',
    stack: ['TypeScript', 'Web Rendering Engines', 'Next.js API Routes'],
  },
  {
    index: '03',
    name: 'MetroRate',
    statusLabel: '[ STATUS: ACTIVE SPRINT DEVELOPMENT ]',
    statusColor: 'text-muted-foreground/70',
    coreUtility:
      'An automated financial utility dashboard built for sales representatives to track custom commission structures, multi-tier quotas, and real-time performance analytics.',
    functionalImpact:
      'Provides granular financial forecasting and removes manual commission auditing bottlenecks through real-time data visualization.',
    stack: ['React', 'TailwindCSS', 'Financial Data Streams', 'Local Storage State'],
  },
]

function MediaPlaceholder() {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-glass-border bg-background/60">
      <div className="flex flex-col items-center gap-2">
        <MonitorPlay className="h-5 w-5 text-muted-foreground/50" aria-hidden="true" />
        <span className="font-mono text-[11px] tracking-tight text-muted-foreground/60">
          [ APPLICATION UI / WALKTHROUGH MEDIA PLACEHOLDER ]
        </span>
      </div>
    </div>
  )
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="group rounded-2xl border border-glass-border glass-panel p-6 transition-all duration-300 hover:border-accent-neon/30 md:p-8">
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">
              {project.name} // {project.index}
            </span>
          </div>
          <p className={`mt-3 font-mono text-xs tracking-tight ${project.statusColor}`}>
            {project.statusLabel}
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/60">
                Core Utility
              </p>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-foreground/90">
                {project.coreUtility}
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/60">
                Functional Impact
              </p>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                {project.functionalImpact}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {project.stack.map((tech) => (
              <span
                key={tech}
                className="rounded-md border border-glass-border bg-background/40 px-2.5 py-1 font-mono text-[11px] tracking-tight text-muted-foreground"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="transition-transform duration-300 group-hover:scale-[1.01]">
          <MediaPlaceholder />
        </div>
      </div>
    </article>
  )
}

export function ProjectMatrix() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="mb-12">
        <p className="font-mono text-xs uppercase tracking-widest text-accent-neon">
          // The Project Matrix
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          The Core Ecosystem
        </h2>
      </div>

      <div className="flex flex-col gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.index} project={project} />
        ))}
      </div>
    </section>
  )
}
