import Link from 'next/link'
import { Calendar, Tag } from 'lucide-react'
import { getAllBlogPosts } from '@/lib/blogs'

export default async function Blogs() {
  const blogPosts = await getAllBlogPosts()

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-4">Blog</h1>
          <p className="text-muted-foreground leading-relaxed">Thoughts on technology, development, and building the future.</p>
        </div>

        <div className="space-y-8">
          {blogPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No blog posts yet</p>
            </div>
          ) : (
            blogPosts.map((post, index) => {
              // Format the date
              const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })

              return (
                <article key={post.slug} className="border-b border-border pb-8">
                  <div className="mb-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formattedDate}
                    </div>
                  </div>

                  <Link href={`/blogs/${post.slug}`} className="group block">
                    <h2 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors leading-tight">
                      {post.title}
                    </h2>
                  </Link>

                  <p className="text-muted-foreground leading-relaxed mb-4 text-base">{post.excerpt}</p>

                  {post.tags && post.tags.length > 0 && (
                    <div className="flex items-center flex-wrap gap-2 mb-4">
                      <Tag className="w-4 h-4 text-muted-foreground mr-1" />
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

                  <Link
                    href={`/blogs/${post.slug}`}
                    className="inline-flex items-center text-primary hover:text-primary/80 transition-colors font-medium text-sm"
                  >
                    Read more →
                  </Link>
                </article>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}
