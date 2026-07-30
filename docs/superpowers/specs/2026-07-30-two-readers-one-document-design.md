# Two Readers, One Document

**Date:** 2026-07-30
**Branch:** `redesign/two-readers`
**Status:** Approved

## Premise

The site's job is to *be* the portfolio piece — craft over conversion. It already contains one
genuinely original idea: a Human/Machine toggle that ships a human-designed page and a
machine-readable version of the same content. Today that idea is a novelty switch painted in the
most templated aesthetic in the genre (matrix rain, CRT flicker, green neon, chromatic-aberration
glitch).

This redesign promotes the idea from feature to thesis: **one document, rendered at two resolutions
of trust.** The human view is a typographically confident editorial page. The machine view is a
*specimen sheet* — the same facts re-encoded as visible, fielded, schema'd data, styled like a
bibliographic record rather than a hacker terminal.

The switch is a **morph**, not a crossfade. Individual facts physically travel from inside prose
sentences into their slots in a fielded record. You watch "Wybit" leave the sentence and land in
`org:`. That is the one thing a visitor will remember and try to reverse-engineer.

Generative-engine optimisation is not a parallel workstream here. A machine-readable specimen sheet
of a person is precisely what an LLM crawler wants, so the design goal and the GEO goal are served
by the same refactor.

## Existing defects this replaces

Found while surveying, all load-bearing for the design:

1. **Conflicting canonicals.** `layout.tsx:270` hardcodes `<link rel="canonical"
   href="https://soumyapanda.me" />` into `<head>` for every route. Blog posts *also* set a correct
   canonical via `generateMetadata` (`blogs/[slug]/page.tsx:42`), so each post ships two conflicting
   canonical tags; every other route declares itself a duplicate of the homepage.
2. **The machine view never reaches a crawler.** `page.tsx:40` mounts `MachineView` only when
   `isHuman` is false, and `MachineView` returns `null` when `!isVisible`
   (`machine-view.tsx:339`). The `sr-only` "raw markdown content for AI agents" block is never in
   the shipped HTML. The GEO play is currently a no-op.
3. **Experience ships as skeletons.** `Experience.tsx:78` populates state from `useEffect` over a
   *synchronous JSON import*. Under `output: 'export'` the static HTML contains only the loading
   placeholder, so the job history is invisible to Google and to LLM crawlers. The surrounding
   `try/catch`, error state, and retry button guard an import that cannot fail.
4. **Facts exist three times.** React components, the hardcoded `MARKDOWN_CONTENT` string in
   `machine-view.tsx:22`, and the JSON-LD in `layout.tsx:124`. The morph is impossible while the two
   views are two hardcoded strings.
5. **No typographic scale.** `h1` is `text-xl` on desktop; body is `text-xs`. Everything lives in a
   12–24px band in one `max-w-2xl` column.
6. **Four type systems.** Chakra Petch and IBM Plex Mono (globals.css), GeistPixelCircle (Hero),
   GeistMono (MachineView).
7. **Runtime GitHub fan-out.** `Hero.tsx:67-93` issues up to 10 sequential unauthenticated GitHub
   API calls per page load to count commits. Unauthenticated limit is 60/hr per IP.
8. **Keyword stuffing.** `layout.tsx:36-98` is a 60-entry `keywords` array. Ignored by search
   engines since 2009 and a spam signal to LLM extractors.
9. **`projects/page.tsx` has no metadata at all** — it inherits the homepage title and description.

## Architecture

### Keystone: single source of truth

`src/data/profile.ts` — one typed module. Everything derives from it:

| Consumer | Derives |
|---|---|
| Human view | editorial prose |
| Machine view | specimen-sheet records |
| `src/lib/seo.ts` | JSON-LD (`Person`, `WebSite`, `SoftwareApplication`, `BlogPosting`) |
| `scripts/generate-llms.ts` | `public/llms.txt`, `public/llms-full.txt` |
| `scripts/generate-sitemap.ts` | existing sitemap, extended |

