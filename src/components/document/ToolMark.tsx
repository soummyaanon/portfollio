import type { SVGProps } from 'react'

import { Git } from '@/components/ui/svgs/git'
import { Javascript } from '@/components/ui/svgs/javascript'
import { MongodbIconLight } from '@/components/ui/svgs/mongodbIconLight'
import { Openai } from '@/components/ui/svgs/openai'
import { Postgresql } from '@/components/ui/svgs/postgresql'
import { Prisma } from '@/components/ui/svgs/prisma'
import { Python } from '@/components/ui/svgs/python'
import { ReactLight } from '@/components/ui/svgs/reactLight'
import { ShadcnUi } from '@/components/ui/svgs/shadcnUi'
import { Typescript } from '@/components/ui/svgs/typescript'

type Mark = (props: SVGProps<SVGSVGElement>) => React.ReactElement

/**
 * Brand marks, keyed by the exact string in `skills`. Not every tool has one and that is
 * fine — "Anthropic SDK" has no vendored mark and should not be given a stand-in glyph. Items
 * without a mark simply render as their name, which is also why the name is always present
 * even when a mark is: the logo is recognition, the word is the content, and a wall of
 * unlabelled logos is a guessing game for anyone who does not already know the ecosystem.
 *
 * Three entries are deliberately absent even though a file exists for them:
 *  · Next.js and Go — the vendored files are wordmarks, and a wordmark set beside the same
 *    word just prints the name twice.
 *  · Node.js — the vendored file fills its paths from `url(#a)` and `url(#c)`, gradients it
 *    never defines, so it renders as an invisible gap. The Next.js *icon* is broken the same
 *    way. Both are upstream extraction bugs, not something to paper over here.
 */
const MARKS: Readonly<Record<string, Mark>> = {
  TypeScript: Typescript,
  JavaScript: Javascript,
  Python: Python,
  React: ReactLight,
  'shadcn/ui': ShadcnUi,
  'OpenAI SDK': Openai,
  PostgreSQL: Postgresql,
  MongoDB: MongodbIconLight,
  Prisma: Prisma,
  Git: Git,
}

/**
 * One tool: its mark, desaturated, followed by its name.
 *
 * The marks arrive as full-colour brand SVGs, several of them with gradients, and this page
 * has no hue anywhere. Rather than hand-editing thirteen files into greyscale, a filter does
 * it at paint time — `grayscale` flattens them to tone, and in dark mode `invert` follows,
 * because a black wordmark on a near-black ground is not a subtle logo, it is an absent one.
 * The filter is on the wrapper rather than the SVG so it composites once.
 */
export function ToolMark({ name }: { readonly name: string }) {
  const Mark = MARKS[name]

  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      {Mark && (
        // Height-constrained with a free width. These are not all square — the MongoDB
        // leaf is 1:2 and the React atom is 9:8 — and forcing them into a square box
        // distorts them.
        <span
          aria-hidden
          className="inline-flex h-[1em] shrink-0 translate-y-[0.12em] items-center opacity-70 grayscale [&_svg]:h-full [&_svg]:w-auto dark:opacity-80 dark:invert"
        >
          <Mark />
        </span>
      )}
      {name}
    </span>
  )
}

export function hasToolMark(name: string): boolean {
  return name in MARKS
}
