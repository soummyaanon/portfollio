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
const IST_TIME_ZONE = 'Asia/Kolkata'
const IST_LOCALE = 'en-IN'

const PROFILE_IMAGE = {
  width: 80,
  height: 80,
  alt: 'Soumyaranjan Panda',
} as const

// Progress calculation: 2% per commit, max 100%
const PROGRESS_PER_COMMIT = 2
const MAX_PROGRESS = 100

// HyperText configuration for highlighted words
const HYPER_TEXT_CONFIG = {
  duration: 600,
  baseDelay: 200,
  className: 'inline text-xs sm:text-sm font-thin',
} as const

const HIGHLIGHT_WORDS = [
  { text: 'AI-driven tools', delay: 0 },
  { text: 'healthcare AI solutions', delay: HYPER_TEXT_CONFIG.baseDelay },
  { text: 'deep-space science', delay: HYPER_TEXT_CONFIG.baseDelay * 2 },
  { text: 'political developments', delay: HYPER_TEXT_CONFIG.baseDelay * 3 },
] as const

// Types
interface CommitFetchState {
  readonly count: number | null
  readonly loading: boolean
  readonly error: boolean
}

function useIstClock() {
  const [time, setTime] = useState<string>('')

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat(IST_LOCALE, {
      timeZone: IST_TIME_ZONE,
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

    const updateTime = () => setTime(formatter.format(new Date()))
    updateTime()

    const intervalId = window.setInterval(updateTime, 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  return time
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
        className="w-3 h-3 border-[1.5px] border-green-500/15 border-t-green-500/70 rounded-full animate-spin"
        role="status"
        aria-label="Loading progress"
      />
    )
  }

  return (
    <svg 
      className="w-3 h-3 transform -rotate-90" 
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
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/80 mt-2.5 px-2.5 py-1.5 h-8 rounded-full bg-white/40 dark:bg-slate-900/35 backdrop-blur-sm border border-white/40 dark:border-slate-800/60 shadow-sm hover:text-foreground transition-colors cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 w-fit"
      aria-label={`Currently learning Go - ${Math.round(progress)}% progress (opens GitHub repository)`}
    >
      <div className="relative w-4 h-4">
        <ProgressCircle progress={progress} loading={loading} />
      </div>
      <span className="text-[10px] font-semibold text-foreground" aria-hidden="true">
        {loading ? '...' : `${Math.round(progress)}%`}
      </span>
      <span className="text-[10px] text-foreground leading-none">Currently learning:</span>
      <GolangIcon 
        className="w-4 h-4 text-muted-foreground group-hover:scale-105 transition-transform" 
        aria-hidden="true"
      />
    </a>
  )
})


interface HighlightedWordProps {
  readonly children: string
  readonly delay?: number
}

const HighlightedWord = memo(function HighlightedWord({
  children,
  delay = 0,
}: HighlightedWordProps) {
  return (
    <HyperText
      className={HYPER_TEXT_CONFIG.className}
      duration={HYPER_TEXT_CONFIG.duration}
      startOnView
      delay={delay}
    >
      {children}
    </HyperText>
  )
})

/**
 * Profile image with gradient border
 */
const ProfileImage = memo(function ProfileImage() {
  const imageUrl = `https://github.com/${GITHUB_USERNAME}.png?v=${new Date().toISOString().split('T')[0]}`

  return (
    <div className="flex-shrink-0">
      <div className="relative rounded-xl p-[2px] bg-gradient-to-br from-gray-200 via-white to-gray-300 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 shadow-lg">
        <Image
          src={imageUrl}
          alt={PROFILE_IMAGE.alt}
          width={PROFILE_IMAGE.width}
          height={PROFILE_IMAGE.height}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-background object-cover"
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
  const istTime = useIstClock()

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
        <div className="flex flex-col items-start gap-4 sm:gap-5 text-left">
          <ProfileImage />
          <div className="w-full">
            <h1 
              id="hero-heading"
              className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground mb-2 sm:mb-3"
            >
              Hi, I&apos;m{' '}
              <HyperText className="text-primary font-semibold">Soumyaranjan</HyperText>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mb-3">
              A Software Engineer.
            </p>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              I build{' '}
              <HighlightedWord delay={HIGHLIGHT_WORDS[0].delay}>
                {HIGHLIGHT_WORDS[0].text}
              </HighlightedWord>{' '}
              that reduce human workload, currently focusing on{' '}
              <HighlightedWord delay={HIGHLIGHT_WORDS[1].delay}>
                {HIGHLIGHT_WORDS[1].text}
              </HighlightedWord>{' '}
              that streamline physicians&apos; workflows. I also enjoy{' '}
              <HighlightedWord delay={HIGHLIGHT_WORDS[2].delay}>
                {HIGHLIGHT_WORDS[2].text}
              </HighlightedWord>{' '}
              and following{' '}
              <HighlightedWord delay={HIGHLIGHT_WORDS[3].delay}>
                {HIGHLIGHT_WORDS[3].text}
              </HighlightedWord>
              .
            </p>

            <div className="flex flex-col items-center sm:items-start gap-2">
              <LearningIndicator
                progress={progressPercentage}
                loading={loading}
                isDark={isDark}
                mounted={mounted}
              />
              <a
                href="https://arthionai.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/80 px-2.5 py-1.5 h-8 rounded-full bg-white/40 dark:bg-slate-900/35 backdrop-blur-sm border border-white/40 dark:border-slate-800/60 shadow-sm hover:text-foreground transition-colors cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 w-fit"
                aria-label="Building Arthion AI - opens project website"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                <span className="text-[10px] text-foreground leading-none">Building:</span>
                <span className="text-[10px] font-semibold text-foreground group-hover:underline">Arthion AI</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default memo(Hero)