Shape: `person`, `roles[]`, `education[]`, `projects[]`, `skills`, `now` (currently building /
learning). Absorbs `src/data/experiences.json`, the `EDUCATION_DATA` const in `Experience.tsx:309`,
`src/data/projects.tsx`, and `MARKDOWN_CONTENT`.

Each record carries a stable `id` (`role.wybit`, `project.arthion`). Those ids become the morph's
`layoutId` namespace, so the correspondence between the two views is structural rather than
maintained by hand.

### The morph

`src/components/document/Fact.tsx` — a primitive wrapping one atomic value with a stable
`layoutId`. Both views render the same `Fact` set inside a shared `LayoutGroup`; only the container
differs.

- **Human mode:** facts are inline inside sentences and headings.
- **Machine mode:** the same nodes occupy value slots in a fielded record.
- Framer Motion's shared-layout animation moves them. Transform and opacity only.
- Connective prose ("I build", "that reduce human workload") fades out; field labels (`org`, `from`,
  `until`) fade in, staggered behind the movement.
- `prefers-reduced-motion` → instant crossfade, no travel.
- Fallback: if a `layoutId` has no counterpart in the target view, it fades rather than jumping.

View state lifts to a `DocumentModeProvider` so the toggle, both views, and the dock read one source.

### Static-HTML guarantee

The morph requires mount/unmount — two simultaneously live elements sharing a `layoutId` contend
over which one leads, so both views cannot be mounted at once. The machine view is therefore a
*design* feature and explicitly **not** the mechanism by which machines read the site. Rendering a
hidden duplicate for crawlers is also cloaking-adjacent and is rejected.

Three separate channels serve machines instead:

1. **The human view**, genuinely prerendered with real text. This is what Google and LLM crawlers
   read, and it is what fixes defect 3.
2. **JSON-LD**, for structured extraction.
3. **`llms.txt` / `llms-full.txt`**, the explicit LLM channel, carrying the full specimen content.

The binding requirement is therefore narrower and stricter: no section may depend on client state or
an effect to appear in the initial payload. Experience and Projects render from a synchronous import
with no `useEffect` gate. `src/app/page.tsx` becomes a server component that owns metadata and
JSON-LD and renders the client document beneath it.

## Design system

**Type.** Instrument Serif (display) + Geist Sans (body/UI), both via `next/font`. Chakra Petch and
GeistPixelCircle are removed. IBM Plex Mono survives in exactly one role: machine-view field values,
where it is genuinely tabular data and therefore earns the monospace. Fluid scale via `clamp()`,
roughly 0.75rem captions → 5rem display.

**Colour.** Existing amber `oklch(0.7214 0.1337 49.9802)` becomes the single signal colour. Light
background moves off pure `oklch(1 0 0)` and neutrals warm toward the signal hue. Machine view uses
the identical palette — no green, no second theme.

**Deletions.** `globals.css:713-816` (terminal scanline/glow, cyber flicker, matrix rain, glitch
skew, CRT flicker, text-glitch chromatic aberration). The repeated
`bg-white/40 … backdrop-blur-sm … rounded-full` status pill is replaced by a rule-and-label
treatment consistent with the specimen sheet.

**Motion.** Exponential ease-out. Page load gets one orchestrated staggered reveal rather than
scattered micro-interactions.

## SEO / GEO

1. Delete the `keywords` array; rewrite title and description as sentences a human would say.
2. Remove the global `<link rel="canonical">`; every route declares its own via `alternates`.
3. Add metadata to `projects/page.tsx`.
4. Split JSON-LD out of the root layout into `src/lib/seo.ts`: `Person` + `WebSite` with `@id`
   cross-links on the homepage only; `BlogPosting` per post; `SoftwareApplication` per project;
   per-route `BreadcrumbList` replacing the hardcoded Home→Blog emitted on every page.
5. `scripts/generate-llms.ts` writes `public/llms.txt` (index) and `public/llms-full.txt` (complete
   profile + posts) at build time. Generated into `public/` rather than served from a route handler
   because `trailingSlash: true` would emit `/llms.txt/` and break the convention.
