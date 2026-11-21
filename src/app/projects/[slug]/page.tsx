import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'

import { JsonLd } from '@/components/JsonLd'
import { BenchRails } from '@/components/document/BenchRails'
import { person, projectPath, projects } from '@/data/profile'
import { breadcrumbSchema, graph, projectPageSchema, projectSchema } from '@/lib/seo'

/**
 * One page per project. The /projects/ index already shows every entry in full; this route
 * exists so each project has a URL of its own — something a search for the project's name
 * can land on, and a link that unfurls as that project rather than as the whole portfolio.
 *
 * English only, like the posts: the Hindi index links here too.
 */

const STATUS_LABEL = { live: 'Live', 'in-development': 'In development', experimental: 'Experimental' } as const

interface ProjectPageProps {
  params: Promise<{ slug: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.id }))
}

function find(slug: string) {
  return projects.find((project) => project.id === slug)
}

/** The layout appends ` — <name>`; past ~65 characters Google truncates, so long ones opt out. */
function titleFor(project: (typeof projects)[number]) {
  const title = `${project.name}: ${project.tagline}`
  return title.length + person.name.length + 3 > 65 ? { absolute: title } : title
}

/**
 * The summary, cut for a search result. Google shows about 160 characters; past that it cuts
 * mid-word. Prefers a whole sentence, then a whole word.
 */
function metaDescription(summary: string, max = 160): string {
  if (summary.length <= max) return summary
  const head = summary.slice(0, max)
  const sentence = head.lastIndexOf('. ')
  if (sentence > 80) return head.slice(0, sentence + 1)
  return `${head.slice(0, max - 1).replace(/\s+\S*$/, '').replace(/[\s,;:—–-]+$/, '')}…`
}

