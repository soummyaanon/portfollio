import fs from 'fs'
import path from 'path'
import { person } from '../src/data/profile'
import { getAllBlogPosts } from '../src/lib/blogs'

const BASE_URL = person.site

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
      {
        loc: `${BASE_URL}/projects/`,
        changefreq: 'monthly',
        priority: 0.8,
      },
      // The Hindi translations of the three pages above. Each page also names the other
      // language in its own hreflang links, which is what search engines pair them by.
      {
        loc: `${BASE_URL}/hi/`,
        changefreq: 'weekly',
        priority: 0.9,
      },
      {
        loc: `${BASE_URL}/hi/blogs/`,
        changefreq: 'weekly',
        priority: 0.7,
      },
      {
        loc: `${BASE_URL}/hi/projects/`,
        changefreq: 'monthly',
        priority: 0.7,
      },
    ]

    const posts = await getAllBlogPosts()

    // Google ignores changefreq and priority but does use lastmod, so each post carries
    // its own date and the listing pages carry the newest one.
    const newest = posts[0]?.date
    if (newest) {
      urls[0].lastmod = newest
      urls[1].lastmod = newest
      urls[3].lastmod = newest
      urls[4].lastmod = newest
    }

    posts.forEach((post) => {
      urls.push({
        loc: `${BASE_URL}/blogs/${post.slug}/`,
        lastmod: post.date,
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
    console.log(`   - Projects: 1`)
    console.log(`   - Hindi translations: 3`)
    console.log(`   - Blog posts: ${posts.length}`)
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