6. `public/robots.txt`: explicit `Allow` for GPTBot, ClaudeBot, OAI-SearchBot, PerplexityBot,
   Google-Extended, Applebot-Extended, plus `Sitemap:` and a pointer to `llms.txt`.
7. Wire the existing per-project OG images in `public/` into project metadata.
8. `viewport.themeColor` becomes theme-aware instead of hardcoded `#000000` against a light default.

## Error handling

- **Commit count:** moves to build time. The generator script fetches it and writes it into a
  generated data file; a fetch failure leaves the previous committed value and logs a warning rather
  than failing the build. The UI has no runtime fetch and therefore no loading or error state.
- **Removed ceremony:** the Experience skeleton, error state, and retry disappear with the
  `useEffect`. A genuinely empty `roles[]` renders an empty state that names what belongs there.
- **Third-party script:** the jsdelivr companion (`layout.tsx:289`) is removed — a blocking
  third-party script and a supply-chain surface on a site whose thesis is craft.

## Verification

No test infrastructure exists in the repo, so verification is build output plus browser.

1. `npm run build` passes.
2. Assert against `out/`: machine-view records present in `out/index.html`; role and project text
   present (not skeletons); exactly one `<link rel="canonical">` per page and pointing at itself;
   `Person`/`WebSite` only on the homepage; `BlogPosting` on each post; `llms.txt` and
   `llms-full.txt` non-empty and reflecting `profile.ts`.
3. Browser: morph at 390 / 768 / 1440, light and dark, plus `prefers-reduced-motion` forced.
4. Confirm zero network requests to `api.github.com` on load.

## Changes made during implementation

Recorded because each departs from the spec above.

**A published credential (found mid-build, not in the original survey).**
`.github/workflows/nextjs.yml` wrote `NEXT_PUBLIC_GITHUB_PAT` into `.env.local` at build time,
and `GitHubContributions.tsx` read it to call the GraphQL API from the browser. Next inlines
every `NEXT_PUBLIC_*` value into the client bundle, so the deployed site served that token to
every visitor. **The token must be revoked.** The component no longer fetches at all: the
calendar is resolved at build time by `scripts/generate-github.ts` from
`github.com/users/<user>/contributions`, a public endpoint needing no auth — so there is no
secret in CI and nothing left to leak. The trade-off is that the endpoint returns markup
rather than a contract; a parse yielding zero cells throws and the committed data stands.

**The CI workflow never ran the generators.** It called `next build` directly rather than the
package `build` script, so `sitemap.xml` was only ever refreshed when someone built locally.
Now `npm run build`, which also covers the new `llms.txt` generation.

**More minimal, more interactive.** Requested after the first review. Work rows and the project
index became disclosures (`Disclosure.tsx`): at rest the page is an index of names, roles, and
dates, with prose, location, stack, and capabilities one click away. Homepage `Writing` dropped
its excerpts, which now live only on `/blogs`. This resolves the two requests with one
mechanism rather than trading them off. `--space-section` was also reduced from a 8rem ceiling
to 5.5rem after the first render showed a dead band above `Work`.

**Portrait restored.** The type-only masthead dropped the avatar. It is back as a squared plate
with a hairline, placed opposite the display type (the name only fills the left half of the
measure), not as a rounded avatar with a gradient ring. `person.avatar` also appears as a field
in the specimen sheet and as `image` in the `Person` schema — the same fact, two encodings.
The URL is now stable; the old one appended `?v=<today>` and so missed cache every day.

**The learning progress ring was not restored.** It rendered `commits × 2%`, so 11 commits
displayed as "22%" of an invented denominator. The masthead states the commit count instead.

**Mobile:** the fixed mode toggle and the portrait both want the top-right corner, so the
masthead and specimen sheet top padding has a 4.75rem floor, and the `press m` hint is hidden
below `sm`.

## Out of scope

Blog reading experience, mermaid diagrams, the navigation dock, and the contributions graph are
untouched except where the palette or font change reaches them.
