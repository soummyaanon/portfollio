import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'

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
      const fullPath = path.join(blogsDirectory, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(fileContents)

      // Convert markdown to HTML
      const processedContent = await remark()
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeHighlight)
        .use(rehypeStringify, { allowDangerousHtml: true })
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
      } as BlogPost
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
  // Find the file by searching through all markdown files for matching frontmatter slug
  const fileNames = fs.readdirSync(blogsDirectory).filter(fileName => fileName.endsWith('.md'))
  
  for (const fileName of fileNames) {
    const fullPath = path.join(blogsDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)
    
    // Check if this file's slug matches the requested slug
    if (data.slug === slug) {
      // Convert markdown to HTML
      const processedContent = await remark()
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeHighlight)
        .use(rehypeStringify, { allowDangerousHtml: true })
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
  }
  
  throw new Error(`Blog post with slug "${slug}" not found`)
}

export async function getAllBlogSlugs(): Promise<string[]> {
  // Check if blogs directory exists
  if (!fs.existsSync(blogsDirectory)) {
    return []
  }

  const fileNames = fs.readdirSync(blogsDirectory).filter(fileName => fileName.endsWith('.md'))

  // Return slugs from frontmatter, not from filenames
  return fileNames.map(fileName => {
    const fullPath = path.join(blogsDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data } = matter(fileContents)
    return data.slug as string
  }).filter(Boolean)
}
