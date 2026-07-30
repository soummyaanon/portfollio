/**
 * Resolves everything the site needs from GitHub at build time and writes it to
 * src/data/generated/github.json.
 *
 * Two things used to happen in the browser, and both were wrong:
 *
 *  1. Hero issued up to ten sequential unauthenticated calls to api.github.com on every page
 *     load, against a 60-per-hour-per-IP limit.
 *  2. GitHubContributions called the GraphQL API — which requires auth — using
 *     `process.env.NEXT_PUBLIC_GITHUB_PAT`. Next inlines every NEXT_PUBLIC_* value into the
 *     client bundle, so that token was being published to every visitor.
 *
 * Both now resolve here, at build time, and neither needs a secret. The calendar comes from
 * the public contributions endpoint instead of GraphQL, so no token is required anywhere and
 * there is nothing that could be inlined into client JavaScript. GITHUB_TOKEN is read if it
 * happens to be set — it only raises the REST rate limit for the commit count — but the
 * script works fully without it.
 *
 * The generated file is committed, so a network failure, a changed markup shape, or an
 * exhausted rate limit is not a build failure — the previous values stand and the script warns.
 */

import fs from 'fs'
import path from 'path'

const OWNER = 'soummyaanon'
const REPO = 'learning-Go'
const PER_PAGE = 100
const MAX_PAGES = 10
const YEARS_TO_SHOW = 3

const OUT_DIR = path.join(process.cwd(), 'src', 'data', 'generated')
const OUT_FILE = path.join(OUT_DIR, 'github.json')

interface ContributionDay {
  readonly date: string
  readonly count: number
  readonly level: number
}

interface YearContributions {
  readonly total: number
  readonly days: readonly ContributionDay[]
}

interface GithubData {
  readonly repo: string
  readonly commits: number
  readonly generatedAt: string
  readonly contributions: Record<string, YearContributions>
}

/** Server-side only. Deliberately never a NEXT_PUBLIC_* name. */
function token(): string | undefined {
  return process.env.GITHUB_TOKEN ?? process.env.GH_CONTRIB_TOKEN
}

function restHeaders(): Record<string, string> {
  const base: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'soumyapanda.me-build',
  }
  const t = token()
  if (t) base.Authorization = `Bearer ${t}`
  return base
}

/** GitHub's own thresholds for the five shades of the calendar. */
function contributionLevel(count: number): number {
  if (count === 0) return 0
  if (count <= 1) return 1
  if (count <= 3) return 2
  if (count <= 6) return 3
  return 4
}

async function fetchCommitCount(): Promise<number> {
  let total = 0

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/commits?per_page=${PER_PAGE}&page=${page}`
    const response = await fetch(url, { headers: restHeaders() })

    if (!response.ok) {
      throw new Error(`GitHub REST API returned ${response.status} for page ${page}`)
    }

    const commits: unknown = await response.json()
    if (!Array.isArray(commits)) {
      throw new Error('GitHub REST API returned an unexpected shape')
    }

    total += commits.length

    if (!response.headers.get('link')?.includes('rel="next"')) break
  }

  return total
}

/**
 * Reads the calendar from github.com/users/<user>/contributions, the same fragment the
 * profile page renders. It needs no authentication, which is the point: the GraphQL
 * alternative requires a token, and a token is exactly what got published to visitors last
 * time. With this path there is no secret in CI and nothing to leak.
 *
 * The trade-off is that this is markup, not a contract, so it can change without notice.
 * Levels come from `data-level` on each cell; exact counts come from the paired `<tool-tip>`,
 * matched on the cell id. A parse that yields no cells throws, and the caller keeps whatever
 * was last committed rather than overwriting good data with an empty year.
 */
async function fetchContributions(year: number): Promise<YearContributions> {
  const url = `https://github.com/users/${OWNER}/contributions?from=${year}-01-01&to=${year}-12-31`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'soumyapanda.me-build',
      Accept: 'text/html',
    },
  })

  if (!response.ok) {
    throw new Error(`contributions endpoint returned ${response.status}`)
  }

  const html = await response.text()

  // cell id -> exact count, from the screen-reader tooltips ("13 contributions on …",
  // "1 contribution on …", "No contributions on …").
  const counts = new Map<string, number>()
  const tooltipPattern = /<tool-tip[^>]*\sfor="(contribution-day-component-[\d-]+)"[^>]*>([^<]*)</g

  for (const match of html.matchAll(tooltipPattern)) {
    const [, cellId, text] = match
    const numeric = /^([\d,]+)\s+contribution/.exec(text.trim())
    counts.set(cellId, numeric ? Number(numeric[1].replace(/,/g, '')) : 0)
  }

  const days: ContributionDay[] = []
  let total = 0

  // Attribute order on the cell is not stable, so match the whole tag and pull fields out.
  const cellPattern = /<td[^>]*class="ContributionCalendar-day"[^>]*>/g

  for (const match of html.matchAll(cellPattern)) {
    const tag = match[0]
    const date = /data-date="([\d-]+)"/.exec(tag)?.[1]
    if (!date) continue

    const id = /id="(contribution-day-component-[\d-]+)"/.exec(tag)?.[1]
    const level = Number(/data-level="(\d+)"/.exec(tag)?.[1] ?? 0)
    const count = id ? counts.get(id) ?? 0 : 0

    total += count
    // Prefer GitHub's own level; fall back to our thresholds if the attribute is missing.
    days.push({ date, count, level: Number.isFinite(level) ? level : contributionLevel(count) })
  }

  if (days.length === 0) {
    throw new Error('parsed zero cells — the contributions markup has probably changed')
  }

  return { total, days }
}

function readExisting(): GithubData | null {
  try {
    if (!fs.existsSync(OUT_FILE)) return null
    return JSON.parse(fs.readFileSync(OUT_FILE, 'utf-8')) as GithubData
  } catch {
    return null
  }
}

async function generateGithub() {
  const existing = readExisting()
  const warnings: string[] = []

  let commits = existing?.commits ?? 0
  try {
    commits = await fetchCommitCount()
  } catch (error) {
    warnings.push(`commit count: ${error instanceof Error ? error.message : String(error)}`)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: YEARS_TO_SHOW }, (_, index) => currentYear - index)

  const contributions: Record<string, YearContributions> = { ...(existing?.contributions ?? {}) }
  for (const year of years) {
    try {
      contributions[String(year)] = await fetchContributions(year)
    } catch (error) {
      warnings.push(`contributions ${year}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const data: GithubData = {
    repo: `${OWNER}/${REPO}`,
    commits,
    generatedAt: new Date().toISOString(),
    contributions,
  }

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true })
  }

  fs.writeFileSync(OUT_FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')

  const yearsWritten = Object.keys(data.contributions).sort().reverse()
  console.log(`✅ github.json — ${data.commits} commits, contribution years: ${yearsWritten.join(', ') || 'none'}`)

  for (const warning of warnings) {
    console.warn(`⚠️  ${warning} (kept any previously committed value)`)
  }
}

if (require.main === module) {
  generateGithub()
}

export default generateGithub
