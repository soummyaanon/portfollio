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
  organisationSchemas,
  personSchema,
  profilePageSchema,
  projectSchema,
  SITE_URL,
  websiteSchema,
} from '@/lib/seo'
import { person, projects, roles } from '@/data/profile'
import GitHubContributions from './components/GitHubContributions'
import { NeuralNetworkFigure } from '@/components/figures/neural/figure'

const DESCRIPTION =
  'I’m a builder making healthcare AI, agentic automation, and fully autonomous software that make life easier.'

export const metadata: Metadata = {
  description: DESCRIPTION,
  // Declared per route. The root layout deliberately sets no canonical, because one set
  // there resolves to the same URL everywhere and marks every page a duplicate of this one.
  alternates: { canonical: '/' },
  openGraph: {
    ...OPEN_GRAPH_DEFAULTS,
    type: 'profile',
    firstName: person.givenName,
    lastName: person.familyName,
    url: '/',
    description: DESCRIPTION,
  },
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
 * Server component: it owns metadata and the JSON-LD graph, resolves blog data from the
 * filesystem at build time, and hands plain values to the client document below. The human
 * view is the default rendering, so it is what gets prerendered into the static HTML that
 * search engines and language models read.
 */
export default async function Home() {
  const posts = await getAllBlogPosts()

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

  return (
    <main>
      <JsonLd
        json={graph(
          profilePageSchema({ description: DESCRIPTION, dateModified }),
          personSchema(DESCRIPTION),
          websiteSchema(DESCRIPTION),
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
        )}
      />
      <PortfolioDocument
        posts={summaries}
        contributions={<GitHubContributions />}
        workbench={WORKBENCH}
      />
    </main>
  )
}
