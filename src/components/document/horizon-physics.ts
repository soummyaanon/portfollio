/**
 * The geometry of an infall, and nothing else.
 *
 * No DOM writes, no React, no imports. Everything here is a pure function of numbers, which
 * is deliberate: the choreography in EventHorizon is hard to inspect while it is running —
 * nine seconds, eighty elements, sixty frames a second — so the part that decides *where
 * things go* is kept somewhere it can be read, argued with, and eventually tested, apart from
 * the part that decides *when*.
 *
 * The laws are the plate's own, not new ones invented for the page:
 *
 *  · the observed infall *freezes* at the ring rather than accelerating through it — the same
 *    thing the plate already shows twice, in the star stream hanging on the Shapiro term and in
 *    the doomed pulsars creeping to a halt where they run out of light (see FREEZE below);
 *  · the wind is Keplerian, dθ/dt ∝ r^(−3/2), so the page turns at the rate of the disk lanes
 *    it is falling into rather than at a rate chosen to look about right;
 *  · the tide is the 1/r³ law at the coefficient the plate uses on its own cursor, and it
 *    squeezes across the infall line by the square root of the stretch along it;
 *  · a shred is eaten leading-edge first (the melt), and the residual fade is the Schwarzschild
 *    factor every other doomed object on this page goes out on, reaching exactly zero at the
 *    photon ring — nothing is ever drawn inside the shadow, because a distant observer never
 *    does see anything cross.
 */

/** Where a shred started, in polar coordinates about the hole. Viewport pixels, y down. */
export interface ShredSeed {
  /**
   * The TAIL's distance from the hole at the moment of the press — the far edge, not the
   * centre. The whole model is anchored there: the tail is what stays put while the head is
   * stretched toward the hole, and the tail is what the translate moves when the pull begins.
   */
  readonly r0: number
  /** Bearing from the hole's centre at the moment of the press, radians. */
  readonly a0: number
  /** Launch order, 0 for the first section taken and 1 for the last. */
  readonly wave: number
  /** The element's extent along the infall line, px — how much of it there is to stretch. */
  readonly len: number
  /**
   * This shred's own stretch ceiling. A section is hundreds of pixels long where the cursor
   * glyph was 0.095 plate units, so one global cap would either do nothing to a paragraph or
   * raster a five-screen filament for a section: the caller sets it per shred from the
   * element's length, so every section's reach comes out at roughly the same absolute size.
   */
  readonly sMax: number
}

/**
 * One shred's state on one frame. Offsets are deltas from where the element already sits, and
 * the transform they describe is taken about the element's TAIL — the caller sets
 * `transform-origin` to the point of the element furthest from the hole, which is what makes a
 * growing stretch read as the head reaching toward the hole while the tail stays put, rather
 * than the element inflating in place.
 */
export interface InfallFrame {
  readonly dx: number
  readonly dy: number
  /** The axis of the stretch, radians — the line to the hole. */
  readonly theta: number
  /** Scale along that axis. */
  readonly stretch: number
  /** Scale across it. */
  readonly across: number
  readonly alpha: number
  /**
   * How much of the shred has gone through, 0..1 — the melt. Quantised, because acting on it
   * means repainting the element and a repaint per frame per shred is not affordable.
   */
  readonly melt: number
}

/**
 * How hard the page winds as it falls. Small, because the term it multiplies runs away: at
 * six percent of the starting radius the Keplerian factor is already 68, so 0.085 buys about
 * five sixths of a turn on the last stretch and nothing at all out at the start.
 */
