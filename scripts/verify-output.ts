import fs from 'node:fs'
import path from 'node:path'

const outputRoot = path.join(process.cwd(), 'out')

function read(relativePath: string): string {
  const filePath = path.join(outputRoot, relativePath)
  if (!fs.existsSync(filePath)) throw new Error(`Missing output: ${relativePath}`)

  const content = fs.readFileSync(filePath, 'utf8')
  if (content.trim().length === 0) throw new Error(`Empty output: ${relativePath}`)
  return content
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function textFromHtml(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const homepage = read('index.html')
const headings = [...homepage.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
assert(headings.length === 1, 'Homepage must contain exactly one H1')
assert(
  textFromHtml(headings[0]?.[1] ?? '') === 'Soumyaranjan Panda',
  'Homepage H1 must expose the spaced canonical name',
)
const homepageText = textFromHtml(homepage)
assert(homepageText.length > 500, 'Homepage raw HTML must exceed 500 text characters')
assert(homepageText.includes('Wybit'), 'Homepage raw HTML must include the former Wybit role')

const notFound = read('404.html')
for (const recoveryTarget of ['/sitemap.xml', '/llms.txt', '/llms-full.txt']) {
  assert(notFound.includes(`href="${recoveryTarget}"`), `404 page must link to ${recoveryTarget}`)
}

const sitemap = read('sitemap.xml')
const sitemapUrls = [...sitemap.matchAll(/<loc>https:\/\/soumyapanda\.me(.*?)<\/loc>/g)]
  .map((match) => match[1])
for (const pathname of sitemapUrls) {
  const relativePath = pathname === '/' ? 'index.html' : `${pathname.replace(/^\/|\/$/g, '')}/index.html`
  read(relativePath)
}

for (const machineFile of ['robots.txt', 'llms.txt', 'llms-full.txt']) {
  read(machineFile)
}

console.log(
  `✅ Verified ${sitemapUrls.length} public pages, 404 recovery, homepage no-JS content, and machine-readable files`,
)
