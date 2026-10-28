'use client'

import { motion, useReducedMotion } from 'framer-motion'

import { useI18n } from '@/i18n/useLocale'

import { useDocumentMode, type DocumentMode } from './DocumentMode'
import { MORPH_EASE } from './Fact'

const MODES: readonly DocumentMode[] = ['human', 'machine']

/**
 * A segmented control, deliberately plain: a hairline box, a solid indicator, and two words.
 * No backdrop blur, no glow, no gradient — the toggle is the least interesting thing on the
 * page and should not compete with what it triggers.
 */
export function ModeToggle() {
  const { mode, setMode } = useDocumentMode()
  const reduceMotion = useReducedMotion()
  const { t } = useI18n()

  return (
    // data-horizon-eat: fixed chrome lives outside the human view, so the hole at the foot of
    // the page would never find it by walking the document. Left behind it would be the one
    // object still floating over an empty screen, which reads as a bug rather than a decision.
    <div
      data-horizon-eat
      className="fixed right-[clamp(1rem,3vw,2.5rem)] top-[clamp(1rem,3vw,2rem)] z-50"
    >
      <div
        role="radiogroup"
        aria-label={t.mode.group}
        className="relative flex rounded-full border border-border bg-background/95 p-0.5"
      >
        {MODES.map((option) => {
          const isActive = option === mode

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setMode(option)}
              className="relative rounded-full px-3 py-1.5 text-caption uppercase tracking-[0.14em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              {isActive && !reduceMotion && (
                <motion.span
                  layoutId="mode-indicator"
                  transition={{ duration: 0.4, ease: MORPH_EASE }}
                  className="absolute inset-0 rounded-full bg-foreground"
                />
              )}
              {isActive && reduceMotion && (
                <span className="absolute inset-0 rounded-full bg-foreground" />
              )}
              <span
                className={`relative ${isActive ? 'text-background' : 'text-muted-foreground'}`}
              >
                {t.mode[option]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Hidden where there is no keyboard to press. */}
      <p className="mt-1.5 hidden text-right text-caption text-muted-foreground/60 sm:block">
        {t.mode.pressBefore}
        <kbd className="font-mono text-foreground/70">m</kbd>
        {t.mode.pressAfter}
      </p>
    </div>
  )
}
