import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Figtree, Space_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'

import { ThemeProvider } from './components/ThemeProvider'
import { NavigationDock } from '@/components/ui/dock'
import { PostHogProvider } from '../components/PostHogProvider'
import { OPEN_GRAPH_DEFAULTS, SITE_URL } from '@/lib/seo'
import { person, roles, skills } from '@/data/profile'

/**
 * The machine voice: `--font-mono`. Every section label, every date and count, and the
 * whole machine view are set in it; titles and text are Figtree.
 *
 * Named for the face, not the role: Tailwind's theme key is `--font-mono`, and a
 * font-loader variable of the same name would resolve to itself.
 */
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
})

/**
 * Text and titles: `--font-sans` and `--font-display`. A proportional geometric sans, open
 * and friendly at reading sizes and firm when cut heavy for titles, paired with the
 * monospace the way gurbinder.dev pairs them. A variable face, so every weight from 300 to
 * 900 is one file.
 */
const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The theme is forced dark, so the browser chrome matches the dark --background whatever
  // the visitor's system preference.
  themeColor: '#0b0d0e',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${person.name} — ${person.title}`,
    template: `%s — ${person.name}`,
  },
  description:
    'I’m a builder making healthcare AI, agentic automation, and fully autonomous software that make life easier.',
  authors: [{ name: person.name, url: SITE_URL }],
  creator: person.name,
  robots: 'index, follow, max-image-preview:large, max-snippet:-1',
  // Not a ranking signal — a topical fingerprint for retrieval systems that embed the head
  // alongside the body. Derived from the profile so it cannot drift from what the page says.
  keywords: [
    person.name,
    person.title,
    ...person.focus,
    ...skills.flatMap((group) => group.items),
    // A withheld employer contributes no keyword — "Undisclosed" is not a topic.
    ...roles.filter((role) => !role.withheld).map((role) => role.org),
  ],
  icons: {
    icon: '/favicon-2025.png?v=2',
    shortcut: '/favicon-2025.png?v=2',
    apple: '/favicon-2025.png?v=2',
  },
  applicationName: person.name,
  openGraph: OPEN_GRAPH_DEFAULTS,
  twitter: {
    card: 'summary_large_image',
    creator: '@SoumyapX',
    images: ['/og.png?v=2'],
  },
}

// Note: no `alternates.canonical` here on purpose. A canonical set on the root layout
// resolves to the same URL for every route, which previously told search engines that
// every page was a duplicate of the homepage. Each route declares its own.

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // The font variables go on <html>, not <body>: Tailwind defines `--font-sans` and
    // `--font-mono` on :root, and there they can only see variables set on <html>. On
    // <body> they resolved to nothing and the text fell back to the system face.
    <html lang="en" className={`${figtree.variable} ${spaceMono.variable}`} suppressHydrationWarning>
      <body>
        {/* Hoisted into <head> by React. Declared here rather than in `metadata.alternates`
            because a child route setting `alternates.canonical` replaces the whole
            `alternates` object, which would silently drop this on every page but one.
            It is how an agent that has not been told about /llms.txt discovers it. */}
        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
        <link
          rel="alternate"
          type="text/plain"
          href="/llms-full.txt"
          title="llms-full.txt"
        />
        <PostHogProvider />
        <ThemeProvider attribute="class" forcedTheme="dark" enableSystem={false}>
          {children}
          <NavigationDock />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