const WIND = 0.085
/** Two turns, and no shred may exceed it however deep the term goes. */
const WIND_CAP = 6.0
/**
 * The tide, taken off the law rather than off a curve — and it is the same law, with the same
 * coefficient, that SignalPlate already uses to stretch the cursor it absorbs.
 *
 * A tidal force is the *difference* in gravity across a body, so it goes as 1/r³. That is the
 * entire character of the effect: nothing at all at a distance, and running away violently in
 * the last stretch. An earlier pass here used `1 + 2.4·(1 − r/r0)²`, which is a shape someone
 * chose rather than a law, and it had two faults. It topped out at 3.4× — the plate stretches
 * the *cursor* by up to 31×, so the page was spaghettifying five times less than a mouse
 * pointer. And being a function of the fraction travelled rather than of distance, it began
 * deforming things the moment they set off, which reads as the page wobbling rather than as
 * something being drawn out by a mass.
 *
 * On the cube law a shred travels its own shape almost all the way in and then smears.
 */
const TIDE_K = 20
/**
 * The freeze: how hard the observed infall flattens as a shred approaches the ring.
 *
 * The first profile here was the cursor's own accelerating plunge, u^2.2 — and it was the wrong
 * precedent, measurably. An accelerating plunge has its top radial speed exactly at arrival, so
 * a shred from 2000px crossed the entire ~300px melt-and-tide zone at ~2800px/s: every visible
 * consequence of the mass — the smear, the leading edge going through, the hang at the lip —
 * was compressed into the last 50–170ms of a 2.2s flight. The instrumented residence times are
 * in the design doc; a viewer reads that as vanishing, not melting.
 *
 * The right precedent was already on the plate, twice. The star stream "hesitates and hangs"
 * near the shadow on the Shapiro term, and the doomed pulsars creep to a halt exactly where
 * they run out of light — because that is what a distant observer is actually shown: infall
 * *freezes* at a horizon, it does not accelerate through it. So the shred's flight is a
 * smoothstep plunge that lands on a (1−s)³ approach — fast through the empty middle distance,
 * then asymptotically slow across the melt zone, arriving at the ring with zero radial speed.
 * Same residence measured after: ~1s of visible melting per shred instead of ~0.1s.
 */
const FREEZE = 3

/**
 * The stretch: HALF of a shred's flight, spent anchored in place while gravity draws it out.
 *
 * This is the first of the two acts every section plays — stretch, then dissolve — and it is
 * the beat that makes the pull legible as gravity rather than animation. The tail stays
 * exactly where it was; the head is drawn out toward the hole, slowly, as its own event, and
 * the target is not a styling number: the head reaches for the hole's lip itself, however far
 * away that is, stopped only by the shred's raster ceiling. Nothing is eaten during this act —
 * the head is held just outside the ring on purpose, so the dissolve is unmistakably a second
 * thing that happens to an already-stretched body, not a blur of both at once.
 */
const GRAB = 0.5
/** Where the reach stops, in ring radii — just off the lip, so act one eats nothing. */
const REACH_TO = 1.2

/**
 * The melt: how many steps the dissolution is quantised to.
 *
 * A shred does not fade out as a whole — it is *eaten*, leading edge first, so what is left is
 * the tail that has not gone through yet. That is the difference between an element vanishing
 * and an element being swallowed, and it is the only part of this effect that costs paint, which
 * is why it is stepped: eight repaints across a shred's whole crossing rather than sixty a
 * second.
 *
 * The eaten fraction is literal: the share of the shred's drawn length that has crossed inside
 * the photon ring. Nothing is eaten until something has actually crossed. An earlier version
 * keyed the melt on how far the head had swept through a fixed neighbourhood of the hole, and
 * on a long section that finished the entire sweep during the grab — the whole section read as
 * consumed while its tail was still anchored to the page, seven hundred pixels out.
 */
/**
 * 32, not 8 — the dissolve must read as continuous. Eight steps was budgeted for a hundred and
 * sixty row-sized shreds and it showed at section scale: a dissolve lasting most of a second
 * advanced in eight visible bites, and the swallow read as things stepping through the hole
 * chunk by chunk. At fourteen section-sized shreds, thirty-two steps is ~450 small repaints
 * across the whole run — nothing — and the mask sweep is smooth to the eye.
 */
const MELT_STEPS = 32
/** How soft the eaten edge is, as a percentage of the shred's own length along the infall line. */
const MELT_SOFT = 46

