import Link from 'next/link'
import type { Metadata } from 'next'

import { getAllBlogPosts } from '@/lib/blogs'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbSchema, graph } from '@/lib/seo'

const DESCRIPTION =
  'Notes on building AI systems that survive contact with production — agents, workflows, and the parts that are harder than the demo suggests.'

export const metadata: Metadata = {
  // The root layout appends the name, so the keyword-stacked title is unnecessary here.
  title: 'Writing',
  description: DESCRIPTION,
  // This route previously shipped no canonical at all.
  alternates: { canonical: '/blogs/' },
  openGraph: { url: '/blogs/', title: 'Writing', description: DESCRIPTION, type: 'website' },
}

export default async function Blogs() {
  const blogPosts = await getAllBlogPosts()

  return (
    <main className="mx-auto w-full max-w-[70rem] px-[clamp(1.25rem,4vw,4rem)] pb-[var(--space-section)] pt-[clamp(2.5rem,6vw,5rem)]">
      <JsonLd
        json={graph(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Writing', path: '/blogs/' },
          ]),
        )}
      />

      <header className="border-b border-border pb-[var(--space-section)]">
        <h1 className="font-display text-display leading-[0.9] tracking-[-0.02em] text-foreground">
          Writing
        </h1>
        <p className="mt-[var(--space-group)] max-w-[56ch] text-lead leading-[1.5] text-foreground/85">
          {DESCRIPTION}
        </p>
        <p className="mt-[var(--space-group)] text-caption tabular-nums uppercase tracking-[0.16em] text-muted-foreground">
          {blogPosts.length} {blogPosts.length === 1 ? 'piece' : 'pieces'}
        </p>
      </header>

      {blogPosts.length === 0 ? (
        // An empty state that says what would be here, rather than only that nothing is.
        <p className="mt-[var(--space-section)] max-w-[52ch] text-body text-muted-foreground">
          Nothing published yet. Pieces land here as they are finished — mostly notes on
          agent architecture and what breaks between a demo and production.
        </p>
      ) : (
        <ol className="mt-[var(--space-section)]">
          {blogPosts.map((post) => {
            const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })

            return (
              <li key={post.slug} className="border-b border-border first:border-t">
                <Link
                  href={`/blogs/${post.slug}/`}
                  className="group grid gap-x-8 gap-y-2 py-[clamp(1.5rem,3vw,2.5rem)] sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <span className="min-w-0">
                    <span className="block font-display text-title leading-[1.15] text-foreground decoration-signal/50 decoration-1 underline-offset-[6px] group-hover:underline">
                      {post.title}
                    </span>
                    <span className="mt-[var(--space-tight)] block max-w-[64ch] text-body leading-[1.55] text-foreground/75">
                      {post.excerpt}
                    </span>
                    {post.tags && post.tags.length > 0 && (
                      <span className="mt-[var(--space-tight)] block text-caption text-muted-foreground/70">
                        {post.tags.join(' · ')}
                      </span>
                    )}
                  </span>
                  <time className="text-fine tabular-nums whitespace-nowrap text-muted-foreground sm:text-right">
                    {formattedDate}
                  </time>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </main>
  )
}
