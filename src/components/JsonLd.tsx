/**
 * Emits one JSON-LD graph as a plain script tag. Server-rendered, so it lands in the
 * static HTML without `next/script` and without a client bundle cost.
 *
 * Build the `json` argument with the helpers in `src/lib/seo.ts` — notably `graph()`,
 * which cross-references entities by `@id` instead of duplicating them.
 */
export function JsonLd({ json }: { readonly json: string }) {
  return (
    <script
      type="application/ld+json"
      // The payload is JSON.stringify output built from local data, never user input.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