/**
 * Distance and bearing from the hole to a point.
 *
 * Plain numbers rather than a DOMRect, because the caller works in two different frames and this
 * module should not have to know which: shreds in the flow are seeded in *document* coordinates,
 * so the arithmetic is immune to the page scrolling underneath them, while fixed chrome is seeded
 * in *viewport* coordinates against the hole's live on-screen position, because that is the frame
 * a fixed element actually lives in.
 */
export function seedOf(
  x: number,
  y: number,
  holeX: number,
  holeY: number,
): { r0: number; a0: number } {
  const dx = x - holeX
  const dy = y - holeY
  return { r0: Math.hypot(dx, dy), a0: Math.atan2(dy, dx) }
}

/**
 * Launch order by RANK, not by distance ratio: the nearest section is wave 0, the furthest is
 * wave 1, and everything between is evenly spaced whatever the actual distances are.
 *
 * This is what makes the swallow sequential. Normalising by distance bunched the launches —
 * everything in the top half of the document left within the first half of the window and the
 * pull read as a scatter. Ranked, the hole takes the page one section at a time, in order,
 * however the sections happen to be spaced. Equal distances share a rank, so a pair of columns
 * side by side still goes together.
 */
export function wavesOf(distances: readonly number[]): number[] {
  const sorted = [...new Set(distances)].sort((a, b) => a - b)
  if (sorted.length <= 1) return distances.map(() => 0)
  const rank = new Map(sorted.map((d, i) => [d, i / (sorted.length - 1)]))
  return distances.map((d) => rank.get(d)!)
}

/**
 * A shred's own clock. The global progress `g` runs 0..1 across the whole swallow; a shred
 * waits out its wave, then flies for `flight` of the window. `span + flight` is 1 by
 * construction, so the furthest shred lands exactly as the swallow ends.
 */
export function localTime(g: number, wave: number, span: number, flight: number): number {
  return clamp((g - wave * span) / flight, 0, 1)
}

/**
 * The infall itself. `u` is the shred's own progress, 0 at rest and 1 consumed; `ringR` is
 * the photon ring's current radius in pixels, which grows as the hole eats.
 *
 * A shred's flight is two acts of equal weight, and the caller must anchor `transform-origin`
 * at the tail for either of them to read:
 *
 *  1. **The stretch** (u ∈ [0, GRAB]): nothing translates and nothing is eaten. The hole takes
 *     hold and slowly draws the head out toward its own lip — however far away that is, capped
 *     only by the raster ceiling — the body narrowing by the square root, the tail pinned.
 *  2. **The dissolve** (u ∈ [GRAB, 1]): the tail lets go and rides the freeze profile down to
 *     the ring — fast through the empty middle distance, asymptotically slow at the lip —
 *     while the already-stretched body is consumed continuously from the head back.
 */
