'use client'

import { memo, useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { HyperText } from '@/components/ui/hyper-text'
import { GolangDark } from '@/components/ui/svgs/golangDark'
import { Golang } from '@/components/ui/svgs/golang'
import { useTheme } from 'next-themes'

// Constants
const GITHUB_USERNAME = 'soummyaanon'
const LEARNING_REPO = 'learning-Go'
const GITHUB_API_BASE = 'https://api.github.com'
const COMMITS_PER_PAGE = 100
const MAX_PAGES = 10

const PROFILE_IMAGE = {
  width: 96,
  height: 96,
  alt: 'Soumyaranjan Panda',
} as const

// Progress calculation: 2% per commit, max 100%
const PROGRESS_PER_COMMIT = 2
const MAX_PROGRESS = 100

// Types
interface CommitFetchState {
  readonly count: number | null
  readonly loading: boolean
  readonly error: boolean
}

/**
 * Custom hook for fetching commit count from GitHub
 */
function useCommitCount(owner: string, repo: string) {
  const [state, setState] = useState<CommitFetchState>({
    count: null,
    loading: true,
    error: false,
  })

  const fetchCommitCount = useCallback(async () => {
    try {
      setState({ count: null, loading: true, error: false })
      
      let totalCommits = 0
      let page = 1
      let hasMore = true

      while (hasMore) {
        const response = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=${COMMITS_PER_PAGE}&page=${page}`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'portfolio-app',
            },
          }
        )

        if (!response.ok) {
          if (response.status === 404 || response.status === 403) {
            console.warn(`Repository access issue: ${response.status}`)
            break
          }
          throw new Error(`GitHub API error: ${response.status}`)
        }

        const commits = await response.json()
        const pageCommitCount = Array.isArray(commits) ? commits.length : 0
        totalCommits += pageCommitCount

        const linkHeader = response.headers.get('link')
        hasMore = Boolean(linkHeader?.includes('rel="next"')) && page < MAX_PAGES
        page++
      }

      setState({ count: totalCommits, loading: false, error: false })
    } catch (error) {
      console.error('Error fetching commit count:', error)
      setState({ count: 0, loading: false, error: true })
    }
  }, [owner, repo])

  useEffect(() => {
    fetchCommitCount()
  }, [fetchCommitCount])

  return state
}

/**
 * Progress circle SVG component
 */
interface ProgressCircleProps {
  readonly progress: number
  readonly loading: boolean
}

const ProgressCircle = memo(function ProgressCircle({ progress, loading }: ProgressCircleProps) {
  if (loading) {
    return (
      <div 
        className="w-4 h-4 border-2 border-green-500/20 border-t-green-500 rounded-full animate-spin"
        role="status"
        aria-label="Loading progress"
      />
    )
  }

  return (
    <svg 
      className="w-4 h-4 transform -rotate-90" 
      viewBox="0 0 36 36"
      role="img"
      aria-label={`${Math.round(progress)}% complete`}
    >
      {/* Background circle */}
      <path
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.2"
        className="text-green-500"
      />
      {/* Progress circle */}
      <path
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${progress}, 100`}
        className="text-green-500 transition-all duration-1000 ease-out"
      />
    </svg>
  )
})

/**
 * Learning indicator component
 */
interface LearningIndicatorProps {
  readonly progress: number
  readonly loading: boolean
  readonly isDark: boolean
  readonly mounted: boolean
}

const LearningIndicator = memo(function LearningIndicator({
  progress,
  loading,
  isDark,
  mounted,
}: LearningIndicatorProps) {
  const GolangIcon = !mounted || !isDark ? GolangDark : Golang

  return (
    <a
      href={`https://github.com/${GITHUB_USERNAME}/${LEARNING_REPO}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-muted-foreground/80 mt-3 hover:text-foreground transition-colors cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
      aria-label={`Currently learning Go - ${Math.round(progress)}% progress (opens GitHub repository)`}
    >
      <div className="relative w-4 h-4">
        <ProgressCircle progress={progress} loading={loading} />
      </div>
      <span className="text-xs font-medium text-green-500" aria-hidden="true">
        {loading ? '...' : `${Math.round(progress)}%`}
      </span>
      <span>Currently learning:</span>
      <GolangIcon 
        className="w-6 h-6 group-hover:scale-110 transition-transform" 
        aria-hidden="true"
      />
    </a>
  )
})

/**
 * Profile image with gradient border
 */
const ProfileImage = memo(function ProfileImage() {
  const imageUrl = `https://github.com/${GITHUB_USERNAME}.png?v=${new Date().toISOString().split('T')[0]}`

  return (
    <div className="flex-shrink-0">
      <div className="relative rounded-full p-[2px] bg-gradient-to-br from-gray-200 via-white to-gray-300 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 shadow-lg">
        <Image
          src={imageUrl}
          alt={PROFILE_IMAGE.alt}
          width={PROFILE_IMAGE.width}
          height={PROFILE_IMAGE.height}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-background"
          priority
        />
      </div>
    </div>
  )
})

/**
 * Hero section component
 */
function Hero() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { count: commitCount, loading } = useCommitCount(GITHUB_USERNAME, LEARNING_REPO)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate learning progress
  const progressPercentage = commitCount !== null 
    ? Math.min(commitCount * PROGRESS_PER_COMMIT, MAX_PROGRESS) 
    : 0
  
  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <section 
      className="py-6 sm:py-12"
      aria-labelledby="hero-heading"
    >
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-row items-center justify-center sm:justify-between gap-4 sm:gap-6">
          <div className="flex-1 text-left">
            <h1 
              id="hero-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3"
            >
              Hi, I&apos;m{' '}
              <HyperText className="text-primary">Soumyaranjan</HyperText>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-2">
              A Software Engineer.
            </p>

            <LearningIndicator
              progress={progressPercentage}
              loading={loading}
              isDark={isDark}
              mounted={mounted}
            />
          </div>
          <ProfileImage />
        </div>
      </div>
    </section>
  )
}

export default memo(Hero)
