import { memo, type ComponentType } from 'react'
import { Github, Linkedin, Twitter, Mail, type LucideProps } from 'lucide-react'

// Constants
const CURRENT_YEAR = new Date().getFullYear()
const AUTHOR_NAME = 'Soumyaranjan Panda'
const ICON_SIZE = 24

// Social links configuration for easy maintenance
interface SocialLink {
  readonly href: string
  readonly label: string
  readonly Icon: ComponentType<LucideProps>
}

const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    href: 'https://github.com/soummyaanon',
    label: 'GitHub Profile',
    Icon: Github,
  },
  {
    href: 'https://www.linkedin.com/in/soumyapanda12/',
    label: 'LinkedIn Profile',
    Icon: Linkedin,
  },
  {
    href: 'https://x.com/SoumyapX',
    label: 'Twitter Profile',
    Icon: Twitter,
  },
  {
    href: 'mailto:soumyapanda.mail@gmail.com',
    label: 'Send Email',
    Icon: Mail,
  },
] as const

/**
 * SocialLinkItem component for individual social links
 */
interface SocialLinkItemProps {
  readonly link: SocialLink
}

const SocialLinkItem = memo(function SocialLinkItem({ link }: SocialLinkItemProps) {
  const { href, label, Icon } = link
  
  return (
    <a
      href={href}
      className="text-muted-foreground hover:text-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
    >
      <Icon size={ICON_SIZE} aria-hidden="true" />
    </a>
  )
})

/**
 * Footer component with copyright and social links
 */
function Footer() {
  return (
    <footer 
      className="bg-muted border-t border-border"
      role="contentinfo"
    >
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm sm:text-base text-center sm:text-left">
            © {CURRENT_YEAR} {AUTHOR_NAME}. Building the future, one line of code at a time.
          </p>
          <nav aria-label="Social media links">
            <ul className="flex space-x-4" role="list">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.href}>
                  <SocialLinkItem link={link} />
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export default memo(Footer)
