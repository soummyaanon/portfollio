import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Tag } from 'lucide-react'
import { getBlogPostBySlug, getAllBlogSlugs } from '@/lib/blogs'
import type { Metadata } from 'next'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

// Generate static params for all blog posts
export async function generateStaticParams() {
  const slugs = await getAllBlogSlugs()

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
  } catch (error) {
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
        <div className="max-w-4xl mx-auto px-4 py-8 pb-16">
          {/* Back to blogs link */}
          <div className="mb-8">
            <Link
              href="/blogs"
              className="inline-flex items-center text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to all posts
            </Link>
          </div>

          {/* Article header */}
          <header className="mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-6 leading-tight">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {formattedDate}
              </div>

              {post.tags && post.tags.length > 0 && (
                <div className="flex items-center flex-wrap gap-2">
                  <Tag className="w-4 h-4 mr-1" />
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <p className="text-lg text-muted-foreground leading-relaxed">
              {post.excerpt}
            </p>
          </header>

          {/* Article content */}
          <article className="prose prose-base dark:prose-invert max-w-none mb-12">
            <div
              dangerouslySetInnerHTML={{ __html: post.htmlContent }}
              className="text-foreground leading-relaxed space-y-6"
            />
          </article>

          {/* Article footer */}
          <footer className="mt-12 pt-8 pb-12 border-t border-border">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-muted-foreground">
                  Thanks for reading! If you enjoyed this post, consider sharing it with others.
                </p>
              </div>

              <Link
                href="/blogs"
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                ← Read more posts
              </Link>
            </div>
          </footer>
        </div>
      </main>
    )
  } catch (error) {
    notFound()
  }
}
