import fs from 'fs'
import path from 'path'
import { getAllBlogSlugs } from '../src/lib/blogs'

const BASE_URL = 'https://soumyapanda.me'

interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

function generateSitemapXml(urls: SitemapUrl[]): string {
  const urlEntries = urls.map((url) => {
    let entry = `  <url>\n    <loc>${url.loc}</loc>`
    
    if (url.lastmod) {
      entry += `\n    <lastmod>${url.lastmod}</lastmod>`
    }
    
    if (url.changefreq) {
      entry += `\n    <changefreq>${url.changefreq}</changefreq>`
    }
    
    if (url.priority !== undefined) {
      entry += `\n    <priority>${url.priority}</priority>`
    }
    
    entry += '\n  </url>'
    return entry
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`
}

async function generateSitemap() {
  try {
    const urls: SitemapUrl[] = [
      {
        loc: `${BASE_URL}/`,
        changefreq: 'weekly',
        priority: 1.0,
      },
      {
        loc: `${BASE_URL}/blogs/`,
        changefreq: 'weekly',
        priority: 0.8,
      },
    ]

    // Get all blog slugs
    const blogSlugs = await getAllBlogSlugs()
    
    // Add each blog post to sitemap
    blogSlugs.forEach((slug) => {
      urls.push({
        loc: `${BASE_URL}/blogs/${slug}/`,
        changefreq: 'monthly',
        priority: 0.7,
      })
    })

    // Generate XML
    const sitemapXml = generateSitemapXml(urls)

    // Ensure public directory exists
    const publicDir = path.join(process.cwd(), 'public')
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    // Write sitemap.xml
    const sitemapPath = path.join(publicDir, 'sitemap.xml')
    fs.writeFileSync(sitemapPath, sitemapXml, 'utf-8')

    console.log(`✅ Sitemap generated successfully at ${sitemapPath}`)
    console.log(`   Total URLs: ${urls.length}`)
    console.log(`   - Homepage: 1`)
    console.log(`   - Blog listing: 1`)
    console.log(`   - Blog posts: ${blogSlugs.length}`)
  } catch (error) {
    console.error('❌ Error generating sitemap:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  generateSitemap()
}

export default generateSitemap
