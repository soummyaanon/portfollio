import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getBlogPostBySlug, getAllBlogSlugs } from '@/lib/blogs'
import { ShareButtons } from '@/components/ShareButtons'
import { BlogContent } from '@/components/blog-content'
import type { Metadata } from 'next'
import { JsonLd } from '@/components/JsonLd'
import { blogPostingSchema, breadcrumbSchema, graph } from '@/lib/seo'
import { person } from '@/data/profile'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

// Generate static params for all blog posts
export async function generateStaticParams() {
  const slugs = await getAllBlogSlugs()

  // For static export, we need at least one path. If no blog posts exist,
  // return a placeholder that will result in a 404
  if (slugs.length === 0) {
    return [{ slug: 'placeholder' }]
  }

  return slugs.map((slug) => ({
    slug,
  }))
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params

  try {
    const post = await getBlogPostBySlug(slug)
    const canonicalUrl = `https://soumyapanda.me/blogs/${slug}/`

    return {
      // The root layout supplies the `%s — Soumyaranjan Panda` template, so the raw title
      // is all that belongs here. `keywords` is gone: search engines ignore it, and it
      // reads as stuffing to the extractors that do not.
      title: post.title,
      description: post.excerpt,
      authors: [{ name: person.name }],
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: post.title,
        description: post.excerpt,
        type: 'article',
        url: canonicalUrl,
        publishedTime: post.date,
        authors: [person.name],
        tags: post.tags,
        images: [{
          url: '/og.png',
          width: 1200,
          height: 630,
          alt: post.title,
        }],
      },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description: post.excerpt,
        images: ['/og.png'],
      },
    }
  } catch {
    return {
      title: 'Blog Post Not Found | Soumya Panda',
      description: 'The requested blog post could not be found.',
    }
  }
}

export default async function BlogPost({ params }: BlogPostPageProps) {
  const { slug } = await params

  try {
    const post = await getBlogPostBySlug(slug)

    // Format the date
    const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return (
      <main className="min-h-screen bg-background">
        {/* Built from src/lib/seo.ts so the author and publisher resolve by @id to the one
            Person declared on the homepage, rather than restating a second, unlinked copy
            of the same entity on every post. */}
        <JsonLd
          json={graph(
            blogPostingSchema(post),
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Writing', path: '/blogs/' },
              { name: post.title, path: `/blogs/${post.slug}/` },
            ]),
          )}
        />
        <div className="max-w-2xl mx-auto px-6 py-12 pb-20">
          {/* Back to blogs link */}
          <div className="mb-12">
            <Link
              href="/blogs"
              className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors text-xs"
            >
              <ArrowLeft className="w-3 h-3 mr-2" />
              Back
            </Link>
          </div>

          {/* Article header */}
          <header className="mb-12">
            <time className="text-caption uppercase tracking-[0.16em] text-muted-foreground">
              {formattedDate}
            </time>
            {/* Titles were pinned at text-lg while the rest of the site now has a display
                scale; the post headline is the one place the reading view should be loud. */}
            <h1 className="mt-3 mb-6 font-display text-[length:clamp(1.875rem,1.3rem+1.9vw,2.75rem)] leading-[1.05] tracking-[-0.015em] text-foreground">
              {post.title}
            </h1>
            <p className="text-body leading-[1.55] text-muted-foreground">
              {post.excerpt}
            </p>
          </header>

          <div className="w-full h-px bg-border mb-12" />

          {/* Article content */}
          <article className="prose prose-base dark:prose-invert max-w-none">
            <BlogContent htmlContent={post.htmlContent} />
          </article>

          {/* Article footer */}
          <footer className="mt-12 pt-8 pb-12 border-t border-border">
            <div className="flex flex-col gap-6">
              {/* Share section */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-muted-foreground text-xs">
                  Enjoyed this post? Share it with others!
                </p>
                <ShareButtons title={post.title} slug={post.slug} />
              </div>

              {/* Back link */}
              <div className="pt-4 border-t border-border/50">
                <Link
                  href="/blogs"
                  className="text-primary hover:text-primary/80 transition-colors font-semibold text-xs"
                >
                  ← Read more posts
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </main>
    )
  } catch {
    notFound()
  }
}
