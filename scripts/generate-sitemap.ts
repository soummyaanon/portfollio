import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { person, projectPath, projects } from '../src/data/profile'
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

/**
 * The date (YYYY-MM-DD) of the last commit that touched any of `paths`, or undefined when
 * history cannot say. Vercel builds from a shallow clone, where every file older than the
 * clone appears to arrive in the boundary commit; a date from that commit would claim the
 * page changed today, so it is treated as unknown rather than guessed.
 */
function lastCommitDate(...paths: string[]): string | undefined {
  try {
    const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf-8' }).trim()
    const [hash, date] = git('log', '-1', '--format=%H %cs', '--', ...paths).split(' ')
    if (!hash || !date) return undefined
    const shallowFile = git('rev-parse', '--git-path', 'shallow')
    const boundaries = fs.existsSync(shallowFile) ? fs.readFileSync(shallowFile, 'utf-8').split('\n') : []
    return boundaries.includes(hash) ? undefined : date
  } catch {
    return undefined
  }
}

/** The latest of some YYYY-MM-DD dates, any of which may be unknown. */
function latest(...dates: (string | undefined)[]): string | undefined {
  return dates.filter((date): date is string => Boolean(date)).sort().at(-1)
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

    // Google ignores changefreq and priority but does use lastmod, so each page carries the
    // date its content last changed: a post its own date, the writing index the newest post,
    // the project pages the last edit to the project list, and the homepage — which shows
    // posts, projects and the profile — whichever of those is latest.
    const newestPost = posts[0]?.date
    const projectsChanged = lastCommitDate('content/projects.json')
    const profileChanged = lastCommitDate('src/data/profile.ts', 'src/i18n/profile.ts', 'src/i18n/dictionaries.ts')
    const home = latest(newestPost, projectsChanged, profileChanged)
    urls[0].lastmod = home
    urls[1].lastmod = newestPost
    urls[2].lastmod = projectsChanged
    urls[3].lastmod = home
    urls[4].lastmod = newestPost
    urls[5].lastmod = projectsChanged

    // Each project's own page. English only, like the posts.
    projects.forEach((project) => {
      urls.push({
        loc: `${BASE_URL}${projectPath(project.id)}`,
        lastmod: projectsChanged,
        changefreq: 'monthly',
        priority: 0.7,
      })
    })

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
    console.log(`   - Project pages: ${projects.length}`)
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
