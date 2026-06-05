import { Boxes, Workflow, Gauge } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Service = {
  icon: LucideIcon
  title: string
  description: string
}

const services: Service[] = [
  {
    icon: Boxes,
    title: 'Custom Web Utilities',
    description:
      'Full-stack apps, internal operational tools, and tailored analytics dashboards wrapped in premium, minimalist glass UI tokens.',
  },
  {
    icon: Workflow,
    title: 'Workflow Automation Pipelines',
    description:
      'Secure API integration, custom web scrapers, data loops, and LLM orchestration to systematically eliminate manual corporate friction.',
  },
  {
    icon: Gauge,
    title: 'Data-Driven Front Ends',
    description:
      'Blazing fast front-end architectures optimized for software tools, business products, and lightning-quick technical landing pages.',
  },
]

export function Services() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="mb-12">
        <p className="font-mono text-xs uppercase tracking-widest text-accent-neon">
          // Freelance Funnel
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Available Commercial Services
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {services.map((service) => {
          const Icon = service.icon
          return (
            <article
              key={service.title}
              className="group flex flex-col rounded-2xl border border-glass-border glass-panel p-6 transition-all duration-300 hover:border-accent-neon/30 hover:bg-foreground/[0.02]"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-glass-border bg-accent-neon/10 transition-colors group-hover:bg-accent-neon/20">
                <Icon className="h-5 w-5 text-accent-neon" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-medium tracking-tight text-foreground">
                {service.title}
              </h3>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
