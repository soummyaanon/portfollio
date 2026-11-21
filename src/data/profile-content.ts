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
  /**
   * How far to zoom into the photo before cropping: 1 keeps the whole frame, 2 is twice as
   * close. The zoom aims a little above centre, where a portrait keeps the face.
   */
  avatarZoom: z
    .number()
    .min(1, 'zoom starts at 1 (the whole photo)')
    .max(4, 'zoom is at most 4')
    .nullish()
    .transform((value) => value ?? 1),
})

export const profileContent = profileSchema.parse(raw)
