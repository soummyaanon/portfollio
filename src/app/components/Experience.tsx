'use client'

import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'

interface Experience {
  company: string
  period: string
  role: string
  description: string
  location?: string
  skills?: string[]
}

const companyLogoMap: Record<string, string> = {
  'Cardiovascular Institute of Orlando': 'cio.png',
  Cloudoplus: 'claudo plus.png',
  Chatsguru: 'chatguru.png',
  'Visvesvaraya Technological University': 'visvesvaraya-technological-university.png'
}

const LOADING_PLACEHOLDER_COUNT = 3
const EDUCATION_KEY = 'education'

function getCompanyLogo(company: string): string {
  return companyLogoMap[company] || `${company.toLowerCase().replace(/\s+/g, '-')}.png`
}

function getCompanyInitials(company: string): string {
  return company
    .split(' ')
    .map((word) => word[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function Experience() {
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    const controller = new AbortController()

    async function loadExperiences() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/experiences', { signal: controller.signal })
        if (!response.ok) {
          throw new Error('Failed to fetch experiences')
        }

        const data: Experience[] = await response.json()

        if (!controller.signal.aborted) {
          setExperiences(data)
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return
        }

        console.error('Error fetching experiences:', err)
        setExperiences([])
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadExperiences()

    return () => controller.abort()
  }, [refreshIndex])

  const handleRetry = () => {
    setOpenItems(new Set())
    setRefreshIndex((count) => count + 1)
  }

  const handleItemToggle = (itemKey: string) => (open: boolean) => {
    setOpenItems((previous) => {
      const next = new Set(previous)
      if (open) {
        next.add(itemKey)
      } else {
        next.delete(itemKey)
      }
      return next
    })
  }

  const hasExperiences = experiences.length > 0

  return (
    <section id="experience" className="py-4 sm:py-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6">Experience</h2>

        {isLoading && <ExperienceSkeletonList />}

        {!isLoading && error && <ExperienceErrorState onRetry={handleRetry} />}

        {!isLoading && !error && hasExperiences && (
          <>
            <ExperienceList
              experiences={experiences}
              openItems={openItems}
              onOpenChange={handleItemToggle}
            />
            <EducationSection
              isOpen={openItems.has(EDUCATION_KEY)}
              onOpenChange={handleItemToggle(EDUCATION_KEY)}
            />
          </>
        )}

        {!isLoading && !error && !hasExperiences && <ExperienceEmptyState />}
      </div>
    </section>
  )
}

type ExperienceListProps = {
  experiences: Experience[]
  openItems: Set<string>
  onOpenChange: (itemKey: string) => (open: boolean) => void
}

function ExperienceList({ experiences, openItems, onOpenChange }: ExperienceListProps) {
  return (
    <div className="space-y-2 sm:space-y-4">
      {experiences.map((experience) => {
        const itemKey = experience.company

        return (
          <Collapsible
            key={itemKey}
            open={openItems.has(itemKey)}
            onOpenChange={onOpenChange(itemKey)}
          >
            <div>
              <CollapsibleTrigger className="w-full text-left group">
                <div className="flex items-start gap-3 sm:gap-4 p-2 rounded-lg transition-all duration-200 hover:bg-muted/50 hover:shadow-sm">
                  <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                    <AvatarImage
                      src={`/company-logos/${getCompanyLogo(experience.company)}`}
                      alt={experience.company}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
                      {getCompanyInitials(experience.company)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-sm sm:text-base font-medium text-foreground">
                      {experience.company}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {experience.role} · {experience.period}
                    </p>
                    {experience.location && (
                      <p className="text-xs text-muted-foreground">{experience.location}</p>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-all duration-300 ease-in-out opacity-0 group-hover:opacity-100 transform ${
                      openItems.has(itemKey) ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 ml-10 sm:ml-14 overflow-hidden">
                <div className="animate-in slide-in-from-top-2 fade-in duration-300 ease-in-out">
                  {experience.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {experience.description}
                    </p>
                  )}
                  {experience.skills && experience.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {experience.skills.map((skill, index) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="text-xs animate-in slide-in-from-left-2 fade-in duration-300 ease-in-out"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )
      })}
    </div>
  )
}

type EducationSectionProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

function EducationSection({ isOpen, onOpenChange }: EducationSectionProps) {
  return (
    <>
      <h3 className="text-sm sm:text-base font-semibold text-foreground mb-4 sm:mb-6 mt-8 sm:mt-12">
        Education
      </h3>
      <div className="space-y-2 sm:space-y-4">
        <Collapsible open={isOpen} onOpenChange={onOpenChange}>
          <div>
            <CollapsibleTrigger className="w-full text-left group">
              <div className="flex items-start gap-3 sm:gap-4 p-2 rounded-lg transition-all duration-200 hover:bg-muted/50 hover:shadow-sm">
                <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                  <AvatarImage
                    src={`/company-logos/${getCompanyLogo('Visvesvaraya Technological University')}`}
                    alt="Visvesvaraya Technological University"
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
                    VTU
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <h3 className="text-sm sm:text-base font-medium text-foreground">
                    <a
                      href="https://www.linkedin.com/in/soumyapanda12/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors duration-200"
                    >
                      Visvesvaraya Technological University
                    </a>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Master of Computer Applications - MCA, Computer Science
                  </p>
                  <p className="text-xs text-muted-foreground">Dec 2022 - Oct 2024</p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-all duration-300 ease-in-out opacity-0 group-hover:opacity-100 transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 ml-10 sm:ml-14 overflow-hidden">
              <div className="animate-in slide-in-from-top-2 fade-in duration-300 ease-in-out">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Completed Master of Computer Applications with a focus on Computer Science, gaining comprehensive knowledge in software development, algorithms, data structures, and modern programming paradigms.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Computer Science', 'Software Development', 'Algorithms', 'Data Structures', 'Programming'].map(
                    (skill, index) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="text-xs animate-in slide-in-from-left-2 fade-in duration-300 ease-in-out"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {skill}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </>
  )
}

function ExperienceSkeletonList() {
  return (
    <div className="space-y-3 sm:space-y-4">
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
    </div>
  )
}

type ExperienceErrorStateProps = {
  onRetry: () => void
}

function ExperienceErrorState({ onRetry }: ExperienceErrorStateProps) {
  return (
    <div className="text-center py-6 sm:py-8">
      <p className="text-sm sm:text-base text-muted-foreground">Failed to load experience data</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm sm:text-base"
      >
        Try Again
      </button>
    </div>
  )
}

function ExperienceEmptyState() {
  return (
    <div className="border border-dashed border-muted rounded-lg px-4 py-6 text-center text-sm text-muted-foreground">
      No professional experience entries are available right now.
    </div>
  )
}
