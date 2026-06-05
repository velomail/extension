import { SiteHeader } from '@/components/portfolio/site-header'
import { Hero } from '@/components/portfolio/hero'
import { ProjectMatrix } from '@/components/portfolio/project-matrix'
import { Roadmap } from '@/components/portfolio/roadmap'
import { Services } from '@/components/portfolio/services'
import { SiteFooter } from '@/components/portfolio/site-footer'

export default function Page() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Ambient background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-accent-neon/5 blur-3xl" />
        <div className="absolute bottom-0 -left-40 h-96 w-96 rounded-full bg-accent-neon/5 blur-3xl" />
      </div>

      <div className="relative">
        <SiteHeader />
        <main>
          <Hero />
          <ProjectMatrix />
          <Roadmap />
          <Services />
        </main>
        <SiteFooter />
      </div>
    </div>
  )
}
