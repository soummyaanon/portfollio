'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { HyperText } from '@/components/ui/hyper-text'
import { GolangDark } from '@/components/ui/svgs/golangDark'
import { Golang } from '@/components/ui/svgs/golang'
import { ShineBorder } from '@/components/ui/shine-border'
import { useTheme } from 'next-themes'

export default function Hero() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [commitCount, setCommitCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchCommitCount = async () => {
      try {
        setLoading(true)
        // Fetch directly from GitHub API since we're using static export
        const owner = 'soummyaanon'
        const repo = 'learning-Go'
        
        let totalCommits = 0
        let page = 1
        const perPage = 100
        let hasMore = true

        // Fetch all commits by paginating through pages
        while (hasMore) {
          const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}&page=${page}`,
            {
              headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'portfolio-app',
              },
            }
          )

          if (!response.ok) {
            if (response.status === 404) {
              console.warn('Repository not found')
              break
            }
            if (response.status === 403) {
              console.warn('Rate limited or access denied')
              break
            }
            throw new Error(`GitHub API error: ${response.status}`)
          }

          const commits = await response.json()
          const pageCommitCount = Array.isArray(commits) ? commits.length : 0
          totalCommits += pageCommitCount

          // Check if there are more pages using Link header
          const linkHeader = response.headers.get('link')
          if (linkHeader && linkHeader.includes('rel="next"')) {
            page++
          } else {
            hasMore = false
          }

          // Safety limit: stop after 10 pages (1000 commits) to avoid infinite loops
          if (page > 10) {
            hasMore = false
          }
        }

        setCommitCount(totalCommits)
      } catch (error) {
        console.error('Error fetching commit count:', error)
        // Set to 0 on error so progress shows 0%
        setCommitCount(0)
      } finally {
        setLoading(false)
      }
    }

    fetchCommitCount()
  }, [])

  // Calculate learning progress based on commits (2% per commit, max 100%)
  // Each commit = 2% progress, so 50 commits = 100%
  const progressPercentage = commitCount !== null 
    ? Math.min(commitCount * 2, 100) 
    : 0
  const progressValue = progressPercentage
  
  // Use resolvedTheme to avoid hydration mismatch
  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <section className="py-6 sm:py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-row items-center justify-center sm:justify-between gap-4 sm:gap-6">
          <div className="flex-1 text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3">
              Hi, I&apos;m <HyperText className="text-primary">Soumyaranjan</HyperText>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-2">
              A Software Engineer.
            </p>

            {/* Learning Indicator */}
            <a
              href="https://github.com/soummyaanon/learning-Go"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground/80 mt-3 hover:text-foreground transition-colors cursor-pointer group"
            >
              {/* Progress Circle Loader */}
              <div className="relative w-4 h-4">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 transform -rotate-90" viewBox="0 0 36 36">
                    {/* Background circle */}
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeOpacity="0.2"
                      className="text-green-500"
                    />
                    {/* Progress circle */}
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={`${progressValue}, 100`}
                      className="text-green-500 transition-all duration-1000 ease-out"
                    />
                  </svg>
                )}
              </div>
              <span className="text-xs font-medium text-green-500">
                {loading ? '...' : `${Math.round(progressPercentage)}%`}
              </span>
              <span>Currently learning:</span>
              {!mounted ? (
                <GolangDark className="w-6 h-6 group-hover:scale-110 transition-transform" />
              ) : isDark ? (
                <Golang className="w-6 h-6 group-hover:scale-110 transition-transform" />
              ) : (
                <GolangDark className="w-6 h-6 group-hover:scale-110 transition-transform" />
              )}
            </a>
          </div>
          <div className="flex-shrink-0 relative overflow-hidden rounded-full">
            <Image
              src={`https://github.com/soummyaanon.png?v=${new Date().toISOString().split('T')[0]}`}
              alt="Soumyaranjan Panda"
              width={96}
              height={96}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-lg"
              priority
            />
            <ShineBorder
              borderWidth={3}
              duration={3}
              shineColor={["#64748b", "#475569", "#334155"]}
              className="rounded-full"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
