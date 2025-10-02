'use client'

import { useState, useEffect } from 'react'
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
  'Cloudoplus': 'claudo plus.png',
  'Chatsguru': 'chatguru.png',
  'Visvesvaraya Technological University': 'visvesvaraya-technological-university.png'
}

function getCompanyLogo(company: string): string {
  return companyLogoMap[company] || `${company.toLowerCase().replace(/\s+/g, '-')}.png`
}

export default function Experience() {
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function fetchExperiences() {
      try {
        const response = await fetch('/api/experiences')
        if (!response.ok) {
          throw new Error('Failed to fetch experiences')
        }
        const data = await response.json()
        setExperiences(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Error fetching experiences:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchExperiences()
  }, [])

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index)
    } else {
      newOpenItems.add(index)
    }
    setOpenItems(newOpenItems)
  }

  if (loading) {
    return (
      <section id="experience" className="py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6">Experience</h2>
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse space-y-2 p-2 rounded-lg">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-full flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 sm:h-4 bg-muted w-3/4 rounded"></div>
                  <div className="h-2 sm:h-3 bg-muted w-1/2 rounded"></div>
                  <div className="h-2 sm:h-3 bg-muted w-full rounded"></div>
                  <div className="h-2 sm:h-3 bg-muted w-5/6 rounded"></div>
                </div>
                <div className="w-4 h-4 bg-muted rounded"></div>
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section id="experience" className="py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6">Experience</h2>
        <div className="text-center py-6 sm:py-8">
          <p className="text-sm sm:text-base text-muted-foreground">Failed to load experience data</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm sm:text-base"
          >
            Try Again
          </button>
        </div>
        </div>
      </section>
    )
  }

  return (
    <section id="experience" className="py-4 sm:py-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6">Experience</h2>
        <div className="space-y-2 sm:space-y-4">
        {experiences.map((exp, index) => (
          <Collapsible key={index} open={openItems.has(index)} onOpenChange={() => toggleItem(index)}>
            <div>
              <CollapsibleTrigger className="w-full text-left group">
                <div className="flex items-start gap-3 sm:gap-4 p-2 rounded-lg transition-all duration-200 hover:bg-muted/50 hover:shadow-sm">
                  <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                    <AvatarImage src={`/company-logos/${getCompanyLogo(exp.company)}`} alt={exp.company} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
                      {exp.company.split(' ').map(word => word[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-sm sm:text-base font-medium text-foreground">{exp.company}</h3>
                    <p className="text-xs text-muted-foreground">{exp.role} · {exp.period}</p>
                    {exp.location && (
                      <p className="text-xs text-muted-foreground">{exp.location}</p>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-all duration-300 ease-in-out opacity-0 group-hover:opacity-100 transform ${
                      openItems.has(index) ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 ml-10 sm:ml-14 overflow-hidden">
                <div className="animate-in slide-in-from-top-2 fade-in duration-300 ease-in-out">
                  {exp.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{exp.description}</p>
                  )}
                  {exp.skills && exp.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {exp.skills.map((skill, skillIndex) => (
                        <Badge
                          key={skillIndex}
                          variant="outline"
                          className="text-xs animate-in slide-in-from-left-2 fade-in duration-300 ease-in-out"
                          style={{ animationDelay: `${skillIndex * 50}ms` }}
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
        ))}
        </div>

        {/* Education Section */}
        <h3 className="text-sm sm:text-base font-semibold text-foreground mb-4 sm:mb-6 mt-8 sm:mt-12">Education</h3>
        <div className="space-y-2 sm:space-y-4">
          <Collapsible open={openItems.has(experiences.length)} onOpenChange={() => toggleItem(experiences.length)}>
            <div>
              <CollapsibleTrigger className="w-full text-left group">
                <div className="flex items-start gap-3 sm:gap-4 p-2 rounded-lg transition-all duration-200 hover:bg-muted/50 hover:shadow-sm">
                  <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                    <AvatarImage src={`/company-logos/${getCompanyLogo('Visvesvaraya Technological University')}`} alt="Visvesvaraya Technological University" />
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
                    <p className="text-xs text-muted-foreground">Master of Computer Applications - MCA, Computer Science</p>
                    <p className="text-xs text-muted-foreground">Dec 2022 - Oct 2024</p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-all duration-300 ease-in-out opacity-0 group-hover:opacity-100 transform ${
                      openItems.has(experiences.length) ? 'rotate-180' : ''
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
                    {['Computer Science', 'Software Development', 'Algorithms', 'Data Structures', 'Programming'].map((skill, skillIndex) => (
                      <Badge
                        key={skillIndex}
                        variant="outline"
                        className="text-xs animate-in slide-in-from-left-2 fade-in duration-300 ease-in-out"
                        style={{ animationDelay: `${skillIndex * 50}ms` }}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      </div>
    </section>
  )
}
