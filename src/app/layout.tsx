import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Instrument_Serif, IBM_Plex_Mono } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'

import { ThemeProvider } from './components/ThemeProvider'
import { NavigationDock } from '@/components/ui/dock'
import { PostHogProvider } from '../components/PostHogProvider'
import { SITE_URL } from '@/lib/seo'
import { person } from '@/data/profile'

/** Display face. Carries every large heading; never used below ~1.5rem. */
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  // Named for the face, not the role: Tailwind's theme key is `--font-display`, and a
  // font-loader variable of the same name would resolve to itself.
  variable: '--font-instrument',
  display: 'swap',
})

/**
 * Machine face. Confined to specimen-sheet field values, where the content is genuinely
 * tabular — not sprinkled around as shorthand for "technical".
 */
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
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
      <body
        className={`${GeistSans.variable} ${instrumentSerif.variable} ${ibmPlexMono.variable}`}
      >
        <PostHogProvider />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <NavigationDock />
        </ThemeProvider>
      </body>
    </html>
  )
}
