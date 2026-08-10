'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { CAPTURE_RATIO, SignalPlate, type HorizonDrive } from './SignalPlate'
import {
  collectShreds,
  easeOutCubic,
  infall,
  localTime,
  progress,
  radiusOf,
  seedOf,
  transformOf,
  wavesOf,
  type ShredSeed,
} from './horizon-physics'

/**
 * The dot that closes the document turns out to have been a mass all along.
 *
 * Press it and it inflates, rises to the middle of the screen, and takes the page apart: every
 * block on screen spirals in, stretching along the line of infall and squeezing across it, and
 * goes out at the photon ring. It holds what it took for three seconds, gives all of it back,
 * and collapses into punctuation again.
 *
 * Nothing is destroyed, and the joke is that this is literally true — the DOM is never touched.
 * The whole effect is `transform` and `opacity` on live elements plus one full-viewport canvas,
 * and every element finishes exactly where it started because it never actually left.
 *
 * Three rules the implementation is built around:
 *
 *  · **Compositor only.** No `filter`, no shadow, no background animation — nothing that forces
 *    paint. Eighty nodes moving on the compositor is free; eighty blurred nodes is a slideshow.
 *    The softness that sells it comes from the canvas underneath, which is already drawing glow.
 *  · **One frame loop, no React per frame.** Everything the shader needs is written to a mutable
 *    drive object; everything the DOM needs is written straight to `style`. React learns about
 *    exactly two state changes per run.
 *  · **Every mutation is recorded.** Abort, unmount, and a mode flip mid-swallow all restore the
 *    page byte for byte, because the only way to be sure a decoration cannot break a document is
 *    to be able to undo it exactly.
 */

/** The beats, in seconds from the press. */
const T_OPEN = 0.6 // the dot inflates and rises
const T_ABSORB_FROM = 0.4
const T_ABSORB_TO = 3.6
const T_HOLD_FROM = 4.0
const T_HOLD_TO = 7.0
const T_EJECT_TO = 9.0
const T_END = 9.35 // the collapse and the ring

/** How much of the swallow window is spent launching shreds, and how long each one flies. */
const WAVE_SPAN = 0.45
const WAVE_FLIGHT = 0.55
/** The return: a tighter stagger and a longer flight, so it comes back faster and lands softly. */
const BACK_SPAN = 0.4
const BACK_FLIGHT = 0.6

/** Where the hold line sits, as a fraction of viewport height below the hole's centre. */
const LINE_DROP = 0.26

/** The reduced-motion path: a crossfade and a hold, no travel at all. */
const R_FADE = 0.4
const R_HOLD_TO = 3.4
const R_END = 3.85

/** The photon ring's final radius, as a fraction of the viewport's shorter side. */
const RING_TARGET = 0.17

interface EventHorizonApi {
  /** Take the page. Ignored if a run is already going or the effect is unavailable. */
  readonly fire: () => void
  /**
   * Build the overlay's WebGL context ahead of time. Called when the foot of the page comes into
   * view, because compiling this shader at the moment of the press would put a hitch exactly
   * where the effect is supposed to start.
   */
  readonly warm: () => void
  readonly active: boolean
  readonly available: boolean
}

const EventHorizonContext = createContext<EventHorizonApi | null>(null)

export function useEventHorizon(): EventHorizonApi {
  return (
    useContext(EventHorizonContext) ?? {
      fire: () => {},
      warm: () => {},
      active: false,
      available: false,
    }
  )
}

/** What one shred needs remembered: the element, its seed, and the styles to put back. */
interface Shred {
  readonly el: HTMLElement
  readonly seed: ShredSeed
  readonly transform: string
  readonly opacity: string
  readonly willChange: string
  readonly pointerEvents: string
}

/**
 * Fixed chrome that lives outside the human view and so cannot be found by walking it. Marked at
 * the source rather than matched by class or position, so anything added to the corners of this
 * page later is swallowed too by adding one attribute.
 */
const OUTSIDE_ROOT = '[data-horizon-eat]'

