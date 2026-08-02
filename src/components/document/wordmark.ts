import type { Role } from '@/data/profile'

/**
 * The one org name on this site that is allowed to carry hue.
 *
 * "BlackNgreen" is a colour statement, so it gets rendered as one — but behind the letters
 * rather than in them. See `.wordmark-bloom` in globals.css for the reasoning and the
 * paint. Every other role returns nothing and stays greyscale like the rest of the page.
 */
export function orgWordmarkClass(role: Role): string | undefined {
  return role.id === 'blackngreen' ? 'wordmark-bloom' : undefined
}
