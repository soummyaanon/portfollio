import type { Metadata } from 'next'

import { getAllBlogPosts } from '@/lib/blogs'
import { PortfolioDocument } from '@/components/document/PortfolioDocument'
import type { PostSummary } from '@/components/document/types'
import { JsonLd } from '@/components/JsonLd'
import {
  absoluteUrl,
  graph,
  itemListSchema,
  OPEN_GRAPH_DEFAULTS,
  openGraphLocale,
  organisationSchemas,
  personSchema,
  profilePageSchema,
  projectSchema,
  SITE_URL,
  websiteSchema,
} from '@/lib/seo'
import { person, projects, roles } from '@/data/profile'
import { DEFAULT_LOCALE, languageAlternates, localizePath, type Locale } from '@/i18n/config'
import { dictionary } from '@/i18n/dictionaries'
import { localizedProfile } from '@/i18n/profile'
import GitHubContributions from '@/app/components/GitHubContributions'
import { NeuralNetworkFigure } from '@/components/figures/neural/figure'

/**
 * The homepage in one language. `src/app/page.tsx` and `src/app/hi/page.tsx` are each a line
 * that picks the language; everything a page is lives here, so the two cannot drift apart.
 */
export function homeMetadata(locale: Locale): Metadata {
  const description = dictionary(locale).meta.homeDescription
  const path = localizePath('/', locale)
  const translated = localizedProfile(locale).person

  return {
    // The layout's default title carries the English job title; a translation names its own.
    ...(locale === DEFAULT_LOCALE ? {} : { title: { absolute: `${person.name} — ${translated.title}` } }),
    description,
    // Declared per route. The root layout deliberately sets no canonical, because one set
    // there resolves to the same URL everywhere and marks every page a duplicate of this one.
    alternates: { canonical: path, languages: languageAlternates('/') },
    openGraph: {
      ...OPEN_GRAPH_DEFAULTS,
      ...openGraphLocale(locale),
      type: 'profile',
      firstName: person.givenName,
      lastName: person.familyName,
      url: path,
      description,
    },
  }
}

/** The drawn figures in the closing carousel. */
const WORKBENCH = [
  {
    id: 'network',
    name: 'Neural network',
    tagline: 'Signals through a network, as a sculpture',
    url: person.links.find((link) => link.label === 'GitHub')?.url ?? person.site,
    linkLabel: 'GitHub',
    figure: <NeuralNetworkFigure key="network" />,
  },
]

/**
 * Server component: it owns the JSON-LD graph, resolves blog data from the filesystem at
 * build time, and hands plain values to the client document below. The human view is the
 * default rendering, so it is what gets prerendered into the static HTML that search engines
 * and language models read.
 */
export async function HomePage({ locale }: { readonly locale: Locale }) {
  const posts = await getAllBlogPosts()
  const description = dictionary(locale).meta.homeDescription

  const summaries: PostSummary[] = posts.map((post) => ({
    title: post.title,
    slug: post.slug,
    date: post.date,
    excerpt: post.excerpt,
  }))

  /**
   * Derived from the content rather than the clock. A build timestamp would change the
   * graph on every deploy and tell crawlers the page was revised when nothing about it
   * was; the newest fact on the page is the honest answer, and it stays stable between
   * builds that changed nothing.
   */
  const dateModified = [
    ...roles.map((role) => `${role.until ?? role.from}-01`),
    ...posts.map((post) => post.date),
  ].sort().at(-1) ?? new Date().toISOString().slice(0, 10)

  // The Person, the site and everything they link to are defined once, on the English
  // homepage. A translation adds only its own page node, which points back at them.
  const json =
    locale === DEFAULT_LOCALE
      ? graph(
          profilePageSchema({ description, dateModified }),
          personSchema(description),
          websiteSchema(description),
          ...organisationSchemas(),
          ...projects.map(projectSchema),
          itemListSchema(
            `${SITE_URL}/#projects`,
            `Projects by ${person.name}`,
            projects.map((project) => ({ name: project.name, url: project.url })),
          ),
          itemListSchema(
            `${SITE_URL}/#writing`,
            'Writing',
            summaries.map((post) => ({
              name: post.title,
              url: absoluteUrl(`/blogs/${post.slug}/`),
            })),
          ),
        )
      : graph(
          profilePageSchema({
            description,
            dateModified,
            locale,
            title: localizedProfile(locale).person.title,
          }),
        )

  return (
    <main lang={locale === DEFAULT_LOCALE ? undefined : locale}>
      <JsonLd json={json} />
      <PortfolioDocument
        posts={summaries}
        contributions={<GitHubContributions />}
        workbench={WORKBENCH}
      />
    </main>
  )
}