export function EventHorizonProvider({
  rootRef,
  children,
}: {
  /** The human view's root. Everything inside it on screen is what gets eaten. */
  readonly rootRef: React.RefObject<HTMLElement | null>
  readonly children: React.ReactNode
}) {
  const [available, setAvailable] = useState(false)
  const [warmed, setWarmed] = useState(false)
  const [active, setActive] = useState(false)

  const driveRef = useRef<HorizonDrive>({ rs: 0.002, seatX: 0, seatY: 0, field: 0, strike: 0 })
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const lineRef = useRef<HTMLParagraphElement | null>(null)
  const frameRef = useRef(0)
  const shredsRef = useRef<Shred[]>([])
  /** The root's own inline styles before the run, so they can be put back exactly. */
  const rootStyleRef = useRef<{ position: string; zIndex: string; pointerEvents: string } | null>(
    null,
  )
  const runningRef = useRef(false)

  /**
   * WebGL2, or nothing. Probed here rather than read out of SignalPlate's own `supported` state:
   * that state belongs to the plate at the top of the page, and a feature at the foot of it
   * should not be reaching into another component to find out whether it may exist.
   *
   * There is no degraded rendering on purpose. A button that promises gravity and delivers a
   * grey CSS circle is worse than no button.
   */
  useEffect(() => {
    let ok = false
    try {
      ok = document.createElement('canvas').getContext('webgl2') !== null
    } catch {
      ok = false
    }
    setAvailable(ok)
  }, [])

  const warm = useCallback(() => setWarmed(true), [])

  /** Put the page back exactly as it was found. Safe to call from any phase, or twice. */
  const restore = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
    runningRef.current = false

    for (const shred of shredsRef.current) {
      if (!shred.el.isConnected) continue
      shred.el.style.transform = shred.transform
      shred.el.style.opacity = shred.opacity
      shred.el.style.willChange = shred.willChange
      shred.el.style.pointerEvents = shred.pointerEvents
      shred.el.style.transition = ''
    }
    shredsRef.current = []

    const root = rootRef.current
    const before = rootStyleRef.current
    if (root && before) {
      root.style.position = before.position
      root.style.zIndex = before.zIndex
      root.style.pointerEvents = before.pointerEvents
      root.style.transition = ''
      root.style.opacity = ''
    }
    rootStyleRef.current = null

    const drive = driveRef.current
    drive.field = 0
    drive.rs = 0.002
    overlayRef.current?.setAttribute('hidden', '')
    if (lineRef.current) lineRef.current.style.opacity = '0'

    // The safety net for the sound. The run normally hands the volume back at the eject beat, for
    // the musical timing of it — but an abort has no eject beat, and a mode flip does not even
    // reach this file's own listeners. Ramping to a level it is already at costs nothing, so this
    // is dispatched unconditionally and the music can never be left ducked.
    window.dispatchEvent(new CustomEvent('horizon:duck', { detail: { to: 'restore', ms: 600 } }))

    setActive(false)
  }, [rootRef])

  const fire = useCallback(() => {
    const root = rootRef.current
    const overlay = overlayRef.current
    // The overlay is always mounted by the time this can run. IntersectionObserver delivers an
    // initial callback on observe, so a trigger already near the viewport warms on mount, and one
    // further down warms as it is scrolled toward — and either way the dot has to be on screen
    // and pointed at before it can be pressed, which is thousands of frames of slack.
    if (!root || !overlay || runningRef.current || !available) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const width = window.innerWidth
    const height = window.innerHeight

    // Where the hole starts: the dot that was pressed, which is the last thing on the page and
    // the seed for everything that follows.
    const dot = root.querySelector('[data-horizon-seed]')?.getBoundingClientRect()
    const seedX = dot ? dot.left + dot.width / 2 : width / 2
    const seedY = dot ? dot.top + dot.height / 2 : height * 0.9

    // Plate units: y spans −1..1 across the viewport's height, so one unit is half a screen.
    const unit = height / 2
    const rsMax = (RING_TARGET * Math.min(width, height)) / unit / CAPTURE_RATIO
    const rsMin = 2 / unit / CAPTURE_RATIO

    rootStyleRef.current = {
      position: root.style.position,
      zIndex: root.style.zIndex,
      pointerEvents: root.style.pointerEvents,
    }
    // The root is lifted above the overlay so the page winds in *front* of the disk, and it stops
    // taking clicks so nothing can be activated while it is in flight.
    root.style.position = 'relative'
    root.style.zIndex = '1'
    root.style.pointerEvents = 'none'

    const drive = driveRef.current
    drive.field = 0
    runningRef.current = true
    overlay.removeAttribute('hidden')
    setActive(true)
    window.dispatchEvent(new CustomEvent('horizon:duck', { detail: { to: 'duck', ms: 1200 } }))

    // The fixed chrome, which no walk of the human view could reach.
    const outside = Array.from(document.querySelectorAll<HTMLElement>(OUTSIDE_ROOT))
    const remember = (el: HTMLElement, seed: ShredSeed): Shred => ({
      el,
      seed,
      transform: el.style.transform,
      opacity: el.style.opacity,
      willChange: el.style.willChange,
      pointerEvents: el.style.pointerEvents,
    })

    // Reduced motion: no travel, no spin, no scroll lock. The hole opens at full size, the page
    // crossfades out and back, and the joke survives without a vestibular trigger in it.
    if (reduced) {
      drive.seatX = 0
      drive.seatY = 0
      drive.rs = rsMax
      // Recorded even though they are never transformed, so the one restore path puts their
      // inline styles back whichever way this run ends.
      shredsRef.current = outside.map((el) => remember(el, { r0: 1, a0: 0, wave: 0 }))
      const fading = [root, ...outside]
      for (const el of fading) {
        el.style.transition = `opacity ${R_FADE * 1000}ms linear`
        el.style.opacity = '0'
        el.style.pointerEvents = 'none'
      }
      const startedAt = performance.now()
      const tick = (now: number) => {
        const t = (now - startedAt) / 1000
        if (lineRef.current) {
          lineRef.current.style.opacity = String(
            progress(t, R_FADE, R_FADE + 0.4) * (1 - progress(t, R_HOLD_TO - 0.4, R_HOLD_TO)),
          )
        }
        if (t >= R_HOLD_TO && root.style.opacity === '0') {
          for (const el of fading) el.style.opacity = '1'
        }
        if (t >= R_END) {
          window.dispatchEvent(
            new CustomEvent('horizon:duck', { detail: { to: 'restore', ms: 900 } }),
          )
          restore()
          return
        }
        frameRef.current = requestAnimationFrame(tick)
      }
      frameRef.current = requestAnimationFrame(tick)
      return
    }

    // One layout read for the whole run: collect the elements, then their boxes, then never
    // measure again. Everything after this is writes.
    const elements = [...collectShreds(root, height), ...outside]
    const rects = elements.map((el) => el.getBoundingClientRect())
    const polar = rects.map((rect) => seedOf(rect, seedX, seedY))
    const waves = wavesOf(polar.map((s) => s.r0))

    shredsRef.current = elements.map((el, i) =>
      remember(el, { r0: polar[i]!.r0, a0: polar[i]!.a0, wave: waves[i]! }),
    )
    for (const shred of shredsRef.current) {
      shred.el.style.willChange = 'transform, opacity'
      // Per element as well as on the root: the fixed chrome is not inside the root, so the
      // root's own pointer-events would not cover it, and a mode toggle that is halfway into a
      // black hole must not still be clickable.
      shred.el.style.pointerEvents = 'none'
    }

    const shreds = shredsRef.current
    const startedAt = performance.now()
    let rang = false

    const tick = (now: number) => {
      const t = (now - startedAt) / 1000

      // The hole's travel and its size share one factor: out of the dot on the way in, back into
      // it at the end. Zero at both ends of the run, one through the middle of it.
      const openness = easeOutCubic(progress(t, 0, T_OPEN)) * (1 - easeOutCubic(progress(t, T_EJECT_TO, T_END)))
      const holeX = seedX + (width / 2 - seedX) * openness
      const holeY = seedY + (height / 2 - seedY) * openness

      const swallow = progress(t, T_ABSORB_FROM, T_ABSORB_TO)
      const giveBack = progress(t, T_HOLD_TO, T_EJECT_TO)

      // Two passes, because the hole's radius depends on how much it has eaten and the shreds'
      // fade depends on the radius. Cheap: the first pass is arithmetic on numbers already in
      // registers, and it touches no DOM.
      let fed = 0
      const us = new Array<number>(shreds.length)
      for (let i = 0; i < shreds.length; i++) {
        const wave = shreds[i]!.seed.wave
        const u =
          giveBack > 0
            ? 1 - easeOutCubic(localTime(giveBack, 1 - wave, BACK_SPAN, BACK_FLIGHT))
            : localTime(swallow, wave, WAVE_SPAN, WAVE_FLIGHT)
        us[i] = u
        if (u >= 0.999) fed++
      }
      fed = shreds.length > 0 ? fed / shreds.length : 1

      const rs = radiusOf(rsMin, rsMax, openness, fed)
      drive.rs = rs
      drive.seatX = (holeX / width - 0.5) * (width / height) * 2
      drive.seatY = (0.5 - holeY / height) * 2

      const ringPx = rs * CAPTURE_RATIO * unit
      for (let i = 0; i < shreds.length; i++) {
        const shred = shreds[i]!
        // React may already have unmounted the human view under us — a mode flip does exactly
        // that — and writing to a detached node is a leak rather than an error.
        if (!shred.el.isConnected) continue
        const frame = infall(shred.seed, us[i]!, ringPx)
        shred.el.style.transform = transformOf(frame)
        shred.el.style.opacity = String(frame.alpha)
      }

      if (lineRef.current) {
        lineRef.current.style.opacity = String(
          progress(t, T_HOLD_FROM + 0.4, T_HOLD_FROM + 1.0) *
            (1 - progress(t, T_HOLD_TO - 0.5, T_HOLD_TO)),
        )
      }

      if (!rang && t >= T_EJECT_TO) {
        rang = true
        drive.strike += 1
        window.dispatchEvent(new CustomEvent('horizon:duck', { detail: { to: 'restore', ms: 900 } }))
      }

      if (t >= T_END) {
        restore()
        return
      }
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [available, restore, rootRef])

  /**
   * Nothing scrolls while the page is being eaten, and nothing but Esc interrupts.
   *
   * `m` is handled by letting it through: PortfolioDocument's own listener flips the mode, which
   * unmounts the human view, which unmounts this provider — and the cleanup below restores
   * everything on the way out. So the mode key aborts correctly without this file knowing that
   * the mode key exists.
   */
  useEffect(() => {
    if (!active) return

    const block = (event: Event) => event.preventDefault()
    const SCROLL_KEYS = new Set([
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'PageUp',
      'PageDown',
      'Home',
      'End',
      ' ',
    ])
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        restore()
        window.dispatchEvent(new CustomEvent('horizon:duck', { detail: { to: 'restore', ms: 400 } }))
        return
      }
      if (SCROLL_KEYS.has(event.key)) event.preventDefault()
    }

    // A viewport that changes shape mid-run — an orientation flip, a keyboard opening — has moved
    // the layout every seed was measured against. Abort rather than animate against a lie.
    const startWidth = window.innerWidth
    const startHeight = window.innerHeight
    const onResize = () => {
      const dw = Math.abs(window.innerWidth - startWidth) / startWidth
      const dh = Math.abs(window.innerHeight - startHeight) / startHeight
      if (dw > 0.25 || dh > 0.25) restore()
    }

    window.addEventListener('wheel', block, { passive: false, capture: true })
    window.addEventListener('touchmove', block, { passive: false, capture: true })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('wheel', block, { capture: true })
      window.removeEventListener('touchmove', block, { capture: true })
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [active, restore])

  // Unmount mid-swallow — a route change, a mode flip — must not leave a document locked,
  // transformed, or half transparent.
  useEffect(() => () => restore(), [restore])

  const api = useMemo<EventHorizonApi>(
    () => ({ fire, warm, active, available }),
    [fire, warm, active, available],
  )

  return (
    <EventHorizonContext.Provider value={api}>
      {children}
      {/*
        The hole's own layer: fixed to the viewport, behind the page — the root is lifted to z-1
        for the duration — and painted in the page's own ground so it covers the document rather
        than letting it show through. `hidden` while idle, which is also what keeps the canvas
        paused: SignalPlate stops its own frame loop when its IntersectionObserver reports the
        canvas out of view, and a display:none canvas is never in view.
      */}
      {available && warmed && (
        <div
          ref={overlayRef}
          hidden
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 bg-background"
        >
          <SignalPlate variant="horizon" drive={driveRef} />
          {/*
            The one line of type on an empty screen. Hawking's concession, and also a description
            of the implementation: the document is untouched and all of it is coming back.
          */}
          <p
            ref={lineRef}
            style={{ opacity: 0, top: `calc(50% + ${LINE_DROP * 100}vh)` }}
            className="field-label absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center text-muted-foreground"
          >
            No information is destroyed
          </p>
        </div>
      )}
    </EventHorizonContext.Provider>
  )
}

