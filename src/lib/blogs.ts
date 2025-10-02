import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import remarkHtml from 'remark-html'

export interface BlogPost {
  title: string
  date: string
  excerpt: string
  slug: string
  tags?: string[]
  content: string
  htmlContent: string
}


const blogsDirectory = path.join(process.cwd(), 'src', 'blogs')

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  // Check if blogs directory exists
  if (!fs.existsSync(blogsDirectory)) {
    return []
  }

  // Get all .md files from the blogs directory
  const fileNames = fs.readdirSync(blogsDirectory).filter(fileName => fileName.endsWith('.md'))

  const allPostsData = await Promise.all(
    fileNames.map(async (fileName) => {
      const slug = fileName.replace(/\.md$/, '')
      return await getBlogPostBySlug(slug)
    })
  )

  // Sort posts by date (newest first)
  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1
    } else {
      return -1
    }
  })
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost> {
  const fullPath = path.join(blogsDirectory, `${slug}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')

  // Parse frontmatter
  const { data, content } = matter(fileContents)

  // Convert markdown to HTML
  const processedContent = await remark()
    .use(remarkHtml, { sanitize: false })
    .process(content)

  const htmlContent = processedContent.toString()

  return {
    title: data.title,
    date: data.date,
    excerpt: data.excerpt,
    slug: data.slug,
    tags: data.tags || [],
    content: content,
    htmlContent,
  }
}

export async function getAllBlogSlugs(): Promise<string[]> {
  // Check if blogs directory exists
  if (!fs.existsSync(blogsDirectory)) {
    return []
  }

  const fileNames = fs.readdirSync(blogsDirectory).filter(fileName => fileName.endsWith('.md'))

  return fileNames.map(fileName => fileName.replace(/\.md$/, ''))
}
