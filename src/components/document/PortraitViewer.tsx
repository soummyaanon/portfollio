'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion'

import { PORTRAIT_PATH } from '@/data/profile'

/**
 * The avatar, and the full photo it opens into.
 *
 * Clicking the circle lifts the whole, uncropped photo out of it: the photo starts exactly
 * over the avatar, clipped to its circle and tipped back in depth, then travels to the
 * middle of the screen as the clip opens into a softly rounded rectangle and the tilt
 * settles flat. Open, it leans a few degrees toward the pointer with a faint sheen where
 * the light would catch it. Closing straightens it and shrinks it, flat, back into the circle.
 *
 * The travel is a hand-written FLIP (one element, translate + uniform scale + clip-path)
 * rather than a shared `layoutId`: layout animations measure the element on screen, and a
 * 3D rotation on it or any ancestor skews that measurement. Here nothing is measured but
 * the avatar, once, before anything moves.
 *
 * No chrome, per the rest of the site: no frame, no caption, no visible buttons. It closes
 * on a click anywhere or Esc; a close button exists for keyboard and screen-reader users
 * and only shows when focused. Reduced motion gets a plain fade and no tilt.
 *
 * The full photo (~150 KB) is fetched when someone reaches for the avatar (pointer over or
 * keyboard focus), never on page load.
 */

interface Size {
  readonly width: number
  readonly height: number
}

interface Geometry {
  /** Where the photo sits when open, in viewport pixels. */
  readonly target: { readonly left: number; readonly top: number; readonly width: number; readonly height: number }
  /** The transform and clip that put it exactly over the avatar. */
  readonly fromAvatar: { readonly x: number; readonly y: number; readonly scale: number; readonly clipPath: string }
  readonly openClip: string
}

const EASE = [0.22, 1, 0.36, 1] as const
const OPEN_EASE = [0.16, 1, 0.3, 1] as const
const CLOSE_EASE = [0.4, 0, 0.2, 1] as const
const MAX_TILT = 7
/** The open photo's long edge at most: a close look, not a takeover of the screen. */
const MAX_EDGE = 480

/** Fit the photo inside most of the viewport, keeping its proportions. */
function place(natural: Size, avatar: DOMRect): Geometry {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const fit = Math.min((vw * 0.72) / natural.width, (vh * 0.62) / natural.height, MAX_EDGE / Math.max(natural.width, natural.height))
  const width = Math.round(natural.width * fit)
  const height = Math.round(natural.height * fit)
  const left = (vw - width) / 2
  const top = (vh - height) / 2

  // The avatar shows a centred square of the photo, so the starting clip is that square
  // with fully rounded corners: a circle the size of the photo's short side.
  const side = Math.min(width, height)
  const insetX = (width - side) / 2
  const insetY = (height - side) / 2

  return {
    target: { left, top, width, height },
    fromAvatar: {
      x: avatar.left + avatar.width / 2 - (left + width / 2),
      y: avatar.top + avatar.height / 2 - (top + height / 2),
      scale: avatar.width / side,
      clipPath: `inset(${insetY}px ${insetX}px ${insetY}px ${insetX}px round ${side / 2}px)`,
    },
    openClip: `inset(0px 0px 0px 0px round 14px)`,
  }
}

/**
 * A water surface for the open photo. Two noise fields drift in different directions, like
 * two wave trains crossing, and their sum displaces the image's pixels. The same field lit
 * as a bump map gives the soft highlights light makes on moving water. While `hovered` the
 * surface comes alive within a moment; on leave it calms to still and the loop stops.
 * Runs only while the photo is open (`running`), and never under reduced motion.
 *
 * Each frame writes the filter's attributes directly, not through React state, so the
 * motion costs no re-renders. The filter region overhangs the image by more than the waves
 * travel, so the drifting noise always covers it.
 */
