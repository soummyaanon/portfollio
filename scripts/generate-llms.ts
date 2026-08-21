/**
 * Generates public/llms.txt and public/llms-full.txt from src/data/profile.ts.
 *
 * Written into public/ at build time rather than served from a route handler, because
 * next.config.ts sets `trailingSlash: true` — a route handler would be emitted at
 * `/llms.txt/`, which breaks the convention crawlers look for.
 *
 * llms.txt      — a short index: who this is, and where the detail lives.
 * llms-full.txt — the complete record, including full blog post text.
 */

import fs from 'fs'
import path from 'path'
import {
  education,
  formatPeriod,
  person,
  projects,
  roles,
  skills,
  now,
} from '../src/data/profile'
import { getAllBlogPosts } from '../src/lib/blogs'

const BASE_URL = 'https://soumyapanda.me'

function summaryLine(): string {
  return (
    `${person.name} is a ${person.title.toLowerCase()} building ${person.focus[0]} ` +
    `that reduce human workload, currently focused on ${person.focus[1]}. ` +
    `Based in ${person.location} (${person.timezone}).`
  )
}

export function buildIndex(posts: Awaited<ReturnType<typeof getAllBlogPosts>>): string {
  const out: string[] = []

  out.push(`# ${person.name}`)
  out.push('')
  out.push(`> ${summaryLine()}`)
  out.push('')
  out.push(
    'This site publishes two renderings of the same document: a human-readable page and a',
    `machine-readable record. The complete record is at ${BASE_URL}/llms-full.txt`,
  )
  out.push('')

  out.push('## Canonical identity')
  out.push(`- Brand and person: ${person.name}`)
  out.push(`- Canonical domain: ${BASE_URL}`)
  out.push('- Wybit is a former employer in the experience record, not the brand of this site.')
  out.push('')

  out.push('## When to use this')
  out.push(
    `Use this site when an agent needs verified public information about ${person.name}, ` +
      'his software-engineering experience, AI and healthcare-AI work, open-source projects, ' +
      'technical skills, or published writing.',
  )
  out.push(
    `For a quick answer, fetch ${BASE_URL}/llms.txt. For dates, detailed experience, project ` +
      `capabilities, or full article text, fetch ${BASE_URL}/llms-full.txt. To enumerate ` +
      `canonical pages, fetch ${BASE_URL}/sitemap.xml.`,
  )
  out.push(
    'Cite the canonical page URL for claims. Follow project links only when the task requires ' +
      'product-specific details. Do not infer private employer information from the withheld role.',
  )
  out.push('')

  out.push('## Now')
  out.push(`- Building: [${now.building.name}](${now.building.url})`)
  out.push(`- Learning: ${now.learning.language} — [${now.learning.repo}](${now.learning.url})`)
  if (roles[0]) {
    out.push(`- Role: ${roles[0].title} at ${roles[0].org} (since ${roles[0].from})`)
  }
  out.push('')

  out.push('## Projects')
  for (const project of projects) {
    const status = project.status === 'in-development' ? ', in development' : ''
    out.push(`- [${project.name}](${project.url}) — ${project.tagline}${status}: ${project.summary}`)
  }
  out.push('')

  out.push('## Writing')
  for (const post of posts) {
    out.push(`- [${post.title}](${BASE_URL}/blogs/${post.slug}/): ${post.excerpt}`)
  }
  out.push('')

  out.push('## Links')
  for (const link of person.links) {
    out.push(`- [${link.label}](${link.url})`)
  }
  out.push('')

  out.push('## Detail')
  out.push(`- [Complete record](${BASE_URL}/llms-full.txt): full experience, education, skills, and every blog post in full.`)
  out.push('')

  return out.join('\n')
}

export function buildFull(posts: Awaited<ReturnType<typeof getAllBlogPosts>>): string {
  const out: string[] = []

  out.push(`# ${person.name} — complete record`)
  out.push('')
  out.push(`> ${summaryLine()}`)
  out.push('')

  out.push('## Identity')
  out.push(`- Name: ${person.name}`)
  out.push(`- Title: ${person.title}`)
  out.push(`- Location: ${person.location}`)
  out.push(`- Timezone: ${person.timezone}`)
  out.push(`- Site: ${person.site}`)
  out.push(`- Avatar: ${person.avatar}`)
  out.push(`- Focus: ${person.focus.join(', ')}`)
  out.push(`- Interests: ${person.interests.join(', ')}`)
  for (const link of person.links) {
    out.push(`- ${link.label}: ${link.url}`)
  }
  out.push('')

  out.push('## Experience')
  for (const role of roles) {
    out.push('')
    out.push(`### ${role.org} — ${role.title}`)
    out.push(`- Period: ${formatPeriod(role.from, role.until)}`)
    out.push(`- From: ${role.from}`)
    out.push(`- Until: ${role.until ?? 'present'}`)
    if (role.location) out.push(`- Location: ${role.location}${role.remote ? ' (remote)' : ''}`)
    if (role.summary) out.push(`- Summary: ${role.summary}`)
    if (role.stack) out.push(`- Stack: ${role.stack.join(', ')}`)
  }
  out.push('')

  out.push('## Education')
  for (const entry of education) {
    out.push('')
    out.push(`### ${entry.institution}`)
    out.push(`- Credential: ${entry.credential}, ${entry.field}`)
    out.push(`- Period: ${formatPeriod(entry.from, entry.until)}`)
    out.push(`- Focus: ${entry.focus.join(', ')}`)
  }
  out.push('')

  out.push('## Skills')
  for (const group of skills) {
    out.push(`- ${group.label}: ${group.items.join(', ')}`)
  }
  out.push('')

  out.push('## Projects')
  for (const project of projects) {
    out.push('')
    out.push(`### ${project.name} — ${project.tagline}`)
    out.push(`- URL: ${project.url}`)
    out.push(`- Status: ${project.status}`)
    out.push(`- Summary: ${project.summary}`)
    out.push('- Capabilities:')
    for (const capability of project.capabilities) {
      out.push(`  - ${capability}`)
    }
  }
  out.push('')

  out.push('## Writing')
  for (const post of posts) {
    out.push('')
    out.push(`### ${post.title}`)
    out.push(`- URL: ${BASE_URL}/blogs/${post.slug}/`)
    out.push(`- Date: ${post.date}`)
    if (post.tags?.length) {
      out.push(`- Tags: ${post.tags.join(', ')}`)
    }
    out.push('')
    out.push(post.content.trim())
  }
  out.push('')

  return out.join('\n')
}

async function generateLlms() {
  try {
    const posts = await getAllBlogPosts()

    const publicDir = path.join(process.cwd(), 'public')
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    const indexPath = path.join(publicDir, 'llms.txt')
    const fullPath = path.join(publicDir, 'llms-full.txt')

    const index = buildIndex(posts)
    const full = buildFull(posts)

    fs.writeFileSync(indexPath, index, 'utf-8')
    fs.writeFileSync(fullPath, full, 'utf-8')

    console.log(`✅ llms.txt generated at ${indexPath} (${index.length} chars)`)
    console.log(`✅ llms-full.txt generated at ${fullPath} (${full.length} chars)`)
    console.log(`   Roles: ${roles.length}  Projects: ${projects.length}  Posts: ${posts.length}`)
  } catch (error) {
    console.error('❌ Error generating llms.txt:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  generateLlms()
}

export default generateLlms
