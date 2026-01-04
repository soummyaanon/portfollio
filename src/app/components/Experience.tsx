'use client'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import experiencesData from '@/data/experiences.json'

// Types
interface Experience {
  readonly company: string
  readonly period: string
  readonly role: string
  readonly description: string
  readonly location?: string
  readonly skills?: readonly string[]
}

// Constants
const COMPANY_LOGO_MAP: Readonly<Record<string, string>> = {
  'Cardiovascular Institute of Orlando': 'cio.png',
  Wybit: 'cio.png',
  Cloudoplus: 'claudo plus.png',
  Chatsguru: 'chatguru.png',
  'Visvesvaraya Technological University': 'visvesvaraya-technological-university.png',
} as const

const LOADING_PLACEHOLDER_COUNT = 3
const EDUCATION_KEY = 'education'
const COMPANY_LOGOS_PATH = '/company-logos'

// Utility functions
function getCompanyLogo(company: string): string {
  return COMPANY_LOGO_MAP[company] ?? `${company.toLowerCase().replace(/\s+/g, '-')}.png`
}

function getCompanyInitials(company: string): string {
  return company
    .split(' ')
    .map((word) => word[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getCompanyLogoUrl(company: string): string {
  return `${COMPANY_LOGOS_PATH}/${getCompanyLogo(company)}`
}

function isCurrentRole(period: string): boolean {
  return /present/i.test(period)
}

/**
 * Custom hook for managing experiences data
 */
function useExperiences() {
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadExperiences = useCallback(() => {
    setIsLoading(true)
    setError(null)
    
    try {
      setExperiences(experiencesData as Experience[])
    } catch (err) {
      console.error('Error loading experiences:', err)
      setExperiences([])
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadExperiences()
  }, [loadExperiences])

  const retry = useCallback(() => {
    loadExperiences()
  }, [loadExperiences])

  return { experiences, isLoading, error, retry }
}

/**
 * Custom hook for managing accordion-style open items
 */
function useAccordion(initialOpen = new Set<string>()) {
  const [openItems, setOpenItems] = useState<Set<string>>(initialOpen)

  const handleToggle = useCallback(
    (itemKey: string) => (open: boolean) => {
      setOpenItems((previous) => {
        const next = new Set<string>()
        if (open) {
          next.add(itemKey)
        }
        return next
      })
    },
    []
  )

  const reset = useCallback(() => {
    setOpenItems(new Set())
  }, [])

  return { openItems, handleToggle, reset }
}

/**
 * Experience section main component
 */
function Experience() {
  const { experiences, isLoading, error, retry } = useExperiences()
  const { openItems, handleToggle, reset } = useAccordion()

  const handleRetry = useCallback(() => {
    reset()
    retry()
  }, [reset, retry])

  const hasExperiences = experiences.length > 0

  return (
    <section 
      id="experience" 
      className="py-4 sm:py-8"
      aria-labelledby="experience-heading"
    >
      <div className="max-w-4xl mx-auto">
        <h2 
          id="experience-heading"
          className="text-base sm:text-lg font-semibold text-foreground mb-4 sm:mb-6"
        >
          Experience
        </h2>

        {isLoading && <ExperienceSkeletonList />}

        {!isLoading && error && <ExperienceErrorState onRetry={handleRetry} />}

        {!isLoading && !error && hasExperiences && (
          <>
            <ExperienceList
              experiences={experiences}
              openItems={openItems}
              onOpenChange={handleToggle}
            />
            <EducationSection
              isOpen={openItems.has(EDUCATION_KEY)}
              onOpenChange={handleToggle(EDUCATION_KEY)}
            />
          </>
        )}

        {!isLoading && !error && !hasExperiences && <ExperienceEmptyState />}
      </div>
    </section>
  )
}

// Sub-component prop types
interface ExperienceListProps {
  readonly experiences: readonly Experience[]
  readonly openItems: ReadonlySet<string>
  readonly onOpenChange: (itemKey: string) => (open: boolean) => void
}

interface ExperienceItemProps {
  readonly experience: Experience
  readonly isOpen: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly isLast: boolean
}

interface SkillBadgeProps {
  readonly skill: string
  readonly index: number
}

/**
 * Individual skill badge with staggered animation
 */
const SkillBadge = memo(function SkillBadge({ skill, index }: SkillBadgeProps) {
  return (
    <Badge
      variant="outline"
      className="text-[10px] animate-in slide-in-from-left-2 fade-in duration-300 ease-in-out"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {skill}
    </Badge>
  )
})

/**
 * Single experience item with collapsible details
 */
const ExperienceItem = memo(function ExperienceItem({ 
  experience, 
  isOpen, 
  onOpenChange,
  isLast
}: ExperienceItemProps) {
  const chevronClassName = useMemo(
    () =>
      `w-4 h-4 text-muted-foreground transition-all duration-200 ease-out opacity-0 group-hover:opacity-100 flex-shrink-0 transform ${
        isOpen ? 'rotate-180 opacity-100' : ''
      }`,
    [isOpen]
  )

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange} className="relative group/item">
      {!isLast && (
        <span
          className="absolute left-6 top-7 -bottom-9 w-0.5 -translate-x-1/2 bg-zinc-200 shadow-[0_0_8px_rgba(16,185,129,0.2)] dark:bg-zinc-800 sm:left-7 sm:top-8 sm:-bottom-12"
          aria-hidden="true"
        />
      )}
      <div>
        <CollapsibleTrigger 
          className="w-full text-left group"
          aria-expanded={isOpen}
        >
          <div className="flex items-start gap-3 sm:gap-4 p-2 rounded-lg transition-all duration-200">
            <div className="relative flex-shrink-0 pt-1 z-10">
              {isCurrentRole(experience.period) && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex h-1.5 w-1.5 z-20 pointer-events-none">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full"
                    style={{
                      background: 'rgba(57,255,20,0.95)', // a hint more opaque neon
                      boxShadow: '0 0 8px 2px #39ff14, 0 0 14px 4px #39ff1477', // larger, stronger outer glow
                      opacity: 0.92,
                    }}
                    aria-hidden="true"
                  />
                  <span
                    className="relative inline-flex h-1.5 w-1.5 rounded-full"
                    style={{
                      background: '#39ff14',
                      boxShadow: '0 0 5px 2px #39ff14, 0 0 10px 5px #39ff1499',
                      border: '1.5px solid #191919', // a touch thicker, a bit darker
                    }}
                    aria-hidden="true"
                  />
                </span>
              )}
              <Avatar className="relative w-8 h-8 sm:w-10 sm:h-10 ring-2 ring-border bg-background z-10">
                <AvatarImage
                  src={getCompanyLogoUrl(experience.company)}
                  alt=""
                  className="object-cover h-full w-full"
                />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[10px] sm:text-xs">
                  {getCompanyInitials(experience.company)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground">
                  {experience.company}
                </h3>
                <ChevronDown
                  className={chevronClassName}
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {experience.role} · {experience.period}
              </p>
              {experience.location && (
                <p className="text-[11px] text-muted-foreground">{experience.location}</p>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden">
          <div className="animate-in slide-in-from-top-2 fade-in duration-300 ease-in-out mt-3 sm:mt-4 space-y-2 sm:space-y-3 pl-11 sm:pl-14">
            {experience.description && (
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                {experience.description}
              </p>
            )}
            {experience.skills && experience.skills.length > 0 && (
              <div className="flex flex-wrap gap-2" role="list" aria-label="Skills">
                {experience.skills.map((skill, index) => (
                  <SkillBadge key={skill} skill={skill} index={index} />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
})

/**
 * List of experience items
 */
const ExperienceList = memo(function ExperienceList({ 
  experiences, 
  openItems, 
  onOpenChange 
}: ExperienceListProps) {
  return (
    <div className="space-y-2 sm:space-y-4" role="list">
      {experiences.map((experience, index) => (
        <ExperienceItem
          key={experience.company}
          experience={experience}
          isOpen={openItems.has(experience.company)}
          onOpenChange={onOpenChange(experience.company)}
          isLast={index === experiences.length - 1}
        />
      ))}
    </div>
  )
})

// Education constants
const EDUCATION_DATA = {
  university: 'Visvesvaraya Technological University',
  degree: 'Master of Computer Applications - MCA, Computer Science',
  period: 'Dec 2022 - Oct 2024',
  description:
    'Completed Master of Computer Applications with a focus on Computer Science, gaining comprehensive knowledge in software development, algorithms, data structures, and modern programming paradigms.',
  skills: ['Computer Science', 'Software Development', 'Algorithms', 'Data Structures', 'Programming'],
  linkedInUrl: 'https://www.linkedin.com/in/soumyapanda12/',
} as const

interface EducationSectionProps {
  readonly isOpen: boolean
  readonly onOpenChange: (open: boolean) => void
}

/**
 * Education section with collapsible details
 */
const EducationSection = memo(function EducationSection({ isOpen, onOpenChange }: EducationSectionProps) {
  const chevronClassName = useMemo(
    () =>
      `w-4 h-4 text-muted-foreground transition-all duration-200 ease-out opacity-0 group-hover:opacity-100 flex-shrink-0 transform ${
        isOpen ? 'rotate-180 opacity-100' : ''
      }`,
    [isOpen]
  )

  return (
    <>
      <h3 
        id="education-heading"
        className="text-xs sm:text-sm font-semibold text-foreground mb-4 sm:mb-6 mt-8 sm:mt-12"
      >
        Education
      </h3>
      <div className="space-y-2 sm:space-y-4" role="list" aria-labelledby="education-heading">
        <Collapsible open={isOpen} onOpenChange={onOpenChange}>
          <div>
            <CollapsibleTrigger 
              className="w-full text-left group"
              aria-expanded={isOpen}
            >
              <div className="flex items-start gap-3 sm:gap-4 p-2 rounded-lg transition-all duration-200">
                <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 ring-2 ring-border bg-background">
                  <AvatarImage
                    src={getCompanyLogoUrl(EDUCATION_DATA.university)}
                    alt=""
                    className="object-contain p-1"
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[10px] sm:text-xs">
                    VTU
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                      <a
                        href={EDUCATION_DATA.linkedInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors duration-200 focus:outline-none focus-visible:underline"
                      >
                        {EDUCATION_DATA.university}
                      </a>
                    </h4>
                    <ChevronDown
                      className={chevronClassName}
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {EDUCATION_DATA.degree}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{EDUCATION_DATA.period}</p>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden">
              <div className="animate-in slide-in-from-top-2 fade-in duration-300 ease-in-out mt-3 sm:mt-4 space-y-2 sm:space-y-3 pl-11 sm:pl-14">
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                  {EDUCATION_DATA.description}
                </p>
                <div className="flex flex-wrap gap-2" role="list" aria-label="Education skills">
                  {EDUCATION_DATA.skills.map((skill, index) => (
                    <SkillBadge key={skill} skill={skill} index={index} />
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </>
  )
})

/**
 * Skeleton loading state for experiences
 */
const ExperienceSkeletonList = memo(function ExperienceSkeletonList() {
  return (
    <div 
      className="space-y-3 sm:space-y-4" 
      role="status" 
      aria-label="Loading experiences"
    >
      {Array.from({ length: LOADING_PLACEHOLDER_COUNT }).map((_, index) => (
        <div key={index} className="animate-pulse space-y-2 p-2 rounded-lg">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 sm:h-4 bg-muted w-3/4 rounded" />
              <div className="h-2 sm:h-3 bg-muted w-1/2 rounded" />
              <div className="h-2 sm:h-3 bg-muted w-full rounded" />
              <div className="h-2 sm:h-3 bg-muted w-5/6 rounded" />
            </div>
            <div className="w-4 h-4 bg-muted rounded" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading experience data...</span>
    </div>
  )
})

interface ExperienceErrorStateProps {
  readonly onRetry: () => void
}

/**
 * Error state component with retry functionality
 */
const ExperienceErrorState = memo(function ExperienceErrorState({ onRetry }: ExperienceErrorStateProps) {
  return (
    <div 
      className="text-center py-6 sm:py-8" 
      role="alert"
      aria-live="polite"
    >
      <p className="text-xs sm:text-sm text-muted-foreground">
        Failed to load experience data
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-xs sm:text-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Try Again
      </button>
    </div>
  )
})

/**
 * Empty state when no experiences are available
 */
const ExperienceEmptyState = memo(function ExperienceEmptyState() {
  return (
    <div 
      className="border border-dashed border-muted rounded-lg px-4 py-6 text-center text-xs text-muted-foreground"
      role="status"
    >
      No professional experience entries are available right now.
    </div>
  )
})

export default memo(Experience)
