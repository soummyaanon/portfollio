'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { CAPTURE_RATIO, PLATE_RS, type HorizonDrive } from './SignalPlate'
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
 * The hole at the top of the page eats the page.
 *
 * Press the dot that closes the document and the whole thing rides up into the Gargantua in the
 * masthead: scroll climbs to the top while every block in the document spirals into the plate,
 * stretching along the line of infall and squeezing across it, going out at the photon ring. The
 * hole swells on what it swallows. It holds for three seconds, gives all of it back, and rides
 * the visitor back down to the dot they pressed.
 *
 * There is no second black hole and no overlay canvas. The attractor is the plate that has been
 * at the top of this page all along — which is the entire point of pulling upward rather than
 * opening a hole under the visitor's cursor: the object doing the eating is the real one, with
 * its real disk and its real photon ring, and it is already on the page.
 *
 * Nothing is destroyed, and the joke is that this is literally true. The DOM is never touched;
 * the effect is `transform` and `opacity` on live elements plus three numbers handed to a shader
 * that was already running. Every element finishes exactly where it started, and so does the
 * scroll position, because it never actually left.
 *
 * Three rules the implementation is built around:
 *
 *  · **Document space, not viewport space.** The page scrolls while it is being eaten, so every
 *    seed is measured in document coordinates and the scroll animation cannot interfere with the
 *    infall arithmetic. Fixed chrome is the one exception and is handled as one.
 *  · **Compositor only.** No `filter`, no shadow, no background animation — nothing that forces
 *    paint. The softness comes from the plate's own analytic glow, which is already being drawn.
 *  · **Every mutation is recorded.** Abort, unmount, and a mode flip mid-swallow all restore the
 *    page byte for byte, including the scroll position and `html`'s own scroll behaviour.
 */

/** The beats, in seconds from the press. */
const T_RIDE = 1.4 // scroll climbs to the top
const T_ABSORB_FROM = 0.4
const T_ABSORB_TO = 4.4
const T_HOLD_FROM = 4.8
const T_HOLD_TO = 7.8
const T_EJECT_TO = 9.8
const T_END = 10.2 // the ring, and the hole settling back to its own size

/** How much of the swallow window is spent launching shreds, and how long each one flies. */
const WAVE_SPAN = 0.45
const WAVE_FLIGHT = 0.55
/** The return: a tighter stagger and a longer flight, so it comes back faster and lands softly. */
const BACK_SPAN = 0.4
const BACK_FLIGHT = 0.6

/** Where the hold line sits, as a fraction of viewport height below the hole. */
const LINE_DROP = 0.22

/** The reduced-motion path: a crossfade and a hold, no travel and no scrolling at all. */
const R_FADE = 0.4
const R_HOLD_TO = 3.4
const R_END = 3.85

/**
 * How fat the hole gets. The plate's resting rs is 0.075 and the disk runs out to 9 rs, so this
 * is a hole roughly three and a half times its own width across — big enough to be plainly
 * feeding, small enough that the disk's outer edge stays inside the plate's box and the whole
 * thing does not turn into an amber wash.
 */
const RS_FED = PLATE_RS * 3.4
/**
 * What is left of the sky once the hole is fully fed: nothing. It takes the field's light along
 * with the document, which is also what lets the shader skip the entire ambient half on the
 * heaviest frames of the run — see the uField note in the GLSL.
 */
const FIELD_FED = 0

/** The attractor's own subtree, which must never be eaten. */
const HOLE = '[data-horizon-hole]'
/**
 * Fixed chrome that lives outside the human view and so cannot be found by walking it. Marked at
 * the source rather than matched by class or position, so anything added to the corners of this
 * page later is swallowed too by adding one attribute.
 */
const OUTSIDE_ROOT = '[data-horizon-eat]'

interface EventHorizonApi {
  /** Take the page. Ignored if a run is already going or the effect is unavailable. */
  readonly fire: () => void
  readonly active: boolean
  readonly available: boolean
}

const EventHorizonContext = createContext<EventHorizonApi | null>(null)

export function useEventHorizon(): EventHorizonApi {
  return (
    useContext(EventHorizonContext) ?? { fire: () => {}, active: false, available: false }
  )
}

/** What one shred needs remembered: where it started, and the styles to put back. */
interface Shred {
  readonly el: HTMLElement
  readonly seed: ShredSeed
  /**
   * Fixed elements do not move with the document, so their seed is meaningless in document space
   * and is recomputed against the hole's live viewport position every frame instead.
   */
  readonly fixed: boolean
  /** Viewport-space centre at the moment of the press — fixed elements only. */
  readonly vx: number
  readonly vy: number
  readonly transform: string
  readonly opacity: string
  readonly willChange: string
  readonly pointerEvents: string
}

