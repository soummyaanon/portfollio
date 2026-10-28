'use client'

import { ContributionGraph } from '@/components/smoothui/ui/ContributionGraph'
import { SectionHead } from '@/components/document/SectionHead'
import { contributionYears, github } from '@/data/github'
import { useI18n } from '@/i18n/useLocale'

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

/** Every contribution in the committed data, across all its years. */
const ALL_TIME = YEARS.reduce((sum, year) => sum + (github.contributions[String(year)]?.total ?? 0), 0)

export default function GitHubContributions() {
  const { t } = useI18n()
  // The current year only: one calendar, no year picker.
  const year = YEARS[0]

  // No committed calendar data — most likely the build ran without a token. Say so quietly
  // rather than rendering an empty grid that looks like a year of no work.
  if (YEARS.length === 0 || year === undefined) {
    return (
      <section>
        <SectionHead index="02" label={t.sections.github} />
        <p className="measure-prose mt-[var(--space-group)] text-center text-fine text-muted-foreground">
          {t.github.unavailable}
        </p>
      </section>
    )
  }

  const entry = github.contributions[String(year)]

  const days = entry?.days ?? []

  return (
    <section>
      <SectionHead index="02" label={t.sections.github} />

      {/* Centred on the page axis like every other band, and capped at the reading column
          so a 53-week grid does not become the widest thing on the page. */}
      <div className="measure-column mt-[var(--space-group)]">
        {/* Copied because ContributionGraph's prop is a mutable array and the generated
            data is readonly. */}
        <ContributionGraph
          data={[...days]}
          year={year}
          showTooltips
          // en-US grouping in every language: Hindi's lakh grouping (1,23,456) would be a
          // second way of writing the same number on a page that already has one.
          footer={t.github.total(ALL_TIME.toLocaleString('en-US'), String(YEARS.at(-1)))}
        />
      </div>
    </section>
  )
}
