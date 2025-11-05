import { ComponentType, SVGProps, useEffect, useState } from 'react'
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

type Skill = {
  name: string
  Icon?: ComponentType<SVGProps<SVGSVGElement>>
}


export default function Skills() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }

    checkTheme()

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  const skills: Skill[] = [
    { name: 'Next.js', Icon: NextjsIconDark },
    { name: 'TypeScript', Icon: Typescript },
    { name: 'React', Icon: isDark ? ReactDark : ReactLight },
    { name: 'Node.js', Icon: Nodejs },
    { name: 'OpenAI', Icon: isDark ? OpenaiDark : Openai },
    { name: 'Python', Icon: Python },
    { name: 'Prisma', Icon: isDark ? PrismaDark : Prisma },
    { name: 'JavaScript', Icon: Javascript },
    { name: 'PostgreSQL', Icon: Postgresql },
    { name: 'MongoDB', Icon: isDark ? MongodbIconDark : MongodbIconLight },
    { name: 'Git', Icon: Git },
    { name: 'Shadcn UI', Icon: ShadcnUi }
  ]

  const firstRow = skills.slice(0, skills.length / 2)
  const secondRow = skills.slice(skills.length / 2)


  return (
    <section id="skills" className="pt-8 sm:pt-12 pb-24 sm:pb-32">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6">Skills</h2>
        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
          <Marquee reverse pauseOnHover className="[--duration:30s]">
            {firstRow.map((skill) => (
              <Badge
                key={skill.name}
                variant="secondary"
                className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 mx-1"
              >
                {skill.Icon && <skill.Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                {skill.name}
              </Badge>
            ))}
          </Marquee>
          <Marquee pauseOnHover className="[--duration:30s]">
            {secondRow.map((skill) => (
              <Badge
                key={skill.name}
                variant="secondary"
                className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 mx-1"
              >
                {skill.Icon && <skill.Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                {skill.name}
              </Badge>
            ))}
          </Marquee>
          <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r"></div>
          <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l"></div>
        </div>

        <div className="flex justify-center mt-12 mb-4">
          <Separator className="w-32" />
        </div>

        <div className="text-center mt-6 sm:mt-8 mb-2">
          <p className="text-xs text-muted-foreground font-medium">सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।</p>
          <p className="text-xs text-muted-foreground font-medium">अहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः ॥</p>
        </div>

        <div className="flex justify-center my-4">
          <Separator className="w-32" />
        </div>

      </div>
    </section>
  )
}
