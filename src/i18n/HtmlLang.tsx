'use client'

import { useEffect } from 'react'

import { useLocale } from './useLocale'

/**
 * Keeps `<html lang>` in step with the page. The root layout is shared by every language and
 * cannot see the URL while it renders, so it prints `en`; each translated page also marks its
 * own `<main>`, which is what covers the content before this runs. This covers the fixed
 * chrome outside it, the dock and its tooltips.
 */
export function HtmlLang() {
  const locale = useLocale()

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}
