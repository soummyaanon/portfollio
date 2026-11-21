/**
 * Single source of truth for everything the site knows about its subject.
 *
 * Both views render from these records: the human view composes prose around them,
 * the machine view renders them as fielded specimen entries. JSON-LD, llms.txt, and
 * the sitemap are all derived from here too — so a fact is edited in exactly one place.
 *
 * Every record carries a stable `id`. Those ids namespace the morph's shared layout
 * animation (`role.wybit.org` travels from the sentence to the `org:` field), which is
 * why they must not change casually.
 *
 * Dates are stored in machine form (`YYYY-MM`). The human view formats them for reading;
 * the machine view prints them raw. Same fact, two encodings — that is the whole thesis.
 */

import { projectContent } from './project-content'

export interface Link {
  readonly label: string
  readonly url: string
}

/** The portrait the site serves, built from the TinaCMS upload by scripts/prepare-avatar.ts. */
export const AVATAR_PATH = '/generated/avatar.jpg'

export interface Person {
  readonly id: string
  readonly name: string
  /** Shorter forms people actually search for, e.g. the one the domain is named after. */
  readonly alternateNames: readonly string[]
  readonly givenName: string
  readonly familyName: string
  readonly title: string
  readonly location: string
  readonly timezone: string
  /**
   * The one canonical origin, no trailing slash. Every absolute URL the site emits —
   * canonicals, Open Graph, JSON-LD, sitemap, robots, llms.txt — is built from this, so
   * moving domains is a one-line change. Other hosts (www, *.vercel.app) redirect here
   * via vercel.json rather than serving duplicate copies.
   */
  readonly site: string
  readonly avatar: string
  readonly focus: readonly string[]
  readonly interests: readonly string[]
  readonly links: readonly Link[]
}

export interface Role {
  readonly id: string
  readonly org: string
  readonly title: string
  /** `YYYY-MM` */
  readonly from: string
  /** `YYYY-MM`, or null while current. */
  readonly until: string | null
  /**
   * Everything below is optional, because a role you started weeks ago has an org, a title
   * and a start date long before it has a summary worth publishing. Omitting a field is a
   * supported state: the reading view drops the row's disclosure entirely when there is
   * nothing behind it, and the machine view simply has no line for it. The alternative —
   * requiring every field — is what makes people write filler.
   */
  readonly location?: string
  readonly remote?: boolean
  readonly summary?: string
  readonly stack?: readonly string[]
  readonly logo?: string
  /**
   * This employer is not being named. `org` carries the stand-in that is published in its
   * place — the real name is absent from this file, which is the only way it is absent from
   * everything derived from it — and this flag is what tells the rest of the site to treat
   * the field as withheld rather than as an ordinary name: veiled where it is set as type,
   * and left out of the structured data instead of asserting a company that does not exist.
   *
   * Set this rather than dropping `org` altogether. A role with no employer reads as an
   * oversight; a role with a withheld one reads as a decision.
   */
  readonly withheld?: boolean
}

export interface Education {
  readonly id: string
  readonly institution: string
  readonly credential: string
  readonly field: string
  readonly from: string
  readonly until: string
  readonly focus: readonly string[]
  readonly logo?: string
}

export type ProjectStatus = 'live' | 'in-development' | 'experimental'

export interface Project {
  readonly id: string
  readonly name: string
  readonly tagline: string
  /** `experimental`: shipped as an experiment and no longer being developed. */
  readonly status: ProjectStatus
  readonly url: string
  /**
   * What the link actually leads to. Not every project is a website — some are a DMG,
   * some an npm package — and the affordance should say which rather than flattening
   * everything to "View Project".
   */
  readonly linkLabel: string
  readonly summary: string
  readonly capabilities: readonly string[]
  readonly image?: string
  readonly logo?: string
  /** Shown on the homepage, in list order. */
  readonly featured: boolean
  /** The project page's long form, in the owner's voice. Paragraphs split on blank lines. */
  readonly why?: string
  readonly howItWorks: readonly string[]
  readonly stack: readonly string[]
  /** A command a reader can paste to try it. */
  readonly install?: string
  /** Public source code, when there is some. */
  readonly source?: string
  readonly platform?: string
}