export function EventHorizonProvider({
  rootRef,
  driveRef,
  children,
}: {
  /** The human view's root. Everything inside it is what gets eaten. */
  readonly rootRef: React.RefObject<HTMLElement | null>
  /** Shared with the masthead plate, which is the hole doing the eating. */
  readonly driveRef: React.RefObject<HorizonDrive>
  readonly children: React.ReactNode
}) {
  const [available, setAvailable] = useState(false)
  const [active, setActive] = useState(false)

  const lineRef = useRef<HTMLParagraphElement | null>(null)
  const frameRef = useRef(0)
  const shredsRef = useRef<Shred[]>([])
  const rootStyleRef = useRef<{ pointerEvents: string } | null>(null)
  /** `html`'s own scroll-behavior, which is `smooth` on this site and has to be suspended. */
  const scrollBehaviourRef = useRef<string | null>(null)
  const runningRef = useRef(false)

  /**
   * WebGL2, or no trigger. Probed here rather than read out of SignalPlate's own `supported`
   * state: that state is private to the plate, and a feature at the foot of the page should not
   * reach into another component to find out whether it may exist.
   *
   * There is no degraded rendering on purpose. Without the plate there is no hole to pull toward,
   * and a button that promises gravity and delivers a scroll-to-top is worse than no button.
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
    if (root && rootStyleRef.current) {
      root.style.pointerEvents = rootStyleRef.current.pointerEvents
      root.style.transition = ''
      root.style.opacity = ''
    }
    rootStyleRef.current = null

    if (scrollBehaviourRef.current !== null) {
      document.documentElement.style.scrollBehavior = scrollBehaviourRef.current
      scrollBehaviourRef.current = null
    }

    const drive = driveRef.current
    drive.rs = PLATE_RS
    drive.field = 1
    drive.taking = false
    if (lineRef.current) lineRef.current.style.opacity = '0'

    // The safety net for the sound. The run normally hands the volume back at the eject beat, for
    // the musical timing of it — but an abort has no eject beat, and a mode flip does not even
    // reach this file's own listeners. Ramping to a level it is already at costs nothing, so this
    // is dispatched unconditionally and the music can never be left ducked.
    window.dispatchEvent(new CustomEvent('horizon:duck', { detail: { to: 'restore', ms: 600 } }))

    setActive(false)
  }, [driveRef, rootRef])

  const fire = useCallback(() => {
    const root = rootRef.current
    if (!root || runningRef.current || !available) return

    const hole = root.querySelector(HOLE)
    if (!hole) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const drive = driveRef.current

    runningRef.current = true
    drive.taking = true
    setActive(true)
    window.dispatchEvent(new CustomEvent('horizon:duck', { detail: { to: 'duck', ms: 1200 } }))

    rootStyleRef.current = { pointerEvents: root.style.pointerEvents }
    root.style.pointerEvents = 'none'

    const outside = Array.from(document.querySelectorAll<HTMLElement>(OUTSIDE_ROOT))
    const remember = (
      el: HTMLElement,
      seed: ShredSeed,
      fixed: boolean,
      vx: number,
      vy: number,
    ): Shred => ({
      el,
      seed,
      fixed,
      vx,
      vy,
      transform: el.style.transform,
      opacity: el.style.opacity,
      willChange: el.style.willChange,
      pointerEvents: el.style.pointerEvents,
    })

    // Reduced motion: no travel, no spin, no scrolling, no scroll lock. The hole swells where it
    // stands, the page crossfades out and back, and the joke survives without a vestibular
    // trigger in it. Nothing here moves the viewport — dragging someone to the top of the
    // document is exactly the kind of motion the preference is asking us not to do.
    if (reduced) {
      drive.rs = RS_FED
      drive.field = FIELD_FED
      shredsRef.current = outside.map((el) =>
        remember(el, { r0: 1, a0: 0, wave: 0 }, true, 0, 0),
      )
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
          restore()
          return
        }
        frameRef.current = requestAnimationFrame(tick)
      }
      frameRef.current = requestAnimationFrame(tick)
      return
    }

    // `html { scroll-behavior: smooth }` is set on this site, and it would intercept every one of
    // the per-frame scrollTo calls below — each starting its own easing toward a target that has
    // already moved. The result is a scroll that lags the animation and never arrives. Suspended
    // for the run and put back by restore().
    scrollBehaviourRef.current = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'auto'

    const scrollFrom = window.scrollY

    // One layout read for the whole run: the elements, then their boxes, then never measure
    // again. Everything after this is writes.
    const flow = collectShreds(root, HOLE)
    const holeRect = hole.getBoundingClientRect()
    // Document space, so the arithmetic is untouched by the page scrolling under it. The plate
    // lives near the top of the document, so this is also very nearly its on-screen position once
    // the ride is over — the page ends the climb at scroll 0.
    const holeDocX = holeRect.left + holeRect.width / 2
    const holeDocY = holeRect.top + scrollFrom + holeRect.height / 2

    const flowShreds = flow.map((el) => {
      const rect = el.getBoundingClientRect()
      const seed = seedOf(
        rect.left + rect.width / 2,
        rect.top + scrollFrom + rect.height / 2,
        holeDocX,
        holeDocY,
      )
      return remember(el, { ...seed, wave: 0 }, false, 0, 0)
    })
    // Fixed chrome is seeded from where it will sit relative to the hole once the climb is done,
    // which is what puts it in a sensible place in the wave order. Its actual per-frame geometry
    // is recomputed below, because a pinned element's distance to the hole changes as the page
    // rides up even though the element itself never moves.
    const fixedShreds = outside.map((el) => {
      const rect = el.getBoundingClientRect()
      const vx = rect.left + rect.width / 2
      const vy = rect.top + rect.height / 2
      return remember(el, { ...seedOf(vx, vy, holeDocX, holeDocY), wave: 0 }, true, vx, vy)
    })

    // One wave ordering across both frames, so the fixed chrome takes its turn by distance like
    // everything else rather than going on a schedule of its own.
    const all = [...flowShreds, ...fixedShreds]
    const waves = wavesOf(all.map((s) => s.seed.r0))
    shredsRef.current = all.map((s, i) => ({ ...s, seed: { ...s.seed, wave: waves[i]! } }))

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

      // The ride. Up to the hole over the first beat, and back down to where the visitor pressed
      // as the page is handed back — they end where they started, because the scroll position is
      // part of what "nothing is destroyed" is promising.
      const up = easeOutCubic(progress(t, 0, T_RIDE))
      const down = easeOutCubic(progress(t, T_HOLD_TO, T_EJECT_TO))
      window.scrollTo(0, scrollFrom * (1 - up) + scrollFrom * down)

      const swallow = progress(t, T_ABSORB_FROM, T_ABSORB_TO)
      const giveBack = progress(t, T_HOLD_TO, T_EJECT_TO)

      // Two passes: the hole's size depends on how much it has eaten, and the shreds' fade
      // depends on the hole's size. The first pass touches no DOM.
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

      // The plate's own hole, swelling on what it swallows, and the sky draining with it.
      drive.rs = radiusOf(PLATE_RS, RS_FED, 1, fed)
      drive.field = 1 - (1 - FIELD_FED) * fed

      // The capture radius in pixels, which is what the fade is measured against. The plate is
      // isotropic on its own height, so one plate unit is half the canvas height.
      const ringPx = drive.rs * CAPTURE_RATIO * (holeRect.height / 2)

      for (let i = 0; i < shreds.length; i++) {
        const shred = shreds[i]!
        // React may already have unmounted the human view under us — a mode flip does exactly
        // that — and writing to a detached node is a leak rather than an error.
        if (!shred.el.isConnected) continue
        // A fixed element is pinned to the viewport, so its distance to the hole changes as the
        // page rides up even though nothing about the element moved. Re-seeded per frame against
        // where the hole actually is on screen right now.
        const seed = shred.fixed
          ? {
              ...seedOf(shred.vx, shred.vy, holeDocX, holeDocY - window.scrollY),
              wave: shred.seed.wave,
            }
          : shred.seed
        const frame = infall(seed, us[i]!, ringPx)
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
        window.scrollTo(0, scrollFrom)
        restore()
        return
      }
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [available, driveRef, restore, rootRef])

  /**
   * Nothing the visitor does scrolls the page while the hole is scrolling it, and nothing but Esc
   * interrupts.
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
  // transformed, half transparent, or unable to scroll smoothly ever again.
  useEffect(() => () => restore(), [restore])

  const api = useMemo<EventHorizonApi>(
    () => ({ fire, active, available }),
    [fire, active, available],
  )

  return (
    <EventHorizonContext.Provider value={api}>
      {children}
      {/*
        The one line of type on an empty screen. Hawking's concession, and also a description of
        the implementation: the document is untouched and all of it is coming back.

        A bare fixed line rather than a layer over the page — there is nothing to cover, because
        the content is transparent by then and the plate is drawing the hole itself.
      */}
      {available && (
        <p
          ref={lineRef}
          aria-hidden
          style={{ opacity: 0, top: `${(0.5 + LINE_DROP) * 100}%` }}
          className="field-label pointer-events-none fixed left-1/2 z-40 -translate-x-1/2 whitespace-nowrap text-center text-muted-foreground"
        >
          No information is destroyed
        </p>
      )}
    </EventHorizonContext.Provider>
  )
}

/**
 * The trigger: the dot that closes the document, and the only imperative on a page that
 * otherwise never tells anyone to do anything.
 *
 * Hairlines retract into the dot while the run is going, so the punctuation visibly lets go. The
 * caption sits at 40% permanently rather than only on hover — there is no hover on a phone, and a
 * control nobody can find is a control that does not exist.
 */
export function HorizonTrigger() {
  const { fire, active, available } = useEventHorizon()

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
    <div className="mt-[var(--space-section)]">
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
          disabled={active}
          // The caption is a joke; this is the description, and it is the only name a screen
          // reader gets for a control whose entire output is visual.
          aria-label="Pull the page into the black hole"
          className="group grid size-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          <span
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
