import type { Role } from '@/data/profile'

/**
 * The veil over a withheld employer.
 *
 * There is nothing to conceal by the time this runs — the record never held the real name
 * (see `withheld` in profile.ts), so this is not hiding anything, it is *saying* something:
 * the field is blurred past legibility so the row reads as a name withheld rather than as an
 * employer called "Undisclosed". See `.wordmark-veil` in globals.css for the paint. Every
 * other role returns nothing and reads plainly.
 */
export function orgVeilClass(role: Role): string | undefined {
  return role.withheld ? 'wordmark-veil' : undefined
}
