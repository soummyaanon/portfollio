import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { ProjectIndex } from '@/components/ProjectIndex'
import { JsonLd } from '@/components/JsonLd'
import { BenchRails } from '@/components/document/BenchRails'
import {
  breadcrumbSchema,
  collectionPageSchema,
  graph,
  itemListSchema,
  OPEN_GRAPH_DEFAULTS,
  openGraphLocale,
  projectSchema,
  SITE_URL,
} from '@/lib/seo'
import { person, projects } from '@/data/profile'
import { DEFAULT_LOCALE, languageAlternates, localizePath, type Locale } from '@/i18n/config'
import { dictionary } from '@/i18n/dictionaries'

/** /projects/ in one language. The routes under `src/app/` only pick which. */
export function projectsMetadata(locale: Locale): Metadata {
  const { meta } = dictionary(locale)
  const path = localizePath('/projects/', locale)

  // This route once had no metadata at all — it was a client component, which cannot
  // export any — so it inherited the homepage title, description, and canonical.
  return {
    title: meta.projectsTitle,
    description: meta.projectsDescription,
    alternates: { canonical: path, languages: languageAlternates('/projects/') },
    openGraph: {
      ...OPEN_GRAPH_DEFAULTS,
      ...openGraphLocale(locale),
      url: path,
      // The title template only applies to <title>, so the name is added here by hand.
      title: `${meta.projectsTitle} — ${person.name}`,
      description: meta.projectsDescription,
    },
  }
}

export function ProjectsPage({ locale }: { readonly locale: Locale }) {
  const t = dictionary(locale)
  const english = locale === DEFAULT_LOCALE

  return (
    <main
      lang={english ? undefined : locale}
      className="bench measure-page pb-[var(--space-foot)] pt-[clamp(2.5rem,6vw,5rem)]"
    >
      <BenchRails />
      {/* The projects themselves are defined once, on the English page; a translation adds
          only its own page node and trail. */}
      <JsonLd
        json={graph(
          collectionPageSchema({
            path: '/projects/',
            name: t.meta.projectsTitle,
            description: t.meta.projectsDescription,
            listId: `${SITE_URL}/#projects`,
            locale,
          }),
          ...(english
            ? [
                ...projects.map(projectSchema),
                itemListSchema(
                  `${SITE_URL}/#projects`,
                  'Projects',
                  projects.map((project) => ({ name: project.name, url: project.url })),
                ),
              ]
            : []),
          breadcrumbSchema([
            { name: t.meta.home, path: localizePath('/', locale) },
            { name: t.meta.projectsTitle, path: localizePath('/projects/', locale) },
          ]),
        )}
      />

      <Link
        href={localizePath('/', locale)}
        className="group inline-flex items-center gap-2 text-caption uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft
          className="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5"
          aria-hidden
        />
        {t.projectsPage.back}
      </Link>

      <header className="mt-[var(--space-group)] border-b border-border pb-[var(--space-section)]">
        <h1 className="font-display text-display leading-[0.9] tracking-[-0.02em] text-foreground">
          {t.meta.projectsTitle}
        </h1>
        <p className="mt-[var(--space-group)] max-w-[56ch] text-lead leading-[1.5] text-foreground/85">
          {t.meta.projectsDescription}
        </p>
        <p className="mt-[var(--space-group)] text-caption tabular-nums uppercase tracking-[0.16em] text-muted-foreground">
          {t.projectsPage.count(projects.length)}
        </p>
      </header>

      <div className="mt-[var(--space-section)]">
        <ProjectIndex locale={locale} />
      </div>
    </main>
  )
}