export function infall(seed: ShredSeed, u: number, ringR: number): InfallFrame {
  // Both radii are floored before anything divides by them, and both floors are load-bearing
  // rather than defensive habit: a shred genuinely can start with its tail at distance 0 (the
  // pressed dot is on the page too), and unfloored that is 0/0 through the wind term and
  // `translate(NaNpx, NaNpx)` in the browser — which drops the property, leaving one element
  // standing untouched in the middle of a page that is being eaten.
  const r0 = Math.max(seed.r0, Math.max(ringR, 1e-6))
  const ring = Math.max(ringR, 1e-6)

  const uc = clamp(u, 0, 1)

  // Act one: the stretch. The head reaches for the lip of the hole itself — the scale that
  // puts the leading edge at REACH_TO ring radii, clamped by the shred's raster ceiling —
  // eased so the reach starts gently and arrives settled. For a distant section this is the
  // whole drama: a body drawn out across the page toward a hole screens away.
  const g = Math.min(uc / GRAB, 1)
  const reachTarget = clamp((r0 - REACH_TO * ring) / Math.max(seed.len, 1e-6), 1, seed.sMax)
  const reach = 1 + (reachTarget - 1) * (g * g * (3 - 2 * g))

  // Act two: the dissolve. Its own clock eases in and out, and the TAIL rides (1−s)³ down to
  // the ring — not to the centre. A gentle release, a fast fall, and a long asymptotic hang at
  // the lip with radial speed reaching zero exactly at the ring: the distant observer's
  // freeze, which is what the plate already shows in its star stream and its doomed pulsars.
  // The already-stretched body streams in head first, and the melt below consumes it
  // continuously from the moment the head crosses the ring.
  const v = clamp((uc - GRAB) / (1 - GRAB), 0, 1)
  const s = v * v * (3 - 2 * v)
  const tailR = ring + (r0 - ring) * Math.pow(1 - s, FREEZE)

  // Keplerian wind, on the tail. Zero through the whole grab (tailR = r0 there), so nothing
  // swirls until it is actually travelling.
  const q = r0 / Math.max(tailR, r0 * 0.06)
  const theta = seed.a0 + Math.min(WIND * (Math.pow(q, 1.5) - 1), WIND_CAP)

  // Spaghettification, on the cube law, keyed on the tail and capped by the shred's own
  // ceiling. The grab hands over to the tide smoothly because max() takes whichever is larger:
  // far out the reach wins, close in the tide runs past it.
  const tide = ring / Math.max(tailR, ring * 0.42)
  const stretch = Math.min(Math.max(reach, 1 + TIDE_K * tide * tide * tide), seed.sMax)
  const across = 1 / Math.sqrt(stretch)

  // Where the stretched head actually is: the tail's distance minus the shred's whole drawn
  // length. With the tail anchored, the head crosses the ring long before the rest of it.
  const headR = Math.max(tailR - stretch * seed.len, 0)

  // The melt: the share of the drawn length that is inside the ring, floored to steps
  // (rounding promoted the last bite early — a third of the hang played out already eaten).
  // Zero until the head has genuinely crossed; exactly one when the tail arrives at the ring,
  // which is also the radius where the alpha below reaches zero — both endings land on the
  // same frame. Monotone by construction: the numerator only grows and the drawn length only
  // grows, and the one case that shrinks the denominator (the tide capping out while the tail
  // still falls) shrinks it toward the numerator.
  // Gated to zero before launch as well: an element at rest is at rest, even if the hole has
  // grown far enough that its near edge technically pokes inside the ring.
  const drawn = Math.max(tailR - headR, 1e-6)
  const raw = uc <= 0 || headR >= ring ? 0 : clamp((ring - headR) / drawn, 0, 1)
  const melt = Math.min(Math.floor(raw * MELT_STEPS + 1e-9) / MELT_STEPS, 1)

  // The overall fade is the same factor as every other thing this hole has taken, keyed on the
  // tail — the last part of the shred left — and deliberately the slower of the two: the melt
  // does the work of making a shred vanish, and this only makes sure nothing is ever left drawn
  // inside the shadow. It reaches zero exactly as the tail reaches the ring, which is also the
  // radius where the tail melt term completes: both endings land on the same frame.
  const alpha = Math.sqrt(Math.sqrt(Math.max(1 - ring / Math.max(tailR, ring), 0)))

  return {
    dx: Math.cos(theta) * tailR - Math.cos(seed.a0) * r0,
    dy: Math.sin(theta) * tailR - Math.sin(seed.a0) * r0,
    theta,
    stretch,
    across,
    alpha,
    melt,
  }
}

/**
 * The mask that eats a shred, as a CSS gradient across its own box.
 *
 * The gradient line runs *away* from the hole, so its first stop is the leading edge — the part
 * that goes through first. As `melt` climbs, the transparent stop sweeps along the element and
 * the shred is consumed head first, leaving a tail that thins and stretches behind it.
 *
 * The stops start off the near end at `−MELT_SOFT` so that `melt = 0` is a fully opaque element
 * rather than one that is already a third eaten, and they run past 100% so that `melt = 1` is
 * fully gone. Returns an empty string when there is nothing to mask, which is the caller's cue
 * to remove the property rather than set an inert one — a mask is a paint, even a no-op one.
 *
 * CSS gradient angles are clockwise from "up"; the bearing here is the usual atan2 from +x with
 * y pointing down the screen. Hence the +90.
 */
