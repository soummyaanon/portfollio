import { memo } from 'react'
import { HyperText } from '@/components/ui/hyper-text'

// Constants for animation configuration
const HYPER_TEXT_CONFIG = {
  duration: 600,
  baseDelay: 200,
  className: 'inline text-xs sm:text-sm font-medium',
} as const

// Highlight words configuration for maintainability
const HIGHLIGHT_WORDS = [
  { text: 'AI', delay: 0 },
  { text: 'deep space', delay: HYPER_TEXT_CONFIG.baseDelay },
  { text: 'spirituality', delay: HYPER_TEXT_CONFIG.baseDelay * 2 },
  { text: 'universe', delay: HYPER_TEXT_CONFIG.baseDelay * 3 },
] as const

/**
 * HighlightedWord component for consistent hyper-text styling
 */
interface HighlightedWordProps {
  readonly children: string
  readonly delay?: number
}

const HighlightedWord = memo(function HighlightedWord({ 
  children, 
  delay = 0 
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
 * About section component displaying personal introduction
 * with animated highlight words
 */
function About() {
  return (
    <section 
      id="about" 
      className="py-4 sm:py-8"
      aria-labelledby="about-heading"
    >
      <div className="max-w-4xl mx-auto">
        <h2 
          id="about-heading"
          className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6"
        >
          About
        </h2>
        <div className="prose max-w-none dark:prose-invert">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            I create with{' '}
            <HighlightedWord delay={HIGHLIGHT_WORDS[0].delay}>
              {HIGHLIGHT_WORDS[0].text}
            </HighlightedWord>{' '}
            and love{' '}
            <HighlightedWord delay={HIGHLIGHT_WORDS[1].delay}>
              {HIGHLIGHT_WORDS[1].text}
            </HighlightedWord>
            . Also into{' '}
            <HighlightedWord delay={HIGHLIGHT_WORDS[2].delay}>
              {HIGHLIGHT_WORDS[2].text}
            </HighlightedWord>{' '}
            and exploring consciousness. Just trying to understand this wild{' '}
            <HighlightedWord delay={HIGHLIGHT_WORDS[3].delay}>
              {HIGHLIGHT_WORDS[3].text}
            </HighlightedWord>
            , inside and out.
          </p>
        </div>
      </div>
    </section>
  )
}

export default memo(About)
