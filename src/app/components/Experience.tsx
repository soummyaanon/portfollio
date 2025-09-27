'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface Experience {
  company: string
  period: string
  role: string
  description: string
  location?: string
  skills?: string[]
}

export default function Experience() {
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <section id="experience" className="py-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6">Experience</h2>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-l-4 border-primary pl-4 animate-pulse">
              <div className="mb-2">
                <div className="h-5 bg-muted rounded mb-2 w-3/4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                </div>
              </div>
              <div className="h-4 bg-muted rounded mb-1 w-full"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
            </div>
          ))}
        </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section id="experience" className="py-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6">Experience</h2>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Failed to load experience data</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
        </div>
      </section>
    )
  }

  return (
    <section id="experience" className="py-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-6">Experience</h2>
        <div className="space-y-6">
        {experiences.map((exp, index) => (
          <div key={index} className="border-l-4 border-primary pl-4">
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={`/company-logos/${exp.company.toLowerCase().replace(/\s+/g, '-')}.png`} alt={exp.company} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {exp.company.split(' ').map(word => word[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="mb-2">
                  <h3 className="text-lg font-semibold text-foreground">{exp.company}</h3>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                    <span className="text-primary font-medium">{exp.role}</span>
                    <span className="text-sm text-muted-foreground">{exp.period}</span>
                  </div>
                  {exp.location && (
                    <p className="text-sm text-muted-foreground mt-1">{exp.location}</p>
                  )}
                </div>
                {exp.description && (
                  <p className="text-muted-foreground leading-relaxed mb-3">{exp.description}</p>
                )}
                {exp.skills && exp.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {exp.skills.map((skill, skillIndex) => (
                      <Badge key={skillIndex} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>
    </section>
  )
}
