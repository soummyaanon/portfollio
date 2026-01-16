import Link from 'next/link'
import { getAllBlogPosts } from '@/lib/blogs'

export default async function Blogs() {
  const blogPosts = await getAllBlogPosts()

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-12">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-4">Blog</h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">Thoughts on technology, development, and building the future.</p>
        </div>

        <div className="space-y-8">
          {blogPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">No blog posts yet</p>
            </div>
          ) : (
            blogPosts.map((post) => {
              // Format the date
              const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })

              return (
                <article key={post.slug} className="group border-b border-border/50 py-6 last:border-0 transition-all hover:bg-muted/30 px-4 -mx-4 rounded-lg">
                  <Link href={`/blogs/${post.slug}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h2 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                      {post.title}
                    </h2>
                    <time className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {formattedDate}
                    </time>
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
