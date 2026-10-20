'use client'

import * as React from 'react'

import { Eye } from './Eye'
import { TOUR } from './tour'

/**
 * A neural network as a monochrome sculpture in real 3D. Three.js and the scene load only when
 * the figure comes within a screen of the viewport.
 *
 * At rest there is no interface: the sculpture stands upright and turns slowly to the right on
 * its own; drag sideways to spin it (plain scrolling still scrolls the page). Hover a node to
 * trace its connections, click it to pin them and fire it, click the core to send a wave
 * through the network. P or Space pauses, Enter sends a wave, Esc lets go of a pinned node.
 *
 * The eye under the figure ("View details") opens the guided tour: the figure holds still while the page
 * scrolls past it, one stop per part. The camera travels to each part, the rest dims, an
 * indicator rides on the part as it turns, and a panel says what it is. Esc or Close ends it.
 */

interface SceneHandle {
  setTour(at: number | null, instant?: boolean): void
}

/** Scroll height of one stop, as a share of the viewport. */
const STOP_SCROLL = 0.8

export function NeuralNetwork() {
  const host = React.useRef<HTMLDivElement>(null)
  const track = React.useRef<HTMLDivElement>(null)
  const mark = React.useRef<HTMLDivElement>(null)
  const handle = React.useRef<SceneHandle | null>(null)
  const [failed, setFailed] = React.useState(false)
  const [touring, setTouring] = React.useState(false)
  const [stop, setStop] = React.useState(0)

  // One effect for the scene's whole life: wait until it is near, load, mount, and tear it all
  // down on unmount. Nothing it does re-renders React; the tour reaches it through `handle`.
  React.useEffect(() => {
    const node = host.current
    if (!node) return
    let cancelled = false
    let cleanup: (() => void) | null = null

    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        near.disconnect()
        import('./scene')
          .then(({ createNeuralScene }) => {
            if (!cancelled) cleanup = mount(createNeuralScene, node)
          })
          .catch((error) => {
            console.warn('3D network unavailable:', error)
            if (!cancelled) setFailed(true)
          })
      },
      { rootMargin: '100% 0px' },
    )
    near.observe(node)

    function mount(createNeuralScene: typeof import('./scene').createNeuralScene, container: HTMLDivElement) {
      const small = container.clientWidth < 640
      const view = createNeuralScene(container, { small })
      const canvas = view.canvas
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
      let paused = reduced.matches

      const resizer = new ResizeObserver(() => {
        view.resize(container.clientWidth, container.clientHeight)
        wake()
      })
      resizer.observe(container)

      const toDevice = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect()
        return { x: ((event.clientX - rect.left) / rect.width) * 2 - 1, y: -((event.clientY - rect.top) / rect.height) * 2 + 1 }
      }
      let dragging = false
      const move = (event: PointerEvent) => {
        if (event.pointerType === 'touch' && dragging) return wake()
        const over = view.point(toDevice(event))
        canvas.style.cursor = dragging ? 'grabbing' : over ? 'pointer' : 'grab'
        wake()
      }
      const leave = () => {
        view.point(null)
        canvas.style.cursor = 'grab'
        wake()
      }
      let down: { x: number; y: number; t: number } | null = null
      const press = (event: PointerEvent) => {
        down = { x: event.clientX, y: event.clientY, t: performance.now() }
        dragging = true
        view.point(toDevice(event))
        wake()
      }
      const release = (event: PointerEvent) => {
        dragging = false
        if (!down) return
        const still = Math.hypot(event.clientX - down.x, event.clientY - down.y) < 5 && performance.now() - down.t < 450
        down = null
        if (!still) return
        view.point(toDevice(event))
        view.press()
        if (event.pointerType === 'touch') view.point(null)
        wake()
      }
      canvas.addEventListener('pointermove', move)
      canvas.addEventListener('pointerleave', leave)
      canvas.addEventListener('pointerdown', press)
      window.addEventListener('pointerup', release)

      const key = (event: KeyboardEvent) => {
        const k = event.key.toLowerCase()
        if (k === 'escape') view.clear()
        else if (k === 'p' || k === ' ') paused = !paused
        else if (k === 'enter') view.wave()
        else return
        event.preventDefault()
        wake()
      }
      container.addEventListener('keydown', key)
      const motion = () => {
        paused = reduced.matches
        wake()
      }
      reduced.addEventListener('change', motion)

      // The indicator follows the stop's anchor across the canvas. Written straight onto its
      // style each frame; it chases the anchor rather than jumping, so when the nearest node
      // changes as the sculpture turns, the indicator glides to the next one.
      let markAt: { x: number; y: number } | null = null
      const placeMark = () => {
        const element = mark.current
        if (!element) return
        const at = view.anchor()
        if (!at) {
          element.style.opacity = '0'
          markAt = null
          return
        }
        if (!markAt || reduced.matches) markAt = { ...at }
        else {
          markAt.x += (at.x - markAt.x) * 0.18
          markAt.y += (at.y - markAt.y) * 0.18
        }
        element.style.opacity = '1'
        element.style.transform = `translate3d(${markAt.x.toFixed(1)}px, ${markAt.y.toFixed(1)}px, 0)`
        // The label runs left, out toward the margin; only near the canvas's left edge, where
        // it would leave the canvas, does it turn and run right.
        element.dataset.side = markAt.x < 170 ? 'right' : 'left'
      }

      // ── The one loop: runs while the figure is on screen and something is moving ──────
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
        const active = view.frame(paused ? 0 : dt)
        placeMark()
        frame = visible && (active || !paused) ? requestAnimationFrame(tick) : 0
        if (!frame) last = 0
      }
      function wake() {
        if (!frame && visible) frame = requestAnimationFrame(tick)
      }
      view.resize(container.clientWidth, container.clientHeight)
      wake()

      handle.current = {
        setTour(at, instant) {
          view.setTour(at, instant || reduced.matches)
          wake()
        },
      }

      const lost = (event: Event) => event.preventDefault()
      canvas.addEventListener('webglcontextlost', lost)

      return () => {
        handle.current = null
        cancelAnimationFrame(frame)
        frame = 0
        watcher.disconnect()
        resizer.disconnect()
        reduced.removeEventListener('change', motion)
        container.removeEventListener('keydown', key)
        canvas.removeEventListener('pointermove', move)
        canvas.removeEventListener('pointerleave', leave)
        canvas.removeEventListener('pointerdown', press)
        window.removeEventListener('pointerup', release)
        canvas.removeEventListener('webglcontextlost', lost)
        view.dispose()
      }
    }

    return () => {
      cancelled = true
      near.disconnect()
      cleanup?.()
    }
  }, [])

  // ── The tour: scroll position along the track is the position along the stops ──────────
  React.useEffect(() => {
    if (!touring) {
      handle.current?.setTour(null)
      return
    }
    const element = track.current
    if (!element) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const read = () => {
      const rect = element.getBoundingClientRect()
      const span = Math.max(rect.height - window.innerHeight, 1)
      const progress = Math.min(Math.max(-rect.top / span, 0), 1)
      const at = progress * (TOUR.length - 1)
      handle.current?.setTour(at)
      setStop(Math.round(at))
    }
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTouring(false)
    }
    // Bring the start of the track to the top of the screen, so the first scroll is the tour.
    window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY, behavior: reduce ? 'auto' : 'smooth' })
    read()
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
      window.removeEventListener('keydown', close)
    }
  }, [touring])

  const end = () => {
    setTouring(false)
    // Once the track collapses, put the figure back where the reader left it.
    requestAnimationFrame(() => host.current?.scrollIntoView({ block: 'center' }))
  }

  // Jumps to a stop by scrolling to its place on the track.
  const goTo = (index: number) => {
    const element = track.current
    if (!element) return
    const span = element.getBoundingClientRect().height - window.innerHeight
    const top = element.getBoundingClientRect().top + window.scrollY + (index / (TOUR.length - 1)) * span
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
  }

  const current = TOUR[stop]!

  return (
    <div
      ref={track}
      className="nn-tour"
      data-touring={touring || undefined}
      style={touring ? { height: `${TOUR.length * STOP_SCROLL * 100 + 100}svh` } : undefined}
    >
      <div className="nn-stage">
        <div
          ref={host}
          className="nn-host"
          tabIndex={0}
          role="application"
          aria-roledescription="3D scene"
          aria-label="A neural network as a monochrome sculpture in 3D: inputs on a wide ring, two processing stages, a glass core with orbital rings, and outputs on a narrow ring. Signals run through it continuously. It turns slowly on its own; drag sideways to spin it. Hover a node to trace its connections, click it to pin them, click the core to send a wave. P pauses, Enter sends a wave, Escape lets go of a pinned node."
        >
          {failed ? <p className="nn-note">This figure needs WebGL, which this browser has turned off.</p> : null}
          <div ref={mark} aria-hidden className="nn-mark" hidden={!touring}>
            <span className="nn-mark-dot" />
            <span className="nn-mark-line" />
            <span className="nn-mark-label">{current.name}</span>
          </div>
        </div>

        {touring && (
          <aside className="nn-panel" aria-label="Guided tour of the network">
            <div className="flex items-center justify-between">
              <p className="field-label tracking-[0.2em] text-muted-foreground">
                <span className="text-foreground">{String(stop + 1).padStart(2, '0')}</span>
                {' / '}
                {String(TOUR.length).padStart(2, '0')}
              </p>
              <button type="button" onClick={end} className="nn-button">
                Close <span aria-hidden>×</span>
              </button>
            </div>

            <div key={current.id} className="nn-copy" aria-live="polite">
              <h3 className="mt-6 font-display text-title leading-[1.1] text-foreground">{current.title}</h3>
              <p className="mt-3 text-fine font-light leading-[1.65] text-foreground/75">{current.body}</p>
              <p className="field-label mt-4 tracking-[0.12em] text-muted-foreground">{current.facts}</p>
            </div>

            {/* The stops as a ruler: a tick per stop, the current one lit; each jumps there. */}
            <ol className="nn-ruler mt-8">
              {TOUR.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => goTo(index)}
                    data-current={index === stop || undefined}
                    className="nn-tick"
                  >
                    <span aria-hidden className="nn-tick-mark" />
                    {item.name}
                  </button>
                </li>
              ))}
            </ol>

            {stop === 0 && <p className="field-label mt-6 tracking-[0.2em] text-muted-foreground/70">Scroll to explore ↓</p>}
          </aside>
        )}
      </div>

      {!touring && (
        <div className="mt-[var(--space-tight)] flex justify-center">
          <Eye onOpen={() => setTouring(true)} />
        </div>
      )}
    </div>
  )
}
