import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Instrument_Sans, Space_Mono } from 'next/font/google'

import { ThemeProvider } from './components/ThemeProvider'
import { NavigationDock } from '@/components/ui/dock'
import { PostHogProvider } from '../components/PostHogProvider'
import { SITE_URL } from '@/lib/seo'
import { person, roles, skills } from '@/data/profile'

/**
 * The signature face, doing two jobs at once: it is both `--font-display` and
 * `--font-mono`. The name, every section title, every label, every date and count, and the
 * whole machine view are set in it. One face carrying that much of the page is what gives
 * the site a voice you would recognise without the name on it.
 *
 * Only 400 and 700 exist — there is no variable axis to lean on — so hierarchy has to come
 * from size, case, and tracking instead, which the type scale in globals.css is cut for.
 *
 * Named for the face, not the role: Tailwind's theme keys are `--font-display` and
 * `--font-mono`, and a font-loader variable of the same name would resolve to itself.
 */
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
})

/**
 * Text face, and only that. Running prose is the one thing a monospace genuinely cannot
 * do well — a paragraph of it is wide, loose, and tiring — so every multi-line block on
 * the site stays in a proportional grotesque with narrow, squared-off counters.
 */
const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Was hardcoded to #000000 while the default theme is light, which flashed a black
  // browser chrome against a near-white page. These match the resolved --background.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdfcfa' },
    { media: '(prefers-color-scheme: dark)', color: '#141316' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${person.name} — ${person.title}`,
    template: `%s — ${person.name}`,
  },
  description:
    'I build AI-driven tools that reduce human workload, currently focused on healthcare AI that streamlines physicians’ workflows.',
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
    icon: '/favicon-2025.png?v=1',
    shortcut: '/favicon-2025.png?v=1',
  },
  openGraph: {
    type: 'website',
    siteName: person.name,
    locale: 'en_US',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: `${person.name} — ${person.title}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@SoumyapX',
    images: ['/og.png'],
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${instrumentSans.variable} ${spaceMono.variable}`}>
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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <NavigationDock />
        </ThemeProvider>
      </body>
    </html>
  )
}
