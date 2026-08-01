'use client'

import { useState } from 'react'

import { ContributionGraph } from '@/components/smoothui/ui/ContributionGraph'
import { SectionHead } from '@/components/document/SectionHead'
import { contributionYears, github } from '@/data/github'

/**
 * Renders the contribution calendar from data resolved at build time.
 *
 * This component used to fetch GitHub's GraphQL API from the browser, authenticated with
 * `process.env.NEXT_PUBLIC_GITHUB_PAT` — which Next inlines into the client bundle, meaning
 * the token shipped to every visitor. The fetch, the token, the loading skeleton, and the
 * error state are all gone: `scripts/generate-github.ts` resolves the calendar at build time
 * with a server-side token, so the grid is in the static HTML and no credential exists here
 * to leak.
 */

const YEARS = contributionYears

export default function GitHubContributions() {
  const [year, setYear] = useState<number | undefined>(YEARS[0])

  // No committed calendar data — most likely the build ran without a token. Say so quietly
  // rather than rendering an empty grid that looks like a year of no work.
  if (YEARS.length === 0 || year === undefined) {
    return (
      <section>
        <SectionHead label="Contributions" />
        <p className="measure-prose mt-[var(--space-group)] text-center text-fine text-muted-foreground">
          Calendar data is generated at build time and is not available for this build.
        </p>
      </section>
    )
  }

  const entry = github.contributions[String(year)]

  const days = entry?.days ?? []

  return (
    <section>
      <SectionHead
        label="Contributions"
        note={entry ? `${entry.total.toLocaleString()} in ${year}` : undefined}
      />

      {/* Year selection is the only interactive part, and it is text with a rule under the
          active year — not a row of filled pills. */}
      <div className="mt-[var(--space-group)] flex flex-wrap justify-center gap-x-4 gap-y-1">
        {YEARS.map((option) => {
          const isActive = option === year

          return (
            <button
              key={option}
              type="button"
              onClick={() => setYear(option)}
              aria-pressed={isActive}
              className={`border-b pb-0.5 text-caption tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${
                isActive
                  ? 'border-signal text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>

      {/* Centred on the page axis like every other band, and capped at the reading column
          so a 53-week grid does not become the widest thing on the page. */}
      <div className="measure-column mt-[var(--space-group)]">
        {/* Copied because ContributionGraph's prop is a mutable array and the generated
            data is readonly. */}
        <ContributionGraph data={[...days]} year={year} showLegend showTooltips />
      </div>
    </section>
  )
}
