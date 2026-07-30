import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { ProjectIndex } from '@/components/ProjectIndex'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbSchema, graph, projectSchema } from '@/lib/seo'
import { projects } from '@/data/profile'

const DESCRIPTION =
  'Every project in full: an agent overlay for macOS, a debugging plugin for Claude Code, a financial intelligence platform, and the tools around them.'

// This route previously had no metadata at all — it was a client component, which cannot
// export any — so it inherited the homepage title, description, and canonical.
export const metadata: Metadata = {
  title: 'Projects',
  description: DESCRIPTION,
  alternates: { canonical: '/projects/' },
  openGraph: { url: '/projects/', title: 'Projects', description: DESCRIPTION },
}

export default function ProjectsPage() {
  return (
    <main className="mx-auto w-full max-w-[76rem] px-[clamp(1.25rem,4vw,4rem)] pb-[var(--space-section)] pt-[clamp(2.5rem,6vw,5rem)]">
      <JsonLd
        json={graph(
          ...projects.map(projectSchema),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Projects', path: '/projects/' },
          ]),
        )}
      />

      <Link
        href="/"
        className="group inline-flex items-center gap-2 text-caption uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft
          className="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5"
          aria-hidden
        />
        Index
      </Link>

      <header className="mt-[var(--space-group)] border-b border-border pb-[var(--space-section)]">
        <h1 className="font-display text-display leading-[0.9] tracking-[-0.02em] text-foreground">
          Projects
        </h1>
        <p className="mt-[var(--space-group)] max-w-[56ch] text-lead leading-[1.5] text-foreground/85">
          {DESCRIPTION}
        </p>
        <p className="mt-[var(--space-group)] text-caption tabular-nums uppercase tracking-[0.16em] text-muted-foreground">
          {projects.length} entries
        </p>
      </header>

      <div className="mt-[var(--space-section)]">
        <ProjectIndex />
      </div>
    </main>
  )
}
