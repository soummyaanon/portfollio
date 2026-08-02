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

export interface Link {
  readonly label: string
  readonly url: string
}

export interface Person {
  readonly id: string
  readonly name: string
  readonly givenName: string
  readonly familyName: string
  readonly title: string
  readonly location: string
  readonly timezone: string
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

export interface Project {
  readonly id: string
  readonly name: string
  readonly tagline: string
  readonly status: 'live' | 'in-development'
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
}

export interface SkillGroup {
  readonly id: string
  readonly label: string
  readonly items: readonly string[]
}

export const person: Person = {
  id: 'person',
  name: 'Soumyaranjan Panda',
  givenName: 'Soumyaranjan',
  familyName: 'Panda',
  title: 'Software Engineer',
  location: 'India',
  timezone: 'Asia/Kolkata',
  site: 'https://soumyapanda.me',
  // Stable URL on purpose. The old Hero appended `?v=<today>`, which minted a new URL every
  // day and so guaranteed a cache miss for every visitor.
  avatar: 'https://github.com/soummyaanon.png',
  focus: ['AI-driven tools', 'healthcare AI'],
  interests: ['deep-space science', 'political developments'],
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
    title: person.title,
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
    logo: '/company-logos/visvesvaraya-technological-university.png',
  },
]

export const projects: readonly Project[] = [
  {
    // Source repo is private; the releases repo is public and is what the link points at.
    id: 'agent-island',
    name: 'Agent Island',
    tagline: 'Dynamic Island for coding agents',
    status: 'live',
    url: 'https://github.com/soummyaanon/DEV-island-releases/releases/latest',
    linkLabel: 'Download for macOS',
    summary:
      'A macOS overlay that wraps the MacBook notch and reports on Claude Code, Codex, and Cursor sessions running in parallel — who is working, who is finished, and who is waiting on you.',
    capabilities: [
      'Live session rows with project, elapsed time, and current activity',
      'Approve Claude permission requests from the notch with ⌘Y and ⌘N',
      'Answer an agent’s multiple-choice question with ⌘1–9',
      'Click a session to raise the exact terminal tab hosting it',
      'Entirely local — no accounts, no API keys, no telemetry',
    ],
  },
  {
    id: 'arthion',
    name: 'Arthion AI',
    tagline: 'Financial intelligence',
    status: 'in-development',
    url: 'https://arthionai.app/',
    linkLabel: 'Visit site',
    summary:
      'Financial intelligence platform giving real-time stock analysis, technical indicators, market sentiment tracking, and insights you can act on.',
    capabilities: [
      'Real-time stock charts with OHLC and line views',
      'Technical indicators including RSI and MACD',
      'Top movers tracking across gainers, losers, and most active',
      'News and sentiment analysis',
      'AI-generated stock recommendations',
    ],
    image: '/arthion.png',
    logo: '/arthion-logo.ico',
  },
  {
    // Source repo is private; the package on npm is the public artifact.
    id: 'god-of-debugger',
    name: 'God of Debugger',
    tagline: 'Debugging plugin for Claude Code',
    status: 'live',
    url: 'https://www.npmjs.com/package/@bixai/god-of-debugger',
    linkLabel: 'View on npm',
    summary:
      'Debug by disproving. One slash command turns a bug report into a falsification protocol, and a fix is proposed only when exactly one hypothesis is left standing.',
    capabilities: [
      'Bootstraps a deterministic repro before hypothesising',
      'Generates competing primary and adversarial hypotheses',
      'One falsification experiment per hypothesis, run by parallel subagents',
      'Survival table scoring each hypothesis killed, survived, or inconclusive',
      'Promotes surviving experiments into permanent regression tests',
    ],
  },
  {
    id: 'marcko',
    name: 'Marcko',
    tagline: 'Open source markdown editor',
    status: 'live',
    url: 'https://marcko.bixai.dev',
    linkLabel: 'Visit site',
    summary:
      'Markdown editor with real-time preview, secure document sharing, and encryption at rest. Free for developers and writers.',
    capabilities: [
      'Real-time markdown preview',
      'Secure enterprise document sharing',
      'Encryption at rest',
      'AI integration for writing',
    ],
    image: '/marcko-og.png',
  },
  {
    id: 'bixai-starter',
    name: 'Bixai Agent SDK Starter',
    tagline: 'Next.js AI agent template',
    status: 'live',
    url: 'https://create.bixai.dev',
    linkLabel: 'Visit site',
    summary:
      'Template for production-ready agent apps built on Next.js and the OpenAI Agents SDK, with a modular tool structure and a fast path to deployment.',
    capabilities: [
      'Production-ready Next.js integration',
      'OpenAI Agents SDK support',
      'Modular tool and agent structure',
    ],
    image: '/create-bixai-og.jpg',
  },
  {
    id: 'aarekhit',
    name: 'Aarekhit AI',
    tagline: 'Data visualisation',
    status: 'live',
    url: 'https://www.aarekhit.com/',
    linkLabel: 'Visit site',
    summary:
      'Graph visualisation and analysis platform that turns text and data into interactive visualisations in seconds.',
    capabilities: [
      'Interactive graph visualisation',
      'AI-powered data analysis',
      'Real-time collaboration',
      'Custom styling and theming',
    ],
    image: '/aarekhit.png',
    logo: '/aarekhit-logo.png',
  },
  {
    id: 'notex',
    name: 'Notex',
    tagline: 'AI note-taking',
    status: 'live',
    url: 'https://noteex.vercel.app/',
    linkLabel: 'Visit site',
    summary:
      'Note-taking with AI-generated insights and the noteX assistance bot, organised so thoughts stay in order and private.',
    capabilities: [
      'noteX assistance bot',
      'Smart organisation for structured notes',
      'Cross-platform synchronisation',
    ],
    image: '/notex.png',
    logo: '/notex1.png',
  },
  {
    id: 'readany',
    name: 'Readany',
    tagline: 'PDF book reader',
    status: 'live',
    url: 'https://readany.vercel.app/',
    linkLabel: 'Visit site',
    summary:
      'PDF reader that turns static documents into a reading experience, with realistic page flipping and heavy customisation.',
    capabilities: [
      'Realistic page-flip animation',
      'Customisable reading themes',
      'Bookmarks and annotation',
      'Text-to-speech',
    ],
    image: '/readny.png',
  },
]

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
    items: ['OpenAI API', 'Anthropic Claude', 'Agent SDKs', 'Prompt engineering'],
  },
  {
    id: 'data',
    label: 'Data',
    items: ['PostgreSQL', 'MongoDB', 'Prisma'],
  },
  {
    id: 'workflow',
    label: 'Workflow',
    items: ['Git'],
  },
]

/** What is true right now — the two live signals the human view surfaces. */
export const now = {
  building: {
    id: 'now.building',
    name: 'Arthion AI',
    url: 'https://arthionai.app/',
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
 * `2025-07` → `Jul 2025`. The human encoding of a date the machine view prints raw.
 * Returns the input unchanged if it is not in `YYYY-MM` form, so a malformed record
 * degrades to visible-but-wrong rather than throwing during a static build.
 */
export function formatMonth(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return value

  const month = MONTHS[Number(match[2]) - 1]
  return month ? `${month} ${match[1]}` : value
}

/** `Jul 2025 — Present`, the human view's period string. */
export function formatPeriod(from: string, until: string | null): string {
  return `${formatMonth(from)} — ${until ? formatMonth(until) : 'Present'}`
}
