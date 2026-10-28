/**
 * Which languages the site is published in, and where each one lives.
 *
 * English is the default and keeps the unprefixed URLs it always had — every canonical,
 * inbound link and search listing stays where it was. Every other language is a prefix:
 * Hindi is `/hi/`, `/hi/projects/`, `/hi/blogs/`. Adding a language is one entry here, one
 * dictionary, one profile overlay and one folder under `src/app/`.
 *
 * Nothing is detected in the browser. The site is a static export, so `/` and `/hi/` are two
 * prebuilt files; the choice between them is made before either is served, by the redirect
 * rules in `vercel.json` (the visitor's saved choice first, then their browser's language).
 */

export const LOCALES = ['en', 'hi'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

/** What the switcher calls each language, in that language. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  hi: 'हिन्दी',
}

/** Open Graph's spelling of each locale. */
export const OG_LOCALES: Record<Locale, string> = {
  en: 'en_US',
  hi: 'hi_IN',
}

/**
 * The cookie the switcher writes and `vercel.json` reads. A choice the visitor made always
 * beats what their browser says, so someone who picks English on a Hindi browser is never
 * redirected back.
 */
export const LOCALE_COOKIE = 'lang'

/**
 * The routes that exist in every language. A blog post is not translated, so switching
 * language on one lands on the writing index in that language rather than on a 404.
 */
export const TRANSLATED_PATHS = ['/', '/projects/', '/blogs/'] as const

function prefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`
}

/** `/hi/projects/` → `hi`; anything without a language prefix is English. */
export function localeFromPath(pathname: string): Locale {
  const first = pathname.split('/')[1]
  return LOCALES.find((locale) => locale !== DEFAULT_LOCALE && locale === first) ?? DEFAULT_LOCALE
}

/** `/hi/projects/` → `/projects/`: the path with its language prefix removed. */
export function basePath(pathname: string): string {
  const locale = localeFromPath(pathname)
  if (locale === DEFAULT_LOCALE) return pathname
  const rest = pathname.slice(prefix(locale).length)
  return rest === '' ? '/' : rest
}

/** A language-neutral path (`/projects/`) as it is spelled in `locale` (`/hi/projects/`). */
export function localizePath(path: string, locale: Locale): string {
  return `${prefix(locale)}${path}`
}

/** Where the switcher sends someone reading `pathname` who wants it in `locale`. */
export function counterpartPath(pathname: string, locale: Locale): string {
  // `usePathname()` drops the trailing slash the exported URLs carry.
  const stripped = basePath(pathname)
  const base = stripped.endsWith('/') ? stripped : `${stripped}/`
  if ((TRANSLATED_PATHS as readonly string[]).includes(base)) return localizePath(base, locale)
  if (base.startsWith('/blogs/')) return localizePath('/blogs/', locale)
  return localizePath('/', locale)
}

/** `hreflang` alternates for a translated route, in the shape Next's metadata expects. */
export function languageAlternates(path: (typeof TRANSLATED_PATHS)[number]): Record<string, string> {
  return {
    ...Object.fromEntries(LOCALES.map((locale) => [locale, localizePath(path, locale)])),
    'x-default': path,
  }
}