export interface SkillGroup {
  readonly id: string
  readonly label: string
  readonly items: readonly string[]
}

export const person: Person = {
  id: 'person',
  name: 'Soumyaranjan Panda',
  alternateNames: ['Soumya Panda'],
  givenName: 'Soumyaranjan',
  familyName: 'Panda',
  title: 'AI Engineer',
  // Written in Devanagari in every language, by choice. Rendered inside `lang="hi"` so it
  // takes the Devanagari face and drops the byline's letter-spacing, which breaks conjuncts.
  location: 'भारत',
  timezone: 'Asia/Kolkata',
  site: 'https://soumyapanda.dev',
  // Served from this origin, and a path rather than a URL so it is one string to change.
  //
  // It used to point at github.com/<user>.png, which is a 302 to avatars.githubusercontent.com
  // — so the portrait, which is the LCP element on this page, cost a redirect, a second DNS
  // lookup and TLS handshake to another origin, 95 KB of PNG at 460px for a slot that is never
  // wider than 80, and a five-minute cache lifetime GitHub sets and nobody here can change.
  // The same face is now 15 KB of JPEG at 256px sitting next to the HTML.
  //
  // The photo itself is chosen in TinaCMS (content/profile.json); scripts/prepare-avatar.ts
  // turns whatever was uploaded into this 256px JPEG at build time, and the page uses that.
  avatar: AVATAR_PATH,
  focus: ['healthcare AI', 'agentic automation', 'fully autonomous software'],
  interests: ['deep space'],
  links: [
    { label: 'GitHub', url: 'https://github.com/soummyaanon' },
    { label: 'X', url: 'https://x.com/SoumyapX' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/soumyapanda12/' },
  ],
}

export const roles: readonly Role[] = [
  {
    // Location and stack are not filled in yet — see the note in the Role interface for why
    // that is allowed rather than stubbed. `title` defaults to the person's stated title
    // because none was given for this role specifically.
    //
    // The employer is withheld, and it is withheld *here* — the real name is not in this
    // file, so it is not in the bundle, the markup, the JSON-LD, the clipboard or llms.txt,
    // and there is nothing for a reader with dev tools open to find. A veil painted over a
    // string that is still in the DOM hides a name from a visitor, not from anyone looking.
    // The id is printed beside the record in the machine view, so it cannot be a slug of the
    // name either.
    id: 'undisclosed',
    org: 'Undisclosed',
    withheld: true,
    title: 'Software Engineer',
    from: '2026-06',
    until: null,
    summary: 'Building automation across internal processes to raise organisational efficiency.',
  },
  {
    id: 'wybit',
    org: 'Wybit',
    title: 'Software Engineer',
    from: '2025-07',
    until: '2026-06',
    location: 'Orlando, Florida, United States',
    remote: true,
    summary: 'Developing agents that are going to reshape healthcare.',
    stack: [
      'OpenAI',
      'Artificial Intelligence',
      'Next.js',
      'SaaS',
      'Software Design',
    ],
    logo: '/company-logos/cio.png',
  },
  {
    id: 'cloudoplus',
    org: 'Cloudoplus',
    title: 'AI Engineer',
    from: '2025-04',
    until: '2025-08',
    location: 'Santa Ana, California, United States',
    remote: true,
    summary:
      'Built an AI-powered QA agent that automated the quality assurance process, improving testing efficiency and cutting manual effort.',
    stack: [
      'Artificial Intelligence',
      'Machine Learning',
      'Python',
      'QA Automation',
      'Next.js',
      'React',
      'Node.js',
    ],
    logo: '/company-logos/claudo plus.png',
  },
  {
    id: 'chatsguru',
    org: 'Chatsguru',
    title: 'AI Engineer',
    from: '2024-09',
    until: '2025-04',
    location: 'Ahmedabad, Gujarat, India',
    remote: true,
    summary:
      'Shipped AI products including a social platform that unified posting across channels through connection alone, and a platform where users composed their own personalised bots.',
    stack: [
      'Next.js',
      'React',
      'Tailwind CSS',
      'Artificial Intelligence',
      'Machine Learning',
      'API Integration',
      'Bot Development',
      'Social Media APIs',
      'GitLab',
    ],
    logo: '/company-logos/chatguru.png',
  },
]

export const education: readonly Education[] = [
  {
    id: 'vtu',
    institution: 'Visvesvaraya Technological University',
    credential: 'Master of Computer Applications',
    field: 'Computer Science',
    from: '2022-12',
    until: '2024-10',
    focus: ['Software Development', 'Algorithms', 'Data Structures'],
    logo: '/company-logos/vtu.webp',
  },
]

/** Edited in the CMS: see `content/projects.json` and `src/data/project-content.ts`. */
export const projects: readonly Project[] = projectContent.map(
  ({ id, name, tagline, status, url, linkLabel, summary, capabilities, image, logo, featured, why, howItWorks, stack, install, source, platform }) => ({
    id,
    name,
    tagline,
    status,
    url,
    linkLabel,
    summary,
    capabilities,
    image,
    logo,
    featured,
    why,
    howItWorks,
    stack,
    install,
    source,
    platform,
  }),
)

/** Where a project's own page lives. Its `id` is the slug, which is why ids must not change casually. */
export function projectPath(id: string): string {
  return `/projects/${id}/`
}

export const skills: readonly SkillGroup[] = [
  {
    id: 'languages',
    label: 'Languages',
    items: ['TypeScript', 'JavaScript', 'Python', 'Go'],
  },
  {
    id: 'frameworks',
    label: 'Frameworks',
    items: ['Next.js', 'React', 'Node.js', 'Tailwind CSS', 'shadcn/ui'],
  },
  {
    id: 'ai',
    label: 'AI',
    // Products with names, not activities. "Agent SDKs" named no SDK and "Prompt engineering"
    // is a thing you do rather than a thing you use — neither told a reader anything they
    // could check. Short is fine; this list only grows when there is a real tool to add.
    items: ['OpenAI SDK', 'Anthropic SDK'],
  },
  {
    id: 'data',
    label: 'Data',
    items: ['PostgreSQL', 'MongoDB', 'Prisma'],
  },
  {
    id: 'workflow',
    label: 'Workflow',
    items: ['Git', 'Claude Code'],
  },
]

/**
 * The studio the owner runs and takes client work through. Several projects are hosted on
 * its domain, which is how the structured data ties them to it.
 */
export const studio = {
  id: 'studio',
  name: 'Bixai',
  url: 'https://bixai.dev',
  role: 'Founder',
} as const

/** What is true right now — the two live signals the human view surfaces. */
export const now = {
  building: {
    id: 'now.building',
    name: 'Engineering OS',
    url: 'https://engineering-os-hazel.vercel.app/',
  },
  learning: {
    id: 'now.learning',
    language: 'Go',
    repo: 'learning-Go',
    url: 'https://github.com/soummyaanon/learning-Go',
  },
} as const

// ── Derived ────────────────────────────────────────────────────────────────────

export const currentRole: Role | undefined = roles.find((role) => role.until === null)

export function roleById(id: string): Role | undefined {
  return roles.find((role) => role.id === id)
}

export function projectById(id: string): Project | undefined {
  return projects.find((project) => project.id === id)
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

/**
 * `2025-07` → `Jul 2025`. The human encoding of a date the machine view prints raw. Pass
 * another language's month names to read it in that language.
 * Returns the input unchanged if it is not in `YYYY-MM` form, so a malformed record
 * degrades to visible-but-wrong rather than throwing during a static build.
 */
export function formatMonth(value: string, months: readonly string[] = MONTHS): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return value

  const month = months[Number(match[2]) - 1]
  return month ? `${month} ${match[1]}` : value
}

/** `Jul 2025 — Present`, the human view's period string. */
export function formatPeriod(from: string, until: string | null): string {
  return `${formatMonth(from)} — ${until ? formatMonth(until) : 'Present'}`
}
