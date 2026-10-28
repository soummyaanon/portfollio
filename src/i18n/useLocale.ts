'use client'

import { usePathname } from 'next/navigation'

import { localeFromPath, type Locale } from './config'
import { dictionary, type Dictionary } from './dictionaries'
import { localizedProfile, type LocalizedProfile } from './profile'

/**
 * The language of the page being shown, read from its URL.
 *
 * The URL is the only source, on purpose: it is known while the page is prerendered, so the
 * static HTML and the hydrated page always agree, and components outside a page — the dock,
 * the mode toggle — need no provider threaded down to them from it.
 */
export function useLocale(): Locale {
  return localeFromPath(usePathname() ?? '/')
}

export interface I18n {
  readonly locale: Locale
  readonly t: Dictionary
  readonly profile: LocalizedProfile
}

export function useI18n(): I18n {
  const locale = useLocale()
  return { locale, t: dictionary(locale), profile: localizedProfile(locale) }
}
