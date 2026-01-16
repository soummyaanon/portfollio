import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getBlogPostBySlug, getAllBlogSlugs } from '@/lib/blogs'
import { ShareButtons } from '@/components/ShareButtons'
import { BlogContent } from '@/components/blog-content'
import type { Metadata } from 'next'

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

    return {
      title: `${post.title} | Soumya Ram's Blog`,
      description: post.excerpt,
      keywords: post.tags?.join(', '),
      authors: [{ name: 'Soumya Ram' }],
      openGraph: {
        title: post.title,
        description: post.excerpt,
        type: 'article',
        publishedTime: post.date,
        authors: ['Soumya Ram'],
        tags: post.tags,
      },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description: post.excerpt,
      },
    }
  } catch {
    return {
      title: 'Blog Post Not Found | Soumya Ram',
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
            <time className="text-xs text-muted-foreground tracking-wide uppercase">
              {formattedDate}
            </time>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground mt-3 mb-6 leading-snug tracking-tight">
              {post.title}
            </h1>
            <p className="text-muted-foreground leading-relaxed text-sm">
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
