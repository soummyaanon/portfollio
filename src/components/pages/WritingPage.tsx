import Link from 'next/link'
import type { Metadata } from 'next'

import { getAllBlogPosts } from '@/lib/blogs'
import { JsonLd } from '@/components/JsonLd'
import { BenchRails } from '@/components/document/BenchRails'
import {
  absoluteUrl,
  breadcrumbSchema,
  collectionPageSchema,
  graph,
  itemListSchema,
  OPEN_GRAPH_DEFAULTS,
  openGraphLocale,
  SITE_URL,
} from '@/lib/seo'
import { person } from '@/data/profile'
import { DEFAULT_LOCALE, languageAlternates, localizePath, type Locale } from '@/i18n/config'
import { dictionary } from '@/i18n/dictionaries'

/** /blogs/ in one language. The routes under `src/app/` only pick which. */
export function writingMetadata(locale: Locale): Metadata {
  const { meta } = dictionary(locale)
  const path = localizePath('/blogs/', locale)

  return {
    // The root layout appends the name, so the keyword-stacked title is unnecessary here.
    title: meta.writingTitle,
    description: meta.writingDescription,
    alternates: { canonical: path, languages: languageAlternates('/blogs/') },
    openGraph: {
      ...OPEN_GRAPH_DEFAULTS,
      ...openGraphLocale(locale),
      url: path,
      // The title template only applies to <title>, so the name is added here by hand.
      title: `${meta.writingTitle} — ${person.name}`,
      description: meta.writingDescription,
    },
  }
}

/**
 * The index of pieces. The pieces themselves are written in English and are not translated,
 * so on a translated index every title and excerpt is marked `lang="en"` and the header says
 * so before anyone clicks through and is surprised.
 */
export async function WritingPage({ locale }: { readonly locale: Locale }) {
  const blogPosts = await getAllBlogPosts()
  const t = dictionary(locale)
  const english = locale === DEFAULT_LOCALE
  const postLang = english ? undefined : DEFAULT_LOCALE

  return (
    <main
      lang={english ? undefined : locale}
      className="bench measure-page pb-[var(--space-foot)] pt-[clamp(2.5rem,6vw,5rem)]"
    >
      <BenchRails />
      <JsonLd
        json={graph(
          collectionPageSchema({
            path: '/blogs/',
            name: t.meta.writingTitle,
            description: t.meta.writingDescription,
            listId: `${SITE_URL}/#writing`,
            locale,
          }),
          ...(english
            ? [
                itemListSchema(
                  `${SITE_URL}/#writing`,
                  'Writing',
                  blogPosts.map((post) => ({
                    name: post.title,
                    url: absoluteUrl(`/blogs/${post.slug}/`),
                  })),
                ),
              ]
            : []),
          breadcrumbSchema([
            { name: t.meta.home, path: localizePath('/', locale) },
            { name: t.meta.writingTitle, path: localizePath('/blogs/', locale) },
          ]),
        )}
      />

      <header className="border-b border-border pb-[var(--space-section)]">
        <h1 className="font-display text-display leading-[0.9] tracking-[-0.02em] text-foreground">
          {t.meta.writingTitle}
        </h1>
        <p className="mt-[var(--space-group)] max-w-[56ch] text-lead leading-[1.5] text-foreground/85">
          {t.meta.writingDescription}
        </p>
        <p className="mt-[var(--space-group)] text-caption tabular-nums uppercase tracking-[0.16em] text-muted-foreground">
          {t.writingPage.count(blogPosts.length)}
          {t.writingPage.sourceLanguage && (
            <>
              <span aria-hidden> · </span>
              {t.writingPage.sourceLanguage}
            </>
          )}
        </p>
      </header>

      {blogPosts.length === 0 ? (
        // An empty state that says what would be here, rather than only that nothing is.
        <p className="mt-[var(--space-section)] max-w-[52ch] text-body text-muted-foreground">
          {t.writingPage.empty}
        </p>
      ) : (
        <ol className="mt-[var(--space-section)]">
          {blogPosts.map((post) => {
            const formattedDate = new Date(post.date).toLocaleDateString(t.writingPage.dateLocale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })

            return (
              <li key={post.slug} className="border-b border-border first:border-t">
                <Link
                  href={`/blogs/${post.slug}/`}
                  className="group grid gap-x-8 gap-y-2 py-[clamp(1.5rem,3vw,2.5rem)] sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <span lang={postLang} className="min-w-0">
                    <span className="block font-display text-title leading-[1.15] text-foreground decoration-signal/50 decoration-1 underline-offset-[6px] group-hover:underline">
                      {post.title}
                    </span>
                    <span className="mt-[var(--space-tight)] block max-w-[64ch] text-body leading-[1.55] text-foreground/75">
                      {post.excerpt}
                    </span>
                    {post.tags && post.tags.length > 0 && (
                      <span className="mt-[var(--space-tight)] block text-caption text-muted-foreground/70">
                        {post.tags.join(' · ')}
                      </span>
                    )}
                  </span>
                  <time
                    dateTime={post.date}
                    className="text-fine tabular-nums whitespace-nowrap text-muted-foreground sm:text-right"
                  >
                    {formattedDate}
                  </time>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </main>
  )
}
