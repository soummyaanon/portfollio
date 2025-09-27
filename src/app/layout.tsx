import './globals.css'
import type { Metadata } from 'next'
import { ThemeProvider } from './components/ThemeProvider'
import { NavigationDock } from '@/components/ui/dock'

export const metadata: Metadata = {
  title: 'Soumya Panda - Software Developer',
  description: 'Portfolio of Soumya Panda - Full-stack Developer specializing in Next.js, TypeScript, and AI systems',
  keywords: ['Full Stack Developer', 'Next.js', 'TypeScript', 'AI Systems', 'Healthcare'],
  authors: [{ name: 'Soumya Panda' }],
  openGraph: {
    title: 'Soumya Panda - Software Developer',
    description: 'Full-stack Developer specializing in Next.js, TypeScript, and AI systems',
    type: 'website',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Soumya Panda - Software Developer',
    description: 'Full-stack Developer specializing in Next.js, TypeScript, and AI systems',
    images: ['/og-image.jpg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <NavigationDock />
        </ThemeProvider>
      </body>
    </html>
  )
}