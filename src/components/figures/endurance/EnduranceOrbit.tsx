'use client'

import * as React from 'react'
import { motion, type MotionValue } from 'framer-motion'

/**
 * The Endurance, orbiting the hero's black hole. A transparent canvas over the plate's own,
 * moved by the same scroll parallax and fade so the two stay registered. Three.js loads once
 * the page has painted, so the ship never costs the first view anything; the loop runs only
 * while the plate is on screen, and under reduced motion the ship holds one still position.
 *
 * Hovering the plate brings in the film's colours, at the same slow fade as the plate's own.
 */
export function EnduranceOrbit({ y, opacity }: { readonly y?: MotionValue<number>; readonly opacity?: MotionValue<number> }) {
  const host = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const node = host.current
    if (!node) return
    let cancelled = false
    let cleanup: (() => void) | null = null

    const start = () =>
      import('./scene')
        .then(({ createOrbitScene }) => {
          if (!cancelled) cleanup = mount(createOrbitScene, node)
        })
        .catch((error) => console.warn('Endurance unavailable:', error))

    // After the first paint and the plate's own start-up, not in their way.
    const hasIdle = typeof window.requestIdleCallback === 'function'
    const idle = hasIdle ? window.requestIdleCallback(start, { timeout: 2000 }) : window.setTimeout(start, 600)

    function mount(createOrbitScene: typeof import('./scene').createOrbitScene, container: HTMLDivElement) {
      const view = createOrbitScene(container, { small: container.clientWidth < 640 })
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const resize = () => view.resize(container.clientWidth, container.clientHeight)
      const resizer = new ResizeObserver(() => {
        resize()
        if (reduced) view.frame(0, 0)
      })
      resizer.observe(container)
      resize()

      // The plate's hover, read off the pointer: over the plate, the colours come in.
      let colourTarget = 0
      let colour = 0
      const look = (event: PointerEvent) => {
        const rect = container.getBoundingClientRect()
        const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom
        colourTarget = inside && event.pointerType === 'mouse' ? 1 : 0
      }
      window.addEventListener('pointermove', look, { passive: true })

      let visible = true
      const watcher = new IntersectionObserver((entries) => {
        visible = Boolean(entries.at(-1)?.isIntersecting)
        if (visible) wake()
      })
      watcher.observe(container)

      let frame = 0
      let last = 0
      const tick = (now: number) => {
        const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60
        last = now
        colour += (colourTarget - colour) * 0.06
        view.frame(dt, colour)
        frame = visible ? requestAnimationFrame(tick) : 0
        if (!frame) last = 0
      }
      function wake() {
        if (!frame && visible && !reduced) frame = requestAnimationFrame(tick)
      }
      if (reduced) view.frame(0, 0)
      else wake()

      return () => {
        cancelAnimationFrame(frame)
        watcher.disconnect()
        resizer.disconnect()
        window.removeEventListener('pointermove', look)
        view.dispose()
      }
    }

    return () => {
      cancelled = true
      if (hasIdle) window.cancelIdleCallback(idle)
      else window.clearTimeout(idle)
      cleanup?.()
    }
  }, [])

  return <motion.div ref={host} aria-hidden className="pointer-events-none absolute inset-0" style={y && opacity ? { y, opacity } : undefined} />
}
