import type { Metadata } from 'next'

import { getAllBlogPosts } from '@/lib/blogs'
import { PortfolioDocument } from '@/components/document/PortfolioDocument'
import type { PostSummary } from '@/components/document/types'
import { JsonLd } from '@/components/JsonLd'
import { graph, personSchema, projectSchema, websiteSchema } from '@/lib/seo'
import { projects } from '@/data/profile'
import { github } from '@/data/github'
import GitHubContributions from './components/GitHubContributions'

const DESCRIPTION =
  'I build AI-driven tools that reduce human workload, currently focused on healthcare AI that streamlines physicians’ workflows.'

export const metadata: Metadata = {
  description: DESCRIPTION,
  // Declared per route. The root layout deliberately sets no canonical, because one set
  // there resolves to the same URL everywhere and marks every page a duplicate of this one.
  alternates: { canonical: '/' },
  openGraph: { url: '/', description: DESCRIPTION },
}

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

  return (
    <main>
      <JsonLd
        json={graph(
          personSchema(),
          websiteSchema(DESCRIPTION),
          ...projects.map(projectSchema),
        )}
      />
      <PortfolioDocument
        posts={summaries}
        commits={github.commits}
        contributions={<GitHubContributions />}
      />
    </main>
  )
}
