'use client'

import * as React from 'react'

/**
 * The tour's way in: a single eye under the figure, and nothing else. It blinks every few
 * seconds and its pupil follows the pointer anywhere on the page; left alone, it looks around
 * on its own. Screen readers hear "View details". Under reduced motion it holds still, open.
 */
export function Eye({ onOpen }: { readonly onOpen: () => void }) {
  const button = React.useRef<HTMLButtonElement>(null)
  const gaze = React.useRef<SVGGElement>(null)

  React.useEffect(() => {
    const element = button.current
    const pupil = gaze.current
    if (!element || !pupil) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let idle = 0
    let frame = 0
    const target = { x: 0, y: 0 }
    const at = { x: 0, y: 0 }
    // Eases the pupil toward where it is looking, so a fast hand drags the gaze, not snaps it.
    const step = () => {
      at.x += (target.x - at.x) * 0.2
      at.y += (target.y - at.y) * 0.2
      pupil.setAttribute('transform', `translate(${at.x.toFixed(2)} ${at.y.toFixed(2)})`)
      frame = Math.abs(target.x - at.x) + Math.abs(target.y - at.y) > 0.01 ? requestAnimationFrame(step) : 0
    }
    const look = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      const dx = event.clientX - (rect.left + rect.width / 2)
      const dy = event.clientY - (rect.top + rect.height / 2)
      // Saturates a few hundred pixels out: near the eye it tracks finely, far off it simply
      // looks that way. The iris travels further across than up and down, as an eye's does.
      target.x = Math.tanh(dx / 260) * 6.5
      target.y = Math.tanh(dy / 260) * 3.4
      element.dataset.following = ''
      window.clearTimeout(idle)
      // Left alone for a while, the eye goes back to looking around on its own.
      idle = window.setTimeout(() => {
        delete element.dataset.following
        target.x = 0
        target.y = 0
        if (!frame) frame = requestAnimationFrame(step)
      }, 2400)
      if (!frame) frame = requestAnimationFrame(step)
    }
    window.addEventListener('pointermove', look, { passive: true })
    return () => {
      window.removeEventListener('pointermove', look)
      window.clearTimeout(idle)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <button ref={button} type="button" onClick={onOpen} aria-label="View details" title="View details" className="nn-eye">
      <svg viewBox="0 0 48 28" width="48" height="28" aria-hidden>
        <defs>
          <clipPath id="nn-eye-opening">
            <path d="M3 14C12 3.5 36 3.5 45 14C36 24.5 12 24.5 3 14Z" />
          </clipPath>
        </defs>
        <g className="nn-eye-lid">
          <path d="M3 14C12 3.5 36 3.5 45 14C36 24.5 12 24.5 3 14Z" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
          <g clipPath="url(#nn-eye-opening)">
            <g className="nn-eye-wander">
              <g ref={gaze}>
                <circle cx="24" cy="14" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.1" />
                <circle cx="24" cy="14" r="3.1" fill="currentColor" />
                <circle cx="25.6" cy="12.4" r="1" fill="var(--background)" />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </button>
  )
}
