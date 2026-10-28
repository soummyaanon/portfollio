import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from './config'

/** The time zones a browser in India reports. `Asia/Calcutta` is the older spelling. */
const INDIA_TIME_ZONES = ['Asia/Kolkata', 'Asia/Calcutta']

/**
 * Whether the dock's language switch should pulse once to say a Hindi page exists.
 *
 * Only for someone reading English in India who has never picked a language. The browser's
 * time zone answers "in India" without a server or an IP lookup. A saved choice in either
 * direction means they already know about the switch, so it stays quiet. It is an invitation,
 * never a redirect: an English browser in India is usually someone who chose English.
 */
export function shouldNudge({
  locale,
  timeZone,
  cookie,
}: {
  readonly locale: Locale
  readonly timeZone: string | undefined
  readonly cookie: string
}): boolean {
  if (locale !== DEFAULT_LOCALE) return false
  if (!timeZone || !INDIA_TIME_ZONES.includes(timeZone)) return false
  return !cookie.split(/;\s*/).some((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))
}
