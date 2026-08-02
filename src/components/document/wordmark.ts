import type { Role } from '@/data/profile'

/**
 * The one org name on this site that is withheld rather than read.
 *
 * "BlackNgreen" is left in the record but veiled: the glyphs are blurred past legibility and
 * the two colours the name states bloom behind them. See `.wordmark-veil` in globals.css for
 * the reasoning and the paint. Every other role returns nothing and stays plainly readable
 * like the rest of the page.
 */
export function orgWordmarkClass(role: Role): string | undefined {
  return role.id === 'blackngreen' ? 'wordmark-veil' : undefined
}
