/**
 * The parts of the profile that TinaCMS edits (see `tina/config.ts`), so far just the
 * portrait. Like `project-content.ts`, this is the typed boundary for the file: a bad edit
 * fails the build with a readable message instead of shipping a broken image.
 */

import { z } from 'zod'

import raw from '../../content/profile.json'

const profileSchema = z.object({
  /** A path under public/, as Tina's media manager writes it: "/avatar.jpg". */
  avatar: z
    .string()
    .regex(/^\/[^/].*\.(jpe?g|png|webp|avif)$/i, 'the avatar must be an image in public/, e.g. "/avatar.jpg"'),
})

export const profileContent = profileSchema.parse(raw)
