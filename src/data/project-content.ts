/**
 * Projects are content, not code: they live in `content/projects.json`, which TinaCMS edits
 * (see `tina/config.ts`). This module is the typed boundary for that file. It parses it once
 * at import, so a malformed edit fails the build with a readable message rather than
 * rendering a card with a missing URL.
 *
 * The order of the list is the order on the site, and `featured` picks the homepage cards.
 */

import { z } from 'zod'

import raw from '../../content/projects.json'

/** Tina writes `null` for a cleared optional field; the site treats that as absent. */
const optionalText = z
  .string()
  .nullish()
  .transform((value) => value || undefined)

const prose = z.object({
  tagline: z.string().min(1),
  linkLabel: z.string().min(1),
  summary: z.string().min(1),
  capabilities: z.array(z.string().min(1)),
})

const projectSchema = prose.extend({
  id: z.string().regex(/^[a-z0-9-]+$/, 'ids are lowercase words joined by hyphens'),
  name: z.string().min(1),
  status: z.enum(['live', 'in-development', 'experimental']),
  url: z.url(),
  image: optionalText,
  logo: optionalText,
  featured: z.boolean().nullish().transform(Boolean),
  /**
   * The long form, for the project's own page only, in English only (like the posts). Every
   * field is optional: a page renders the sections it has and drops the rest.
   */
  why: optionalText,
  howItWorks: z
    .array(z.string().min(1))
    .nullish()
    .transform((value) => value ?? []),
  stack: z
    .array(z.string().min(1))
    .nullish()
    .transform((value) => value ?? []),
  install: optionalText,
  source: z
    .url()
    .nullish()
    .transform((value) => value || undefined),
  /** What it runs on, for the structured data. Defaults to "Web". */
  platform: optionalText,
  /** The Hindi page's prose for this project; names, URLs and statuses are never translated. */
  hi: prose.partial().nullish().transform((value) => value ?? {}),
})

const contentSchema = z
  .object({ projects: z.array(projectSchema) })
  .refine(({ projects }) => new Set(projects.map((project) => project.id)).size === projects.length, {
    message: 'two projects share an id',
  })

export type ProjectContent = z.infer<typeof projectSchema>

export const projectContent: readonly ProjectContent[] = contentSchema.parse(raw).projects
