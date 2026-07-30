import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'

import { projects } from '@/data/profile'

/**
 * The complete project catalogue, for the dedicated /projects route.
 *
 * Deliberately a server component with no client JavaScript: hover states are CSS, and there
 * is no morph here, so nothing needs to hydrate. The homepage shows one featured project and
 * an index; this page gives every project its full entry — that difference is the reason the
 * separate route exists.
 */
export function ProjectIndex() {
  return (
    <ol>
      {projects.map((project, index) => (
        <li
          key={project.id}
          className="border-b border-border first:border-t"
        >
          <article className="grid gap-x-[clamp(1.5rem,4vw,4rem)] gap-y-[var(--space-group)] py-[clamp(2rem,4vw,3.5rem)] lg:grid-cols-[3rem_minmax(0,1.05fr)_minmax(0,1fr)]">
            <span className="text-caption tabular-nums text-signal lg:pt-2">
              {String(index + 1).padStart(2, '0')}
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-display text-[length:clamp(1.75rem,1.2rem+1.6vw,2.5rem)] leading-[1.02] tracking-[-0.015em] text-foreground">
                  {project.name}
                </h2>
                {project.status === 'in-development' && (
                  <span className="text-caption uppercase tracking-[0.14em] text-signal-ink">
                    In development
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-fine uppercase tracking-[0.14em] text-muted-foreground">
                {project.tagline}
              </p>

              <p className="mt-[var(--space-group)] max-w-[54ch] text-body leading-[1.55] text-foreground/85">
                {project.summary}
              </p>

              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-[var(--space-group)] inline-flex items-center gap-1.5 text-fine text-foreground underline decoration-signal/50 decoration-1 underline-offset-[6px] transition-colors hover:decoration-signal"
              >
                {project.linkLabel}
                <ArrowUpRight
                  className="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </a>
            </div>

            <div className="min-w-0">
              {project.image && (
                <div className="mb-[var(--space-group)] overflow-hidden rounded-md border border-border bg-card">
                  <Image
                    src={project.image}
                    alt={`${project.name} interface`}
                    width={1200}
                    height={630}
                    className="h-auto w-full"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                </div>
              )}

              <ul className="space-y-[var(--space-hairline)]">
                {project.capabilities.map((capability) => (
                  <li
                    key={capability}
                    className="flex gap-3 border-b border-border/60 pb-[var(--space-hairline)] text-fine leading-[1.5] text-muted-foreground last:border-0"
                  >
                    <span
                      aria-hidden
                      className="mt-[0.55em] size-1 shrink-0 rounded-full bg-signal/70"
                    />
                    <span>{capability}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </li>
      ))}
    </ol>
  )
}
