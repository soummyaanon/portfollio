export default function Blogs() {
  const blogPosts = [
    {
      title: "Building Healthcare AI Systems with Next.js",
      date: "September 2025",
      excerpt: "My journey in developing HIPAA-compliant AI applications using modern web technologies.",
      slug: "healthcare-ai-nextjs"
    },
    {
      title: "OpenAI Agent SDK: Real-world Implementation",
      date: "August 2025",
      excerpt: "Deep dive into building intelligent agents with TypeScript and OpenAI's latest SDK.",
      slug: "openai-agent-sdk-implementation"
    },
    {
      title: "Modern Full-Stack Development in 2025",
      date: "July 2025",
      excerpt: "Exploring the latest trends in web development including vector databases and AI integration.",
      slug: "modern-fullstack-2025"
    }
  ]

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Blog</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">Thoughts on technology, development, and building the future.</p>
        </div>

        <div className="space-y-8">
          {blogPosts.map((post, index) => (
            <article key={index} className="border-b border-gray-200 dark:border-gray-700 pb-8">
              <div className="mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{post.date}</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                {post.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{post.excerpt}</p>
              <div className="mt-4">
                <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">Read more →</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
