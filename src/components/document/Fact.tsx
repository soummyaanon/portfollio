'use client'

import { motion, useReducedMotion } from 'framer-motion'

/**
 * Exponential ease-out. Real objects decelerate; they do not bounce.
 * Matches --ease-out-quint in globals.css.
 */
export const MORPH_EASE = [0.22, 1, 0.36, 1] as const
export const MORPH_DURATION = 0.62

/**
 * One atomic fact, shared between the two renderings of the document.
 *
 * Both views render the same set of `Fact`s with the same ids. When the mode flips, the
 * human tree unmounts and the machine tree mounts in the same commit, so Framer matches
 * them by `layoutId` and animates each value from where it sat in the sentence to its slot
 * in the fielded record. That travel *is* the argument the page is making — the facts do
 * not change, only their encoding.
 *
 * `layout="position"` rather than full layout animation: these are text nodes, and letting
 * Framer interpolate the box size would scale glyphs and render them blurry mid-flight.
 * Position animates, size snaps. The snap is legible and, since the two views deliberately
 * use different faces and sizes, it reads as re-encoding rather than as a glitch.
 */
export function Fact({
  id,
  children,
  className,
}: {
  readonly id: string
  readonly children: React.ReactNode
  readonly className?: string
}) {
  const reduceMotion = useReducedMotion()

  // No layoutId when motion is unwanted: the views then swap instantly with no travel.
  if (reduceMotion) {
    return <span className={className}>{children}</span>
  }

  return (
    <motion.span
      layoutId={`fact:${id}`}
      layout="position"
      transition={{ duration: MORPH_DURATION, ease: MORPH_EASE }}
      className={className}
    >
      {children}
    </motion.span>
  )
}

/**
 * Connective tissue — the prose that holds facts together in the human view, and the field
 * labels that hold them apart in the machine view. It has no counterpart across the swap,
 * so it fades rather than travelling, staggered to land just behind the moving facts.
 */
export function Connective({
  children,
  delay = 0,
  className,
}: {
  readonly children: React.ReactNode
  readonly delay?: number
  readonly className?: string
}) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <span className={className}>{children}</span>
  }

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: MORPH_DURATION * 0.45 + delay, ease: 'linear' }}
      className={className}
    >
      {children}
    </motion.span>
  )
}
