import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'This URL does not exist. Use the recovery links to continue browsing.',
  robots: { index: false, follow: true },
}

const recoveryLinks = [
  { href: '/', label: 'Homepage', detail: 'profile, experience, and current work' },
  { href: '/projects/', label: 'Projects', detail: 'products and open-source work' },
  { href: '/blogs/', label: 'Writing', detail: 'articles on agents and software engineering' },
  { href: '/sitemap.xml', label: 'Sitemap', detail: 'complete index of public pages' },
  { href: '/llms.txt', label: 'llms.txt', detail: 'short agent-readable site guide' },
  { href: '/llms-full.txt', label: 'llms-full.txt', detail: 'complete machine-readable record' },
] as const

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-[70rem] flex-col justify-center px-[clamp(1.25rem,4vw,4rem)] py-[clamp(4rem,10vw,8rem)]">
      <p className="field-label text-muted-foreground">HTTP 404</p>
      <h1 className="mt-[var(--space-tight)] font-display text-display leading-[0.9] tracking-[-0.03em] text-foreground">
        Page not found
      </h1>
      <p className="mt-[var(--space-group)] max-w-[60ch] text-lead leading-[1.55] text-foreground/80">
        The requested path does not exist. Choose a destination below, or use the sitemap and
        agent-readable indexes to locate the right resource.
      </p>

      <nav aria-label="404 recovery links" className="mt-[var(--space-section)]">
        <ul className="border-t border-border">
          {recoveryLinks.map((link) => (
            <li key={link.href} className="border-b border-border">
              <Link
                href={link.href}
                className="group grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6"
              >
                <span className="font-display text-body text-foreground underline-offset-4 group-hover:underline">
                  {link.label}
                </span>
                <span className="text-body text-muted-foreground">{link.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  )
}
