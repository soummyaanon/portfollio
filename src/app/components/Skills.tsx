import { ComponentType, SVGProps } from 'react'
import { Badge } from '@/components/ui/badge'
import { Github } from 'lucide-react'
import { FaXTwitter } from 'react-icons/fa6'
import { Typescript } from '@/components/ui/svgs/typescript'
import { ReactDark } from '@/components/ui/svgs/reactDark'
import { Nodejs } from '@/components/ui/svgs/nodejs'
import { OpenaiDark } from '@/components/ui/svgs/openaiDark'
import { Python } from '@/components/ui/svgs/python'
import { PrismaDark } from '@/components/ui/svgs/prismaDark'
import { Javascript } from '@/components/ui/svgs/javascript'
import { Git } from '@/components/ui/svgs/git'
import { NextjsIconDark } from '@/components/ui/svgs/nextjsIconDark'
import { Postgresql } from '@/components/ui/svgs/postgresql'
import { MongodbIconDark } from '@/components/ui/svgs/mongodbIconDark'
import { ShadcnUi } from '@/components/ui/svgs/shadcnUi'
import { Marquee } from '@/components/ui/marquee'

type Skill = {
  name: string
  Icon?: ComponentType<SVGProps<SVGSVGElement>>
}

type SocialLink = {
  href: string
  label: string
  Icon: ComponentType<{ className?: string }>
}

export default function Skills() {
  const skills: Skill[] = [
    { name: 'Next.js', Icon: NextjsIconDark },
    { name: 'TypeScript', Icon: Typescript },
    { name: 'React', Icon: ReactDark },
    { name: 'Node.js', Icon: Nodejs },
    { name: 'OpenAI', Icon: OpenaiDark },
    { name: 'Python', Icon: Python },
    { name: 'Prisma', Icon: PrismaDark },
    { name: 'JavaScript', Icon: Javascript },
    { name: 'PostgreSQL', Icon: Postgresql },
    { name: 'MongoDB', Icon: MongodbIconDark },
    { name: 'Git', Icon: Git },
    { name: 'Shadcn UI', Icon: ShadcnUi }
  ]

  const firstRow = skills.slice(0, skills.length / 2)
  const secondRow = skills.slice(skills.length / 2)

  const socialLinks: SocialLink[] = [
    {
      href: 'https://github.com/soummyaanon',
      label: 'GitHub',
      Icon: Github
    },
    {
      href: 'https://x.com/SoumyapX',
      label: 'X (Twitter)',
      Icon: FaXTwitter
    }
  ]

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

        <div className="text-center mt-6 sm:mt-8 mb-2">
          <p className="text-xs text-muted-foreground font-medium">Follow me</p>
        </div>

        <div className="flex justify-center gap-3 sm:gap-4">
          {socialLinks.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group"
              aria-label={label}
            >
              <Badge
                variant="outline"
                className="text-xs px-3 sm:px-4 py-1 sm:py-2 border-dashed hover:bg-primary/5 hover:border-primary transition-colors flex items-center gap-2"
              >
                <Icon className="w-3 h-3" />
                <span className="sr-only">{label}</span>
              </Badge>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
