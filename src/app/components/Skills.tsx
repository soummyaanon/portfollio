'use client'

import { memo, useEffect, useMemo, useState, type ComponentType, type SVGProps } from 'react'
import { Badge } from '@/components/ui/badge'
import { Typescript } from '@/components/ui/svgs/typescript'
import { ReactDark } from '@/components/ui/svgs/reactDark'
import { ReactLight } from '@/components/ui/svgs/reactLight'
import { Nodejs } from '@/components/ui/svgs/nodejs'
import { OpenaiDark } from '@/components/ui/svgs/openaiDark'
import { Openai } from '@/components/ui/svgs/openai'
import { Python } from '@/components/ui/svgs/python'
import { PrismaDark } from '@/components/ui/svgs/prismaDark'
import { Prisma } from '@/components/ui/svgs/prisma'
import { Javascript } from '@/components/ui/svgs/javascript'
import { Git } from '@/components/ui/svgs/git'
import { NextjsIconDark } from '@/components/ui/svgs/nextjsIconDark'
import { Postgresql } from '@/components/ui/svgs/postgresql'
import { MongodbIconDark } from '@/components/ui/svgs/mongodbIconDark'
import { MongodbIconLight } from '@/components/ui/svgs/mongodbIconLight'
import { ShadcnUi } from '@/components/ui/svgs/shadcnUi'
import { Marquee } from '@/components/ui/marquee'
import { Separator } from '@/components/ui/separator'
import { useTheme } from 'next-themes'

// Types
type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

interface Skill {
  readonly name: string
  readonly Icon?: IconComponent
  readonly darkIcon?: IconComponent
  readonly lightIcon?: IconComponent
}

interface SkillBadgeProps {
  readonly skill: Skill
  readonly isDark: boolean
  readonly mounted: boolean
}

// Skill configuration - static skills don't change based on theme
const STATIC_SKILLS: readonly Skill[] = [
  { name: 'Next.js', Icon: NextjsIconDark },
  { name: 'TypeScript', Icon: Typescript },
  { name: 'Node.js', Icon: Nodejs },
  { name: 'Python', Icon: Python },
  { name: 'JavaScript', Icon: Javascript },
  { name: 'PostgreSQL', Icon: Postgresql },
  { name: 'Git', Icon: Git },
  { name: 'Shadcn UI', Icon: ShadcnUi },
] as const

// Theme-dependent skills
const THEME_SKILLS: readonly Skill[] = [
  { name: 'React', darkIcon: ReactDark, lightIcon: ReactLight },
  { name: 'OpenAI', darkIcon: OpenaiDark, lightIcon: Openai },
  { name: 'Prisma', darkIcon: PrismaDark, lightIcon: Prisma },
  { name: 'MongoDB', darkIcon: MongodbIconDark, lightIcon: MongodbIconLight },
] as const

// Sanskrit quote text
const QUOTE_LINES = [
  'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।',
  'अहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः ॥',
] as const

/**
 * Resolves the correct icon based on theme
 * Returns darkIcon as default for SSR to match initial client render
 */
function resolveIcon(skill: Skill, isDark: boolean, mounted: boolean): IconComponent | undefined {
  if (skill.Icon) return skill.Icon
  // Before mount, always return darkIcon to match SSR
  if (!mounted) return skill.darkIcon
  return isDark ? skill.darkIcon : skill.lightIcon
}

/**
 * SkillBadge component for individual skill display
 */
const SkillBadge = memo(function SkillBadge({ skill, isDark, mounted }: SkillBadgeProps) {
  const Icon = resolveIcon(skill, isDark, mounted)
  
  return (
    <Badge
      variant="secondary"
      className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 mx-1"
    >
      {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />}
      {skill.name}
    </Badge>
  )
})

/**
 * Quote section component
 */
const QuoteSection = memo(function QuoteSection() {
  return (
    <>
      <div className="flex justify-center mt-12 mb-4">
        <Separator className="w-32" />
      </div>

      <blockquote 
        className="text-center mt-6 sm:mt-8 mb-2"
        lang="sa"
        aria-label="Sanskrit verse from Bhagavad Gita"
      >
        {QUOTE_LINES.map((line, index) => (
          <p 
            key={index}
            className="text-xs text-muted-foreground font-medium"
          >
            {line}
          </p>
        ))}
      </blockquote>

      <div className="flex justify-center my-4">
        <Separator className="w-32" />
      </div>
    </>
  )
})

/**
 * Custom hook to build skills list based on theme
 */
function useSkills(): { firstRow: Skill[]; secondRow: Skill[] } {
  return useMemo(() => {
    const allSkills: Skill[] = [
      ...STATIC_SKILLS.slice(0, 2),
      THEME_SKILLS[0], // React
      STATIC_SKILLS[2], // Node.js
      THEME_SKILLS[1], // OpenAI
      STATIC_SKILLS[3], // Python
      THEME_SKILLS[2], // Prisma
      STATIC_SKILLS[4], // JavaScript
      STATIC_SKILLS[5], // PostgreSQL
      THEME_SKILLS[3], // MongoDB
      STATIC_SKILLS[6], // Git
      STATIC_SKILLS[7], // Shadcn UI
    ]

    const midpoint = Math.ceil(allSkills.length / 2)
    return {
      firstRow: allSkills.slice(0, midpoint),
      secondRow: allSkills.slice(midpoint),
    }
  }, [])
}

/**
 * Skills section component
 */
function Skills() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { firstRow, secondRow } = useSkills()

  // Track mounting to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <section 
      id="skills" 
      className="pt-8 sm:pt-12 pb-24 sm:pb-32"
      aria-labelledby="skills-heading"
    >
      <div className="max-w-4xl mx-auto">
        <h2 
          id="skills-heading"
          className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6"
        >
          Skills
        </h2>
        
        <div 
          className="relative flex w-full flex-col items-center justify-center overflow-hidden"
          role="list"
          aria-label="Technical skills"
        >
          <Marquee 
            reverse 
            pauseOnHover 
            className="[--duration:30s]"
          >
            {firstRow.map((skill) => (
              <SkillBadge key={skill.name} skill={skill} isDark={isDark} mounted={mounted} />
            ))}
          </Marquee>
          
          <Marquee 
            pauseOnHover 
            className="[--duration:30s]"
          >
            {secondRow.map((skill) => (
              <SkillBadge key={skill.name} skill={skill} isDark={isDark} mounted={mounted} />
            ))}
          </Marquee>
          
          {/* Gradient overlays for fade effect */}
          <div 
            className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r" 
            aria-hidden="true"
          />
          <div 
            className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l" 
            aria-hidden="true"
          />
        </div>

        <QuoteSection />
      </div>
    </section>
  )
}

export default memo(Skills)
