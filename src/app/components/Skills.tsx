import { ComponentType } from 'react'
import { Badge } from '@/components/ui/badge'
import { Github } from 'lucide-react'
import { FaXTwitter } from 'react-icons/fa6'

type SocialLink = {
  href: string
  label: string
  Icon: ComponentType<{ className?: string }>
}

export default function Skills() {
  const skills = [
    'Next.js',
    'TypeScript',
    'React',
    'Node.js',
    'OpenAI',
    'Python',
    'Prisma',
    'JavaScript',
    'Tailwind CSS',
    'Git',
    'Vercel',
    'RESTful APIs'
  ]

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
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {skills.map((skill) => (
            <Badge
              key={skill}
              variant="secondary"
              className="text-xs px-1.5 sm:px-2 py-0.5 sm:py-1"
            >
              {skill}
            </Badge>
          ))}
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
