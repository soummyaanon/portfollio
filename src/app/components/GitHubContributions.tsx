'use client'

import { useEffect, useState } from 'react'
import { ContributionData, ContributionGraph } from '@/components/smoothui/ui/ContributionGraph'

interface GitHubContributionsProps {
  year?: number
  className?: string
}

interface GitHubContributionDay {
  date: string
  contributionCount: number
}

export default function GitHubContributions({ year = new Date().getFullYear(), className = '' }: GitHubContributionsProps) {
  const [contributionData, setContributionData] = useState<ContributionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchContributions = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = process.env.NEXT_PUBLIC_GITHUB_PAT

        // Try without authentication first to see if public access works
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        // GitHub GraphQL query
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

        const response = await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            query,
            variables: { username: 'soummyaanon', from, to },
          }),
        })

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`)
        }

        const data = await response.json()

        if (data.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
        }

        // Transform the data to match ContributionGraph format
        const transformedData: ContributionData[] = []
        const weeks = data.data.user.contributionsCollection.contributionCalendar.weeks

        weeks.forEach((week: { contributionDays: GitHubContributionDay[] }) => {
          week.contributionDays.forEach((day: GitHubContributionDay) => {
            const count = day.contributionCount
            // Calculate level based on contribution count (GitHub style)
            let level = 0
            if (count > 0) {
              if (count <= 1) level = 1
              else if (count <= 3) level = 2
              else if (count <= 6) level = 3
              else level = 4
            }

            transformedData.push({
              date: day.date,
              count: count,
              level: level,
            })
          })
        })

        setContributionData(transformedData)
      } catch (err) {
        console.error('Error fetching GitHub contributions:', err)
        setError(err instanceof Error ? err.message : 'Failed to load contributions')
      } finally {
        setLoading(false)
      }
    }

    fetchContributions()
  }, [year])

  if (loading) {
    return (
      <section className={`py-6 sm:py-12 ${className}`}>
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 text-center">
            GitHub Contributions
          </h2>
          <div className="bg-background rounded-lg border p-4">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="space-y-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex space-x-1">
                    {Array.from({ length: 53 }).map((_, j) => (
                      <div key={j} className="h-2.5 w-2.5 bg-muted rounded-sm"></div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className={`py-6 sm:py-12 ${className}`}>
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 text-center">
            GitHub Contributions
          </h2>
          <div className="bg-background rounded-lg border p-4">
            <div className="text-center text-muted-foreground">
              <p>Unable to load GitHub contributions</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      </section>
    )
  }


  return (
    <section className={`py-4 sm:py-8 ${className}`}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6">
          GitHub Contributions
        </h2>

        <div className="bg-background rounded-lg border p-4">
          <ContributionGraph
            data={contributionData}
            year={year}
            showLegend={true}
            showTooltips={true}
            className="w-full"
          />
        </div>

        <div className="text-center mt-4">
          <a
            href={`https://github.com/soummyaanon`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm"
          >
            View on GitHub →
          </a>
        </div>
      </div>
    </section>
  )
}