/**
 * The trigger: the dot that closes the document, and the only imperative on a page that
 * otherwise never tells anyone to do anything.
 *
 * Hairlines retract into the dot while the run is going, so the punctuation visibly becomes the
 * object. The caption sits at 40% permanently rather than only on hover — there is no hover on a
 * phone, and a control nobody can find is a control that does not exist.
 */
export function HorizonTrigger() {
  const { fire, warm, active, available } = useEventHorizon()
  const hostRef = useRef<HTMLDivElement | null>(null)

  // Warm the shader when the foot of the page comes near. Generous margin: this is the one thing
  // that must already be done by the time anyone can press the dot.
  useEffect(() => {
    const host = hostRef.current
    if (!host || !available) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          warm()
          observer.disconnect()
        }
      },
      { rootMargin: '600px' },
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [available, warm])

  if (!available) {
    return (
      <div className="mt-[var(--space-section)] flex items-center justify-center gap-4">
        <span aria-hidden className="rule-fade-r h-px w-[clamp(3rem,12vw,9rem)]" />
        <span aria-hidden className="size-1 rounded-full bg-muted-foreground/60" />
        <span aria-hidden className="rule-fade-l h-px w-[clamp(3rem,12vw,9rem)]" />
      </div>
    )
  }

  return (
    <div ref={hostRef} className="mt-[var(--space-section)]">
      <div className="flex items-center justify-center gap-4">
        <span
          aria-hidden
          className={`rule-fade-r h-px w-[clamp(3rem,12vw,9rem)] origin-right transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            active ? 'scale-x-0' : 'scale-x-100'
          }`}
        />
        <button
          type="button"
          onClick={fire}
          onPointerEnter={warm}
          onFocus={warm}
          disabled={active}
          // The caption is a joke; this is the description, and it is the only name a screen
          // reader gets for a control whose entire output is visual.
          aria-label="Collapse the page into the black hole"
          className="group grid size-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          <span
            data-horizon-seed
            aria-hidden
            className={`block size-1 rounded-full bg-muted-foreground/60 transition-all duration-300 group-hover:bg-foreground group-hover:ring-1 group-hover:ring-border group-hover:ring-offset-4 group-hover:ring-offset-background group-focus-visible:bg-foreground ${
              active ? 'opacity-0' : ''
            }`}
          />
        </button>
        <span
          aria-hidden
          className={`rule-fade-l h-px w-[clamp(3rem,12vw,9rem)] origin-left transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            active ? 'scale-x-0' : 'scale-x-100'
          }`}
        />
      </div>
      <p
        aria-hidden
        className={`field-label mt-4 text-center transition-opacity duration-300 ${
          active ? 'opacity-0' : 'text-muted-foreground/40'
        }`}
      >
        Do not press
      </p>
    </div>
  )
}
