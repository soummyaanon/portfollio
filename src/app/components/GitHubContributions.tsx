'use client'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { ContributionData, ContributionGraph } from '@/components/smoothui/ui/ContributionGraph'

// Constants
const CURRENT_YEAR = new Date().getFullYear()
const YEARS_TO_SHOW = 3

// Types
interface GitHubContributionsProps {
  readonly defaultYear?: number
  readonly className?: string
}

interface GitHubContributionDay {
  readonly date: string
  readonly contributionCount: number
}

interface GitHubWeek {
  readonly contributionDays: readonly GitHubContributionDay[]
}

interface ContributionState {
  readonly data: ContributionData[]
  readonly total: number
  readonly loading: boolean
  readonly error: string | null
}

// Constants
const GITHUB_USERNAME = 'soummyaanon'
const GITHUB_API_URL = 'https://api.github.com/graphql'
const SKELETON_ROWS = 7
const SKELETON_COLS = 53

// Contribution level thresholds
const CONTRIBUTION_LEVELS = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 3,
  HIGH: 6,
} as const

/**
 * Calculates the contribution level based on count (GitHub-style)
 */
function getContributionLevel(count: number): number {
  if (count === 0) return 0
  if (count <= CONTRIBUTION_LEVELS.LOW) return 1
  if (count <= CONTRIBUTION_LEVELS.MEDIUM) return 2
  if (count <= CONTRIBUTION_LEVELS.HIGH) return 3
  return 4
}

/**
 * Transforms raw GitHub API data into ContributionData format
 */
function transformContributionData(weeks: readonly GitHubWeek[]): {
  data: ContributionData[]
  total: number
} {
  const data: ContributionData[] = []
  let total = 0

  for (const week of weeks) {
    for (const day of week.contributionDays) {
      const count = day.contributionCount
      total += count
      data.push({
        date: day.date,
        count,
        level: getContributionLevel(count),
      })
    }
  }

  return { data, total }
}

/**
 * Custom hook for fetching GitHub contributions
 */
function useGitHubContributions(year: number) {
  const [state, setState] = useState<ContributionState>({
    data: [],
    total: 0,
    loading: true,
    error: null,
  })

  const fetchContributions = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      const token = process.env.NEXT_PUBLIC_GITHUB_PAT
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const query = `
        query($username: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $username) {
            contributionsCollection(from: $from, to: $to) {
              contributionCalendar {
                weeks {
                  contributionDays {
                    date
                    contributionCount
                  }
                }
              }
            }
          }
        }
      `

      const from = new Date(year, 0, 1).toISOString()
      const to = new Date(year, 11, 31, 23, 59, 59).toISOString()

      const response = await fetch(GITHUB_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          variables: { username: GITHUB_USERNAME, from, to },
        }),
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const responseData = await response.json()

      if (responseData.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(responseData.errors)}`)
      }

      const weeks = responseData.data.user.contributionsCollection.contributionCalendar.weeks
      const { data, total } = transformContributionData(weeks)

      setState({
        data,
        total,
        loading: false,
        error: null,
      })
    } catch (err) {
      console.error('Error fetching GitHub contributions:', err)
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load contributions',
      }))
    }
  }, [year])

  useEffect(() => {
    fetchContributions()
  }, [fetchContributions])

  return state
}

/**
 * Loading skeleton component
 */
const ContributionsSkeleton = memo(function ContributionsSkeleton() {
  return (
    <div 
      className="bg-background rounded-lg border p-4"
      role="status"
      aria-label="Loading contributions"
    >
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-muted rounded w-1/4" />
        <div className="space-y-2">
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <div key={i} className="flex space-x-1">
              {Array.from({ length: SKELETON_COLS }).map((_, j) => (
                <div key={j} className="h-2.5 w-2.5 bg-muted rounded-sm" />
              ))}
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading contribution data...</span>
    </div>
  )
})

/**
 * Error state component
 */
interface ErrorStateProps {
  readonly error: string
}

const ContributionsError = memo(function ContributionsError({ error }: ErrorStateProps) {
  return (
    <div 
      className="bg-background rounded-lg border p-4"
      role="alert"
      aria-live="polite"
    >
      <div className="text-center text-muted-foreground">
        <p>Unable to load GitHub contributions</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    </div>
  )
})

/**
 * GitHub Contributions component displaying contribution graph
 */
function GitHubContributions({
  defaultYear = CURRENT_YEAR,
  className = ''
}: GitHubContributionsProps) {
  const [selectedYear, setSelectedYear] = useState(defaultYear)
  const { data, total, loading, error } = useGitHubContributions(selectedYear)

  const availableYears = useMemo(
    () => Array.from({ length: YEARS_TO_SHOW }, (_, i) => CURRENT_YEAR - i),
    []
  )

  const handleYearChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(Number(e.target.value))
  }, [])

  const sectionTitle = 'Work activity'

  if (loading) {
    return (
      <section 
        className={`py-6 sm:py-12 ${className}`}
        aria-labelledby="contributions-heading-loading"
      >
        <div className="max-w-4xl mx-auto px-4">
          <h2 
            id="contributions-heading-loading"
            className="text-xl sm:text-2xl font-bold text-foreground mb-4 text-center"
          >
            {sectionTitle}
          </h2>
          <ContributionsSkeleton />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section 
        className={`py-6 sm:py-12 ${className}`}
        aria-labelledby="contributions-heading-error"
      >
        <div className="max-w-4xl mx-auto px-4">
          <h2 
            id="contributions-heading-error"
            className="text-xl sm:text-2xl font-bold text-foreground mb-4 text-center"
          >
            {sectionTitle}
          </h2>
          <ContributionsError error={error} />
        </div>
      </section>
    )
  }

  return (
    <section
      className={`py-4 sm:py-8 ${className}`}
      aria-labelledby="contributions-heading"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2
            id="contributions-heading"
            className="text-lg sm:text-xl font-bold text-foreground"
          >
            {sectionTitle}
          </h2>
          <select
            value={selectedYear}
            onChange={handleYearChange}
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Select year"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-background rounded-lg border p-4">
          <ContributionGraph
            data={data}
            year={selectedYear}
            showLegend
            showTooltips
            className="w-full"
          />

          <p className="text-center mt-3 text-sm text-muted-foreground">
            {total.toLocaleString()} contributions in {selectedYear}
          </p>
        </div>
      </div>
    </section>
  )
}

export default memo(GitHubContributions)