function useLiquid(running: boolean, hovered: boolean, target: React.RefObject<HTMLElement | null>) {
  const id = `liquid-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
  const url = `url(#${id})`
  const waveA = useRef<SVGFEOffsetElement>(null)
  const waveB = useRef<SVGFEOffsetElement>(null)
  const displacement = useRef<SVGFEDisplacementMapElement>(null)
  const shine = useRef<SVGFECompositeElement>(null)
  const hoveredRef = useRef(hovered)
  hoveredRef.current = hovered

  // The loop's state outlives renders: hover toggling must not restart or cut it, so a
  // leave lets it settle on its own and only closing stops it outright.
  const loop = useRef({ frame: 0, level: 0, time: 0, last: 0, active: false })

  useEffect(() => {
    const state = loop.current
    const element = target.current
    if (!running) {
      // Closing: drop the filter at once so the trip home is plain, compositor-only motion.
      cancelAnimationFrame(state.frame)
      state.active = false
      state.level = 0
      if (element) element.style.filter = ''
      return
    }
    if (!hovered || state.active || !element) return

    // The filter is attached only while there is water to show. Left on with nothing to
    // do, it would still be recomputed every frame the photo moves.
    state.active = true
    state.last = performance.now()
    element.style.filter = url

    const tick = (now: number) => {
      const dt = Math.min((now - state.last) / 1000, 0.05)
      state.last = now
      state.time += dt
      const time = state.time
      // Quick to come alive, a little slower to settle, like water.
      const goal = hoveredRef.current ? 1 : 0
      state.level += (goal - state.level) * Math.min(1, dt * (goal ? 9 : 4))
      const level = state.level

      // The two wave trains circle in opposite senses at different speeds, so the
      // pattern never repeats as a simple loop.
      waveA.current?.setAttribute('dx', (Math.sin(time * 1.6) * 38).toFixed(2))
      waveA.current?.setAttribute('dy', (Math.cos(time * 1.6) * 38).toFixed(2))
      waveB.current?.setAttribute('dx', (Math.cos(time * 2.3) * -30).toFixed(2))
      waveB.current?.setAttribute('dy', (Math.sin(time * 2.3) * 30).toFixed(2))
      displacement.current?.setAttribute('scale', (level * 40).toFixed(2))
      shine.current?.setAttribute('k3', (level * 0.32).toFixed(3))

      if (!hoveredRef.current && level < 0.004) {
        // Settled: detach the filter and sleep until the next hover.
        state.level = 0
        state.active = false
        element.style.filter = ''
        return
      }
      state.frame = requestAnimationFrame(tick)
    }
    state.frame = requestAnimationFrame(tick)
  }, [running, hovered, target, url])

  useEffect(() => () => cancelAnimationFrame(loop.current.frame), [])

  const filter = (
    <svg aria-hidden width="0" height="0" className="absolute">
      <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.011 0.019" numOctaves={3} seed={7} result="noiseA" />
        <feOffset ref={waveA} in="noiseA" dx="0" dy="0" result="waveA" />
        <feTurbulence type="fractalNoise" baseFrequency="0.021 0.012" numOctaves={2} seed={23} result="noiseB" />
        <feOffset ref={waveB} in="noiseB" dx="0" dy="0" result="waveB" />
        <feComposite in="waveA" in2="waveB" operator="arithmetic" k1="0" k2="0.5" k3="0.5" k4="0" result="water" />
        <feDisplacementMap
          ref={displacement}
          in="SourceGraphic"
          in2="water"
          scale="0"
          xChannelSelector="R"
          yChannelSelector="G"
          result="rippled"
        />
        {/* Light on the water: the wave field as a bump map, lit from above-left. */}
        <feGaussianBlur in="water" stdDeviation="1.5" result="smooth" />
        <feSpecularLighting in="smooth" surfaceScale="5" specularConstant="0.9" specularExponent="22" lightingColor="#ffffff" result="glint">
          <feDistantLight azimuth="235" elevation="48" />
        </feSpecularLighting>
        <feComposite in="glint" in2="SourceGraphic" operator="in" result="glintOnPhoto" />
        <feComposite ref={shine} in="rippled" in2="glintOnPhoto" operator="arithmetic" k1="0" k2="1" k3="0" k4="0" />
      </filter>
    </svg>
  )

  return { filter }
}

export function PortraitViewer({
  avatar,
  name,
  openLabel,
  closeLabel,
  className,
}: {
  /** The small square image the circle shows. */
  readonly avatar: string
  readonly name: string
  readonly openLabel: string
  readonly closeLabel: string
  readonly className?: string
}) {
  const reduceMotion = useReducedMotion()
  const trigger = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const [natural, setNatural] = useState<Size | null>(null)
  const [geometry, setGeometry] = useState<Geometry | null>(null)
  const [lifted, setLifted] = useState(false)
  const wantsOpen = useRef(false)
  const [hovered, setHovered] = useState(false)
  // Hover only counts once the photo has landed: it opens under the cursor that clicked
  // the avatar, and water switched on mid-flight would cost frames on the way.
  const [landed, setLanded] = useState(false)
  const portraitImage = useRef<HTMLImageElement>(null)
  const liquid = useLiquid(Boolean(geometry) && !reduceMotion, hovered && landed, portraitImage)

  // Pointer tilt, sprung so it eases rather than tracks the cursor exactly.
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const tiltY = useSpring(useTransform(pointerX, [-1, 1], [-MAX_TILT, MAX_TILT]), { stiffness: 120, damping: 18 })
  const tiltX = useSpring(useTransform(pointerY, [-1, 1], [MAX_TILT, -MAX_TILT]), { stiffness: 120, damping: 18 })
  const sheenX = useTransform(pointerX, [-1, 1], ['20%', '80%'])
  const sheenY = useTransform(pointerY, [-1, 1], ['15%', '85%'])
  const sheen = useMotionTemplate`radial-gradient(circle at ${sheenX} ${sheenY}, rgba(255,255,255,0.14), rgba(255,255,255,0) 55%)`

  const open = useCallback((size: Size) => {
    const rect = trigger.current?.getBoundingClientRect()
    if (!rect) return
    setGeometry(place(size, rect))
    setLifted(true)
  }, [])

  /** Start fetching the full photo; open it once it has arrived if that was asked for. */
  const preload = useCallback(() => {
    if (natural) return
    const image = new window.Image()
    image.src = PORTRAIT_PATH
    // decode(), not just onload: a loaded JPEG is still decoded lazily on first paint, and
    // that 1400px decode landing in the opening frame is a visible hitch.
    image
      .decode()
      .catch(() => undefined)
      .then(() => {
        if (!image.naturalWidth) return
        const size = { width: image.naturalWidth, height: image.naturalHeight }
        setNatural(size)
        if (wantsOpen.current) open(size)
      })
  }, [natural, open])

  const onActivate = () => {
    if (natural) open(natural)
    else {
      wantsOpen.current = true
      preload()
    }
  }

  const close = useCallback(() => {
    wantsOpen.current = false
    // Let go of the pointer lean so the photo straightens as it travels home.
    pointerX.set(0)
    pointerY.set(0)
    setHovered(false)
    setLanded(false)
    setGeometry(null)
  }, [pointerX, pointerY])

  // While open: Esc closes, Tab stays on the dialog's one control, the page underneath
  // does not scroll, and the pointer steers the tilt.
  useEffect(() => {
    if (!geometry) return
    closeButton.current?.focus({ preventScroll: true })
    const root = document.documentElement
    const previousOverflow = root.style.overflow
    root.style.overflow = 'hidden'

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key === 'Tab') {
        event.preventDefault()
        closeButton.current?.focus()
      }
    }
    const onMove = (event: PointerEvent) => {
      pointerX.set((event.clientX / window.innerWidth) * 2 - 1)
      pointerY.set((event.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointermove', onMove)
    return () => {
      root.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointermove', onMove)
    }
  }, [geometry, close, pointerX, pointerY])

  // Every property on one curve and one clock, so position, size, shape and tilt arrive
  // together: mixed springs and tweens finishing at different moments read as a wobble.
  // Opening decelerates hard (fast start, long soft landing); closing is quicker still.
  const opening = reduceMotion ? { duration: 0.16 } : { duration: 0.42, ease: OPEN_EASE }
  const closing = reduceMotion ? { duration: 0.12 } : { duration: 0.28, ease: CLOSE_EASE }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={onActivate}
        onPointerEnter={preload}
        onFocus={preload}
        aria-label={openLabel}
        aria-haspopup="dialog"
        className={`group block cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal ${className ?? ''}`}
      >
        <Image
          src={avatar}
          alt={name}
          width={256}
          height={256}
          className={`h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06] ${lifted ? 'opacity-0' : 'opacity-100'}`}
          sizes="(max-width: 640px) 18vw, 5vw"
          priority
        />
      </button>

      {/* Mounted from the first open until the closing animation ends, never during
          hydration: the server renders no portal, so the first client render must not either. */}
      {lifted &&
        createPortal(
          <AnimatePresence onExitComplete={() => { setLifted(false); setLanded(false); trigger.current?.focus({ preventScroll: true }) }}>
            {geometry && (
              <div key="portrait" role="dialog" aria-modal="true" aria-label={name} className="fixed inset-0 z-[70]">
                <motion.div
                  aria-hidden
                  onClick={close}
                  // A plain dim, no backdrop blur: behind it the hero is a live WebGL scene, and
                  // a blur over that is re-rendered every frame, the main source of jank.
                  className="absolute inset-0 cursor-zoom-out bg-background/90"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: reduceMotion ? 0.12 : 0.3, ease: EASE } }}
                  exit={{ opacity: 0, transition: { duration: reduceMotion ? 0.1 : 0.24, ease: CLOSE_EASE } }}
                />

                {/* The tilt lives on this wrapper, the travel on the frame inside, so the two
                    transforms never fight over one element. */}
                <motion.div
                  className="pointer-events-none absolute"
                  style={{
                    left: geometry.target.left,
                    top: geometry.target.top,
                    width: geometry.target.width,
                    height: geometry.target.height,
                    rotateX: reduceMotion ? 0 : tiltX,
                    rotateY: reduceMotion ? 0 : tiltY,
                    transformPerspective: 1400,
                  }}
                >
                  <motion.div
                    onClick={close}
                    onPointerEnter={() => setHovered(true)}
                    onPointerLeave={() => setHovered(false)}
                    className="pointer-events-auto relative h-full w-full cursor-zoom-out overflow-hidden bg-card will-change-transform"
                    style={{ transformPerspective: 1400 }}
                    initial={
                      reduceMotion
                        ? { opacity: 0, clipPath: geometry.openClip }
                        : { ...geometry.fromAvatar, rotateX: 14, opacity: 1 }
                    }
                    animate={{ x: 0, y: 0, scale: 1, rotateX: 0, opacity: 1, clipPath: geometry.openClip }}
                    exit={
                      reduceMotion
                        ? { opacity: 0, transition: closing }
                        : { ...geometry.fromAvatar, rotateX: 0, transition: closing }
                    }
                    transition={opening}
                    onAnimationComplete={() => {
                      if (geometry) setLanded(true)
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- already sized and served as a static file */}
                    <img
                      ref={portraitImage}
                      src={PORTRAIT_PATH}
                      alt={name}
                      width={geometry.target.width}
                      height={geometry.target.height}
                      // A touch larger while liquid, so displaced edges never pull in the frame's ground.
                      className={`h-full w-full select-none object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${hovered && !reduceMotion ? 'scale-[1.04]' : 'scale-100'}`}
                      draggable={false}
                    />
                    {!reduceMotion && liquid.filter}
                    {/* The cropped avatar fades out over the first moment of travel, so the
                        circle that lifts off is the one that was on the page. */}
                    {!reduceMotion && (
                      <motion.img
                        aria-hidden
                        src={avatar}
                        alt=""
                        className="absolute left-1/2 top-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 object-cover"
                        style={{ width: Math.min(geometry.target.width, geometry.target.height) }}
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0, transition: { duration: 0.2, ease: EASE } }}
                        exit={{ opacity: 1, transition: { duration: 0.2, ease: CLOSE_EASE } }}
                      />
                    )}
                    {!reduceMotion && <motion.div aria-hidden className="absolute inset-0" style={{ backgroundImage: sheen }} />}
                  </motion.div>
                </motion.div>

                {/* Gone the instant closing starts: after Esc it is keyboard-focused, and it
                    should not linger in the corner while the photo travels home. */}
                <motion.button
                  ref={closeButton}
                  type="button"
                  onClick={close}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                  className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:right-6 focus-visible:top-6 focus-visible:rounded-full focus-visible:border focus-visible:border-border focus-visible:bg-background focus-visible:px-4 focus-visible:py-2 focus-visible:text-fine focus-visible:text-foreground"
                >
                  {closeLabel}
                </motion.button>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}
