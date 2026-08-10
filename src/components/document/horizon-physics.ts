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
 *  · the plunge accelerates on u^2.2, the exponent SignalPlate's cursor absorption already uses;
 *  · the wind is Keplerian, dθ/dt ∝ r^(−3/2), so the page turns at the rate of the disk lanes
 *    it is falling into rather than at a rate chosen to look about right;
 *  · the tide stretches along the line of infall and squeezes across it by the square root,
 *    which is the rule the plate states for its own uMarkTide;
 *  · things go out on √(1 − r_ring/r), the Schwarzschild factor every other doomed object on
 *    this page fades on, which reaches exactly zero at the photon ring — so nothing is ever
 *    drawn inside the shadow, because a distant observer never does see anything cross.
 */

/** Where a shred started, in polar coordinates about the hole. Viewport pixels, y down. */
export interface ShredSeed {
  /** Distance from the hole's centre at the moment of the press. */
  readonly r0: number
  /** Bearing from the hole's centre at the moment of the press, radians. */
  readonly a0: number
  /** Launch order, 0 at the nearest shred and 1 at the furthest. */
  readonly wave: number
}

/** One shred's state on one frame. Offsets are deltas from where the element already sits. */
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
}

/**
 * How hard the page winds as it falls. Small, because the term it multiplies runs away: at
 * six percent of the starting radius the Keplerian factor is already 68, so 0.085 buys about
 * five sixths of a turn on the last stretch and nothing at all out at the start.
 */
const WIND = 0.085
/** Two turns, and no shred may exceed it however deep the term goes. */
const WIND_CAP = 6.0
/** Peak stretch along the infall line, reached as the shred arrives. */
const TIDE = 2.4
/** The plunge's acceleration — SignalPlate's own exponent for the same event. */
const PLUNGE = 2.2

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
 * Launch order from distance: nearest first, furthest last, normalised so the waves always
 * span the full window whatever the viewport happens to be.
 *
 * Equal distances get equal waves, so a row of things at the same radius goes together —
 * which is what makes the drain read as working outward rather than as eighty independent
 * departures.
 */
export function wavesOf(distances: readonly number[]): number[] {
  const far = Math.max(...distances, 1)
  return distances.map((d) => Math.min(d / far, 1))
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
 */
export function infall(seed: ShredSeed, u: number, ringR: number): InfallFrame {
  // Both radii are floored before anything divides by them, and both floors are load-bearing
  // rather than defensive habit.
  //
  // A shred can genuinely start with r0 = 0: the dot that is pressed is the seed the hole grows
  // out of, and that dot is itself on screen, so the element nearest the hole is sitting exactly
  // on it. Unfloored, q is 0/0, theta is NaN, and the browser is handed
  // `translate(NaNpx, NaNpx)` — which it drops, leaving one element standing untouched in the
  // middle of a page that is being eaten. Floored, that shred has a defined bearing, stays where
  // it is, stretches, and goes out, which is what a thing sitting on a hole should do.
  const r0 = Math.max(seed.r0, 1e-6)
  const ring = Math.max(ringR, 1e-6)

  const fall = Math.pow(clamp(u, 0, 1), PLUNGE)
  const r = r0 * (1 - fall)

  // Keplerian: the angle swept goes as the integral of r^(−3/2), so the wind is nothing out
  // at the start and runs away at the end. Floored at six percent of the starting radius —
  // below that the shred is already invisible and the term only costs precision.
  const q = r0 / Math.max(r, r0 * 0.06)
  const theta = seed.a0 + Math.min(WIND * (Math.pow(q, 1.5) - 1), WIND_CAP)

  // Spaghettification. Zero at rest, peaking as it arrives; across is the square root, so a
  // shred gets longer and thinner rather than simply larger.
  const stretch = 1 + TIDE * Math.pow(1 - r / r0, 2)
  const across = 1 / Math.sqrt(stretch)

  // The one fade on the page, and it is the same factor as every other thing this hole has
  // taken. It reaches zero at the ring, and r reaches zero at u = 1, so a consumed shred is
  // always fully gone whatever the hole's size is doing.
  const alpha = Math.sqrt(Math.max(1 - ring / Math.max(r, ring), 0))

  return {
    dx: Math.cos(theta) * r - Math.cos(seed.a0) * r0,
    dy: Math.sin(theta) * r - Math.sin(seed.a0) * r0,
    theta,
    stretch,
    across,
    alpha,
  }
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

/**
 * How coarse a shred may be before the walk goes inside it, and how many shreds there may be.
 *
 * The whole document is in scope now rather than one screenful, because the page rides up into
 * the hole as it is eaten — anything left untransformed would scroll into view intact while its
 * neighbours were flying away. So the cap is larger and the leaf threshold does more of the
 * work: distant sections come out as single coarse shreds, near ones as individual rows.
 *
 * On overflow the walk stops recursing rather than dropping what it has not reached, so a long
 * document still swallows completely — just in bigger pieces toward the end.
 */
const LEAF_HEIGHT = 120
const MAX_SHREDS = 160

/**
 * The elements the hole will take: the whole document, at the granularity of a row.
 *
 * Descend from the root; an element is a shred when it has no element children of its own or
 * when it is short enough to read as one thing, and otherwise the walk goes inside it. This is
 * why there is no `data-shred` attribute anywhere in the markup — the set falls out of the
 * layout, so it adapts on its own to whichever disclosures the visitor left open.
 *
 * `skip` is the attractor's own subtree: the hole cannot eat itself, and the audio control rides
 * along inside the plate's box because the music has to keep playing while the page goes.
 */
export function collectShreds(root: Element, skip: string): HTMLElement[] {
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

      if (child.children.length === 0 || rect.height <= LEAF_HEIGHT) found.push(child)
      else visit(child)
    }
  }
}