export function maskOf(bearing: number, melt: number): string {
  if (melt <= 0) return ''
  const angle = (bearing * 180) / Math.PI + 90
  const eaten = melt * (100 + MELT_SOFT)
  return `linear-gradient(${angle.toFixed(1)}deg, transparent ${(eaten - MELT_SOFT).toFixed(1)}%, #000 ${eaten.toFixed(1)}%)`
}

/**
 * Rotate into the infall line, scale, rotate back, then translate — which is what makes the
 * stretch follow the line to the hole instead of the element's own axes.
 */
export function transformOf(frame: InfallFrame): string {
  return (
    `translate(${frame.dx.toFixed(2)}px, ${frame.dy.toFixed(2)}px) ` +
    `rotate(${frame.theta.toFixed(4)}rad) ` +
    `scale(${frame.stretch.toFixed(4)}, ${frame.across.toFixed(4)}) ` +
    `rotate(${(-frame.theta).toFixed(4)}rad)`
  )
}

/** How much bigger the hole is for having eaten `fraction` of the page. */
export function radiusOf(min: number, max: number, opening: number, fed: number): number {
  // Split, so the hole is visibly there before it has eaten anything — but two thirds of its
  // final size is paid for by the page, which is the point of the whole routine.
  return min + (max - min) * (0.35 * easeOutCubic(opening) + 0.65 * clamp(fed, 0, 1))
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3)
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

/** Linear map of `t` from one range onto 0..1, clamped at both ends. */
export function progress(t: number, from: number, to: number): number {
  return clamp((t - from) / (to - from), 0, 1)
}

/** A backstop, far above what a section-grained walk of this page produces. */
const MAX_SHREDS = 64

/**
 * The elements the hole will take: the whole document, at the granularity of a SECTION.
 *
 * The pull is sequential — the hole takes the page one piece at a time — so a piece has to be
 * big enough to be worth a beat of the sequence. Descend from the root; an element is a shred
 * when it has no element children of its own or when it fits within `leafHeight` (a viewport's
 * worth), and otherwise the walk goes inside it. Whole sections come out as single shreds;
 * only something taller than a screen — the projects catalogue — is split into its natural
 * children. There is still no `data-shred` attribute anywhere: the set falls out of the layout.
 *
 * `skip` is the attractor's own subtree: the hole cannot eat itself, and the audio control rides
 * along inside the plate's box because the music has to keep playing while the page goes.
 */
export function collectShreds(root: Element, skip: string, leafHeight: number): HTMLElement[] {
  const found: HTMLElement[] = []
  visit(root)
  return found

  function visit(node: Element) {
    for (const child of Array.from(node.children)) {
      if (found.length >= MAX_SHREDS) return
      if (!(child instanceof HTMLElement)) continue
      // `hidden` only. `aria-hidden` is not a visibility flag — most of the hairlines, dots
      // and rules on this page carry it precisely because they are decoration, and decoration
      // is exactly what a hole eating the page must not leave floating behind.
      if (child.hidden) continue
      // This *is* the attractor. Skip the whole subtree — descending would make the hole's own
      // canvas a shred and fly it into itself, and would take the audio control down with it.
      if (child.matches(skip)) continue
      // The attractor is somewhere inside. Do not take this element, but keep looking: the
      // masthead holds both the plate and the name, and the name is prey.
      if (child.querySelector(skip)) {
        visit(child)
        continue
      }

      const rect = child.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue

      if (child.children.length === 0 || rect.height <= leafHeight) found.push(child)
      else visit(child)
    }
  }
}
