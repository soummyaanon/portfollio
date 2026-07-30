/**
 * Blog data reaches the document through props, not an import: `src/lib/blogs.ts` reads the
 * filesystem and cannot be pulled into a client component. `src/app/page.tsx` resolves it at
 * build time and passes this down.
 */
export interface PostSummary {
  readonly title: string
  readonly slug: string
  readonly date: string
  readonly excerpt: string
}