/** One long-form section: the label in the rail column, the content beside it. */
function Section({ id, title, children }: { readonly id: string; readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="mt-[var(--space-section)] grid gap-x-[clamp(1.5rem,4vw,4rem)] gap-y-[var(--space-group)] border-t border-border pt-[var(--space-section)] lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)]"
    >
      <h2 id={id} className="text-caption uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const project = find((await params).slug)
  if (!project) return {}

  const path = projectPath(project.id)
  const description = metaDescription(project.summary)
  const image = { url: `${path}og.png`, width: 1200, height: 630, alt: `${project.name} — ${project.tagline}` }

  return {
    title: titleFor(project),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: person.name,
      locale: 'en_US',
      url: path,
      title: `${project.name} — ${project.tagline}`,
      description,
      // Drawn per project at build time by og.png/route.tsx beside this page.
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${project.name} — ${project.tagline}`,
      description,
      images: [image.url],
    },
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const project = find((await params).slug)
  if (!project) notFound()

  const others = projects.filter((other) => other.id !== project.id)

  return (
    <main className="bench measure-page pb-[var(--space-foot)] pt-[clamp(2.5rem,6vw,5rem)]">
      <BenchRails />
      <JsonLd
        json={graph(
          projectPageSchema(project),
          projectSchema(project),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Projects', path: '/projects/' },
            { name: project.name, path: projectPath(project.id) },
          ]),
        )}
      />

      <Link
        href="/projects/"
        className="group inline-flex items-center gap-2 text-caption uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft
          className="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5"
          aria-hidden
        />
        Projects
      </Link>

      <header className="mt-[var(--space-group)] border-b border-border pb-[var(--space-section)]">
        <p className="text-caption uppercase tracking-[0.16em] text-muted-foreground">
          {project.status === 'live' ? 'Live' : <span className="text-signal-ink">{STATUS_LABEL[project.status]}</span>}
          <span aria-hidden> · </span>
          {new URL(project.url).host}
        </p>
        <h1 className="mt-[var(--space-group)] font-display text-display leading-[0.9] tracking-[-0.02em] text-foreground">
          {project.name}
        </h1>
        <p className="mt-3 text-fine uppercase tracking-[0.14em] text-muted-foreground">{project.tagline}</p>
        <p className="mt-[var(--space-group)] max-w-[56ch] text-lead leading-[1.5] text-foreground/85">
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
        {project.source && (
          <a
            href={project.source}
            target="_blank"
            rel="noopener noreferrer"
            className="group ml-6 mt-[var(--space-group)] inline-flex items-center gap-1.5 text-fine text-muted-foreground underline decoration-border decoration-1 underline-offset-[6px] transition-colors hover:text-foreground hover:decoration-signal"
          >
            Source on GitHub
            <ArrowUpRight
              className="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden
            />
          </a>
        )}
      </header>

      <section
        aria-labelledby="capabilities"
        className="mt-[var(--space-section)] grid gap-x-[clamp(1.5rem,4vw,4rem)] gap-y-[var(--space-group)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
      >
        {project.image && (
          // The homepage cards' treatment: greyscale at rest, colour when pointed at.
          <div className="project-card overflow-hidden rounded-md border border-border bg-card">
            <Image
              src={project.image}
              alt={`${project.name} interface`}
              width={1200}
              height={630}
              priority
              className="project-shot h-auto w-full"
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
          </div>
        )}
        <div className="min-w-0">
          <h2 id="capabilities" className="text-caption uppercase tracking-[0.16em] text-muted-foreground">
            What it does
          </h2>
          <ul className="mt-[var(--space-group)] space-y-[var(--space-hairline)]">
            {project.capabilities.map((capability) => (
              <li
                key={capability}
                className="flex gap-3 border-b border-border/60 pb-[var(--space-hairline)] text-body leading-[1.5] text-foreground/85 last:border-0"
              >
                <span aria-hidden className="mt-[0.6em] size-1 shrink-0 rounded-full bg-signal/70" />
                <span>{capability}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {project.why && (
        <Section id="why" title={`Why I built ${project.name}`}>
          {project.why.split(/\n\s*\n/).map((paragraph) => (
            <p key={paragraph} className="max-w-[62ch] text-body leading-[1.65] text-foreground/85 [&+&]:mt-4">
              {paragraph.trim()}
            </p>
          ))}
        </Section>
      )}

      {project.howItWorks.length > 0 && (
        <Section id="how" title={`How ${project.name} works`}>
          <ol className="max-w-[62ch] space-y-4">
            {project.howItWorks.map((step, index) => (
              <li key={step} className="flex gap-4 text-body leading-[1.6] text-foreground/85">
                <span aria-hidden className="w-6 shrink-0 pt-[0.15em] text-caption tabular-nums text-signal">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {project.stack.length > 0 && (
        <Section id="stack" title="Built with">
          <ul className="flex max-w-[62ch] flex-wrap gap-2">
            {project.stack.map((item) => (
              <li key={item} className="rounded-sm border border-border px-2.5 py-1 text-fine text-foreground/85">
                {item}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {project.install && (
        <Section id="try" title={`Try ${project.name}`}>
          <pre className="max-w-[62ch] overflow-x-auto rounded-md border border-border bg-card px-4 py-3 text-fine text-foreground">
            <code>{project.install}</code>
          </pre>
        </Section>
      )}

      <nav aria-labelledby="more-projects" className="mt-[var(--space-section)] border-t border-border pt-[var(--space-section)]">
        <h2 id="more-projects" className="text-caption uppercase tracking-[0.16em] text-muted-foreground">
          More projects
        </h2>
        <ul className="mt-[var(--space-group)]">
          {others.map((other) => (
            <li key={other.id} className="border-b border-border/60 last:border-0">
              <Link
                href={projectPath(other.id)}
                className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-[var(--space-hairline)]"
              >
                <span className="text-body text-foreground underline decoration-transparent decoration-1 underline-offset-[6px] transition-colors group-hover:decoration-signal">
                  {other.name}
                </span>
                <span className="text-fine text-muted-foreground">{other.tagline}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-[var(--space-group)] text-fine text-muted-foreground">
          Built by{' '}
          <Link href="/" className="text-foreground underline decoration-signal/50 underline-offset-[6px] hover:decoration-signal">
            {person.name}
          </Link>
        </p>
      </nav>
    </main>
  )
}
