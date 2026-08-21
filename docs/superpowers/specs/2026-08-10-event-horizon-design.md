# Event Horizon — Design

**Date:** 2026-08-10
**Branch:** `feature/event-horizon`
**Status:** Approved, revised the same day — see *Revision* below
**Components:** `EventHorizon.tsx` (new), `horizon-physics.ts` (new),
`SignalPlate.tsx`, `HumanView.tsx`, `ModeToggle.tsx`, `AudioToggle.tsx`

## Revision — the hole moved to the top

> The first version of this design opened a **second** black hole at the foot of the page:
> a new full-viewport WebGL overlay, seeded at the Colophon dot and drifting to the centre
> of the screen, with the document held still underneath it.
>
> **Superseded.** There is no overlay. The attractor is the Gargantua that has been in the
> masthead all along, and the page is pulled *up* into it — scroll climbs to the top while
> the document spirals into the real plate, and rides back down to the dot afterwards.
>
> The grounds: a second hole was a second hole. It needed its own WebGL context, its own
> shader warm-up before the press, its own stacking context to sit behind the page, and a
> whole `variant` axis through `SignalPlate` to strip the parts of the plate it should not
> have — while the genuine article, with the real disk and the real photon ring, sat off
> screen a few thousand pixels up. Pulling upward deletes all of that and puts the actual
> object on stage.
>
> What survived unchanged: every law in `horizon-physics.ts`, the trigger and its copy, the
> ~3s hold, the unwinding return, the audio duck, and the reduced-motion crossfade. What
> changed: the scroll ride, document-space seeding, the whole document in scope rather than
> one screenful, and `uField` repurposed from a performance gate into the drain that takes
> the sky. Sections below are written to the revised design; this note is the only record
> of the first.

## Premise

The plate already eats the cursor. A visitor who reaches the foot of the human view has
read the whole document and found the one object on the page that behaves like a mass
rather than a decoration. The last thing they meet should be an invitation to find out
what it does to something bigger than a pointer.

Press the dot that closes the document and the whole page rides up into the hole in the
masthead: scroll climbs to the top while every block in the document spirals into the
plate, stretching along the line of infall, squeezing across it, going out at the photon
ring. The hole swells on what it swallows and the sky drains with it. It holds for three
seconds, gives all of it back, and rides the visitor back down to the dot they pressed.

Nothing is destroyed. The DOM is never touched; the effect is transforms and opacity on
live elements plus three numbers handed to a shader that was already running. Every
element finishes exactly where it started, and so does the scroll position.

## Decisions (locked with user)

- **Manual trigger only.** No scroll-triggered firing, no once-per-session autoplay.
  Nobody loses the page without asking for it.
- **The masthead plate is the attractor.** No second hole, no overlay canvas. Rejected:
  rasterising the page with html2canvas and lensing the pixels for real — the library does
  not understand the 83 `oklch()` colours in `globals.css`, the marquee's `mask-image`, or
  `backdrop-filter`, and the snapshot costs a visible hitch. Also rejected: a CSS-gradient
  hole with per-glyph shredding, which would put a hole on the page that does not match the
  one the site owns.
- **The page rides up into it.** Scroll animates to the top over ~1.4s while the document
  converges, so the real Gargantua comes into view and is visibly the thing doing the
  eating. Rejected: flying content off the top edge toward an off-screen hole, where nothing
  is ever seen to be eaten; and snapping to the top first, where the jump reads as a page
  navigation before the effect begins.
- **The whole document is in scope, not one screenful.** A consequence of the ride: anything
  left untransformed would scroll into view intact while its neighbours flew away.
- **Scroll returns to where it was pressed.** The scroll position is part of what "nothing is
  destroyed" is promising.
- **~3s hold, not 10–20s.** The payoff is the swallow and the return; the emptiness between
  them is dead air, and twenty seconds of dead air is where a visitor closes the tab.
- **The return unwinds.** Same spiral outward, decelerating into place, no bounce. Rejected:
  a white-hole ejection with overshoot, which reads as playful on a page that is otherwise
  an instrument.
- **The dot is the button.** No new furniture at the foot of the page.
- **Audio ducks if it is already playing.** Never starts on its own.

## Behaviour

| t (s) | Beat |
| --- | --- |
| 0.0 | Press. The Colophon's hairlines retract into the dot. User scroll locks and `html`'s `scroll-behavior: smooth` is suspended. All content goes `pointer-events: none` so nothing in flight can be clicked. Button disables. `horizon:duck` fires; audio ramps to 0.1 over 1.2s if it was playing. |
| 0.0–1.4 | **The ride.** Scroll climbs to the top on an `easeOutCubic`, so the plate comes into view — and fades in for free, because its opacity is already driven by scroll position. |
| 0.4–8.9 | **The sections, in sequence — two acts each.** The hole takes the page one section at a time, in document order, masthead first, the pressed dot last. Act one, half of each flight: the section is *stretched* — tail anchored to the page, head slowly drawn out to the lip of the hole, nothing eaten. Act two: the tail releases and the stretched body streams in, *dissolving* continuously from the head as it crosses the ring. ~1.8s per section, two or three in the air at once — one stretching while the previous dissolves. |
| — | The hole's radius steps up a notch per absorbed section, from `rs` 0.075 to 0.255. The sky drains to nothing on the same fraction. It got that way from the page. |
| 9.3–12.3 | **Hold.** The hole alone in a void — no stars, no galaxies, no pulsars, because it ate those too. At 9.7s one tracked line fades in beneath it. |
| 12.3–14.3 | **Return.** The line fades. Sections unwind outward along the paths they fell, last-eaten-first-out, faster than the fall — falling in is dread and coming back is release. The hole gives back radius, the sky comes back, and scroll rides down to where the visitor pressed. |
| 14.7 | The hole settles to its own size. One faint ring pulse opens from it and dies. Hairlines extend. Scroll unlocks, `scroll-behavior` restores, `pointer-events` restore, audio ramps back to the level the visitor had set, button re-enables. |

### Copy

- Trigger caption: **`DO NOT PRESS`** — the only imperative on a page that otherwise never
  tells anyone to do anything.
- Hold line: **`NO INFORMATION IS DESTROYED`** — Hawking's concession, and also a literal
  description of the implementation.

Both set in `field-label` (the existing uppercase tracked style). The caption sits under the
Colophon at 40% opacity so touch and keyboard users can find it, and comes to full contrast
on hover or focus. The dot gains a hairline ring in the same state.

### What gets eaten, and what does not

Everything in the document, including the fixed `ModeToggle` in the top-right corner — left
behind it would be the one object floating over an empty page, which reads as a bug rather
than a decision.

Two things are spared, both inside the plate's own subtree, which the walk skips outright:

- **The plate itself.** The hole cannot eat itself. Descending into that subtree would make
  the canvas a shred and fly the attractor into its own event horizon.
- **The audio control**, which rides in the plate's box. The music keeps playing through
  the swallow, so its off switch has to stay reachable.

### Escape

`Esc` aborts. So does `m`, the existing mode key — it unmounts the human view, and the
provider's teardown restores every recorded style, the scroll position, and `html`'s scroll
behaviour on the way out, so the mode key aborts correctly without this feature knowing
that the mode key exists. Nothing else interrupts: with a ten-second run behind a deliberate
press, aborting on a stray wheel event would mean most visitors never see the thing they
just asked for.

## Architecture

### Keystone: the plate is the hole, driven by three uniforms

`SignalPlate` is not forked, copied, reimplemented, or given a variant axis. It gains three
uniforms and one optional prop, and the swallow moves the numbers.

| Uniform | At rest | While eating | Role |
| --- | --- | --- | --- |
| `uRs` (float) | `0.075` | → `0.255` | The Schwarzschild radius, previously a GLSL constant. The hole's swelling *is* this one number moving; everything else about the object — shadow, photon ring, disk annulus, redshift — already derives from it the way it does in the real thing. |
| `uField` (float 0..1) | `1` | → `0` | Ambient sky density. At `0` the shader skips the graticule, all four star depths, the nine galaxies, the nebulas, the meteors, the asteroids, the three pulsars, and the gravitational-wave block. |
| `uSeat` (vec2) | `(0, 0.03)` | unchanged | The hole's seat, previously the `HOLE_X`/`HOLE_Y` constants. Not animated any more, but kept as the single source of the value. |

`uField` is a drain, not a dimmer, and it is the plate's own idea at a larger scale: every
star on this plate is already multiplied by the Schwarzschild factor so that the ones passing
too close go out. While the document is being swallowed the starlight goes with it.

The gate earns its keep precisely when it fires. `uField` reaches `0` at the moment `uRs` is
at its fattest — the disk running out to 9 rs then covers most of the plate — so the most
expensive frames of the run are the ones that stop paying for a sky nobody can see. Every
branch is on a uniform, so control flow stays uniform across the wavefront and there is no
divergence penalty.

Two standing defects in the file are closed by the same change:

1. **Duplicated geometry.** The CPU mirrored the hole's `HOLE_X`, `HOLE_Y` and `HOLE_R`, and
   the pulsar integrator its own `PSR_RS`, with comments asking whoever edited the GLSL
   constant to remember to edit the TypeScript ones too. There is now one source for each.
2. **The Einstein radius was an absolute.** `einstein = 0.25` only *happened* to sit just
   outside the capture radius while `rs` was fixed at 0.075. The moment the hole grows, a
   literal would put the entire strong-lensing region inside the black disc — the far side of
   the disk would have nothing to fold up against and the photon ring would come apart. It is
   now the ratio `holeR × 1.283`, which renders the resting plate identically and every other
   size as the same picture scaled.

### No re-render per frame

The ramps for `uRs`, `uSeat`, and the disk spin-up are written to a mutable `drive` ref by
the controller's `requestAnimationFrame` loop and read inside `SignalPlate`'s existing draw
loop. `SignalPlate` takes it as one optional prop. This is the discipline the file already
uses for `mark`, `pulse`, and `pointer`: React renders the component once, and the animation
lives entirely outside the render cycle.

### Files

| File | Change | Size |
| --- | --- | --- |
| `EventHorizon.tsx` | New. The `EventHorizonProvider`, the `useEventHorizon` hook, the `HorizonTrigger`, the hold line, the scroll ride, and the run clock. | ~430 |
| `horizon-physics.ts` | New. Pure functions: `collectShreds`, the infall path, the tidal transform, wave ordering, the easing. No DOM writes, no React, no imports. | ~205 |
| `SignalPlate.tsx` | Three uniforms, one optional `drive` prop, shader blocks gated on `uField`, duplicated CPU geometry replaced by the shared constants, the Einstein radius made a ratio, `data-horizon-hole` on the plate's box. | +~90 |
| `HumanView.tsx` | Owns the drive ref, wraps its root in `EventHorizonProvider`, hands the drive to `Masthead`, and `Colophon` becomes `HorizonTrigger`. | +~30 |
| `ModeToggle.tsx` | `data-horizon-eat`, so fixed chrome can be found. | +~5 |
| `AudioToggle.tsx` | A listener for the `horizon:duck` `CustomEvent`, reusing the existing `rampTo` with a duration argument. | +~25 |

### Wiring: one ref and one context

The two ends of this feature are as far apart as two things on a page can be — the trigger is
a leaf at the foot of the document, the hole is in the masthead. They are joined by the two
smallest things that will do it:

- **A drive ref**, created in `HumanView` and handed to both `SignalPlate` and the provider.
  It holds `{ rs, field, strike, taking }` and at rest holds the plate's own values, so the
  plate reads it unconditionally and there is no second code path for "nothing is happening".
  A ref rather than state because the swallow writes to it sixty times a second.
- **A context** exported from `EventHorizon.tsx`. `useEventHorizon()` returns
  `{ fire, active, available }`; `HorizonTrigger` calls `fire` on press, reads `active` to
  disable the button and retract its hairlines, and renders the plain colophon when
  `available` is false.

`available` comes from a one-line capability probe in the provider — a throwaway
`document.createElement('canvas').getContext('webgl2')`, run once on mount — rather than from
`SignalPlate`'s internal `supported` state, which is private to that component.

Because the probe only resolves on the client, the server renders the plain colophon and the
trigger appears after hydration. That is the correct order: no hydration mismatch, and a
crawler is never shown a control it cannot use.

### Coordinate frames

The page scrolls while it is being eaten, which is the one thing that makes this harder than
holding it still. Seeds are therefore measured in **document** coordinates — `rect.top +
scrollY` — so the infall arithmetic and the scroll animation cannot interfere with each other
at all. Transforms are relative to an element's own layout position, which does not move in
document space, so a shred's path is correct at every scroll offset without a single
recomputation.

Fixed chrome is the exception and is treated as one. A pinned element's distance to the hole
changes as the page rides up even though the element never moves, so `[data-horizon-eat]`
elements carry a `fixed` flag and have their seed recomputed each frame against the hole's
live on-screen position. There are one or two of them; it costs nothing.

### Component boundaries

- **`horizon-physics.ts`** knows the geometry and nothing else. Given a point, the hole's
  position, and a normalised time, it returns a transform string and an opacity — plain numbers
  in and out, so it does not know or care whether the caller is working in document space or
  viewport space. It never reads or writes the DOM and holds no state, so it can be reasoned
  about — and later tested — in isolation.
- **`EventHorizon.tsx`** owns the clock, the element list, and every style write. It is the
  only file that mutates anything outside its own tree, and every mutation it makes is
  recorded so it can be undone exactly.
- **`SignalPlate.tsx`** stays what it is: a thing that draws a hole. It learns three new
  numbers and gains no knowledge of swallowing, shreds, or the foot of the page.
- **`AudioToggle.tsx`** learns nothing at all. It hears an event on `window` and turns its
  own volume down. The two components stay strangers, which is right for a decorative
  coupling — a context or lifted state would make the audio control's correctness depend on
  a visual gag.

### Finding the shreds — sections, taken in sequence

Recursive descent from the human-view root, at SECTION grain: an element becomes a shred when
it has no element children or it fits within ~85% of a viewport height; only something taller
than a screen — the projects catalogue — is split into its natural children. The plate's
subtree is skipped outright. `[data-horizon-eat]` elements are appended, being outside the
root. On this page the walk finds ~14 shreds.

The launch order is by RANK, not by distance ratio: the nearest section is wave 0, the
furthest wave 1, evenly spaced whatever the actual distances are. Ratio-normalised waves
bunched the launches and the pull read as a scatter; ranked, the hole takes the page one
section at a time, in document order (the hole is at the top). Each flight lasts roughly 3×
the launch spacing — `flight = min(0.45, 3.2/(n+1))` of the swallow window, derived from the
count — so two or three sections are in the air at once: one being slowly stretched while the
previous one dissolves. With ~14 sections over the 8.5s swallow window that is ~1.8s of flight
per section, half of it pure stretching. Tighter sequencing was tried; each section got barely
a second and the stretch went by too fast to register as an act of its own.

There is still no `data-shred` attribute anywhere in the markup, and the set still adapts to
whichever disclosures the visitor happens to have open.

### The path

The model is anchored at each shred's TAIL — the point of it furthest from the hole. `r0` is
the tail's distance, `transform-origin` is set to the tail, and a flight has two beats:

```
STRETCH (u ∈ [0, 0.5])  half the flight. Nothing translates and nothing is eaten:
                        the head is drawn out toward the hole's own lip — stretch
                        ramps 1 → clamp((r0 − 1.2rq)/len, 1, sMax) about the
                        pinned tail, held just outside the ring.
DISSOLVE (u ∈ [0.5, 1]) the tail lets go:
  v        = the pull's own smoothstep clock
  tailR(v) = rq + (r0 − rq)·(1 − v)³          plunge, then FREEZE at the ring
  θ        = θ0 + WIND·((r0/tailR)^1.5 − 1)   Keplerian r^−3/2, capped
  stretch  = max(grab, 1 + 20·(rq/tailR)³)    the tide takes over, capped at the
                                              shred's own sMax
  across   = 1 / √stretch
  headR    = tailR − stretch·len              where the drawn head actually is
  melt     = (rq − headR) / (tailR − headR)   the share of the drawn length inside
                                              the ring — floored to 32 steps, exactly
                                              1 as the tail lands
  opacity  = (1 − rq/tailR)^(1/4)             rq = the photon ring, 2.598·rs
```

Composed as `translate(…) rotate(θ) scale(stretch, across) rotate(−θ)` about the tail origin,
plus the mask. `sMax` is a raster guard, not a look: the reach target is the hole's lip
itself, computed from the actual distance, and `sMax` (≈3 viewport-heights ÷ len, clamped to
[1.6, 18]) only stops a drawn filament exceeding ~3 screens of texture.

**Two acts of equal weight — stretch, then dissolve — and they do not overlap.** This is the
revision that answered "the black hole stretches the thing, okay, then slowly dissolves it":
earlier versions blurred the two into one motion, and the swallow read as things stepping into
the hole rather than being drawn out and consumed. Now half of every section's flight is spent
anchored — tail pinned to the page, head slowly drawn out to the lip of the hole and held just
outside the ring, nothing eaten — and only then does the tail release and the stretched body
stream in, dissolving continuously from the head. The melt's 8-step quantisation was the other
half of the "stepping" read: budgeted for 160 row-shreds, at section scale each bite was
plainly visible. At 14 shreds, 32 steps costs ~450 small repaints per run and reads as
continuous.

**The melt fraction is literal**: the share of the shred's drawn length that has crossed
inside the photon ring, eaten leading-edge first, zero until something has actually crossed
and exactly one as the tail arrives — the same radius where the opacity reaches zero, so both
endings land on the same frame. (An earlier form keyed the melt on how far the head had swept
through a fixed neighbourhood of the hole; on a long section that finished the entire sweep
during the grab, and the section read as consumed while still anchored to the page.)

**The freeze is load-bearing, and it replaced a measured mistake.** The first profile was the
cursor's own accelerating plunge, `r = r0·(1 − u^2.2)` — which has its top radial speed exactly
at arrival, so a shred from 2000px crossed the entire ~300px melt-and-tide zone at ~2800px/s.
Instrumented residence times: the visible melt lasted **53–172ms** of a 2.2s flight across
realistic distances. A viewer reads that as vanishing, not melting — this was reported as "not
seeing the melting at all", and the numbers agreed. The right precedent was already on the
plate twice: the star stream hangs on the Shapiro term, and the doomed pulsars creep to a halt
where they run out of light, because a distant observer sees infall *freeze* at a horizon, not
accelerate through it. On the freeze profile the same instrumentation reads **0.70–0.91s of
visible melting and ~0.85s of visible tide per shred** — a shred now falls fast through the
empty middle distance and then hangs at the lip, smearing and dissolving, with radial speed
reaching zero exactly at the ring. The flight ends *at* the ring, not at the centre; the melt's
final step and the alpha's zero land on the same radius.

Every exponent is the plate's own. `r^−3/2` in `θ(t)` is the Keplerian shear law the disk
lanes already use, so the page winds at the rate of the lanes it is falling into rather than
at a rate chosen to look about right. `across = 1/√stretch` is the rule the plate states for
its cursor.

**The tide is `1/r³` and measured against the hole, not against distance travelled.** A tidal
force is the *difference* in gravity across a body, so it is nothing at all at a distance and
runs away violently at the end — and `20` is the same coefficient `SignalPlate` uses to stretch
the cursor it absorbs. An earlier pass used `1 + 2.4·(1 − r/r0)²`, which was a chosen shape
rather than a law and had two faults: it topped out at 3.4×, so the page spaghettified five
times *less* than a mouse pointer does on the same page; and being a function of the fraction
travelled, it deformed things from the moment they set off, which reads as the page wobbling
rather than as something being drawn out by a mass. On the cube law a shred holds its shape
almost the whole way in and then smears.

**The melt is what makes it swallowed rather than merely gone.** A shred is eaten leading-edge
first: a `mask-image` gradient runs along its infall line, and as `melt` climbs the transparent
stop sweeps across the element, leaving a thinning tail behind the part that has already gone
through. The overall opacity is deliberately the slower of the two — fourth-root rather than
square-root — so it hangs on while the melt does the work instead of dimming the tail out from
under it. Things still finish at the photon ring rather than at the centre, because a distant
observer never does watch anything cross a horizon.

Return runs the same functions with time reversed, a shorter flight, and the wave order
inverted.

### Transform and opacity, plus one stepped paint

No `filter: blur()`, no `box-shadow`, no `background` animation. Fourteen nodes moving on the
compositor is free; fourteen blurred section-sized nodes is a slideshow on a laptop. Softness
comes from the plate's own analytic glow, which is being drawn either way.

The mask is the single exception, and it is the one thing here that costs paint — so it is
**quantised to 32 steps** rather than written per frame, in the physics module rather than at
the call site: the quantisation is part of the model, not an optimisation bolted onto it.
Thirty-two, not eight: eight was budgeted for 160 row-sized shreds, and at section scale a
dissolve lasting most of a second advanced in eight visible bites — the swallow read as things
stepping through the hole. At 14 section-sized shreds, 32 steps is ~450 repaints across the
whole run against ~12,000 if it were continuous, and the sweep is smooth to the eye.

Two details that would otherwise bite:

- The gradient's stops start at `−38%` so that step zero is a **fully opaque** element. Written
  the naive way (`transparent 0%, black 38%`) a shred would pop from intact to a third eaten the
  instant it was first masked.
- Both `mask-image` and `-webkit-mask-image` are written. Safari only shipped the unprefixed
  property in 15.4, and the failure mode of omitting the prefix is that the melt silently does
  nothing on an older iPhone while every other part of the effect works.

Shreds that never come near the hole carry no mask property at all — an empty value removes it
rather than setting `none`, because a mask is a paint even when it masks nothing.

`will-change: transform, opacity` is set on shreds at press and removed when the run ends,
because a permanent `will-change` on that many nodes is a permanent memory cost for an effect
that runs for ten seconds.

### Scrolling

Two things are needed beyond animating `window.scrollY`:

1. **`html { scroll-behavior: smooth }` must be suspended.** It is set at `globals.css:339`,
   and it would intercept every per-frame `scrollTo` — each starting its own easing toward a
   target that has already moved — so the scroll would lag the animation and never arrive.
   Set to `auto` for the run and restored on teardown, like every other mutation here.
2. **rAF with an easing function, not `scrollTo({ behavior: 'smooth' })`.** The ride has to
   stay in lockstep with the infall, which means one clock driving both.

User scroll is blocked for the duration: `wheel` and `touchmove` are `preventDefault`ed on a
capturing, non-passive listener, and the scroll keys are swallowed on `keydown`.

No stacking changes at all. The plate is inside the document and already paints where it
should; there is no overlay to sit behind, so nothing needs a z-index it did not already have.

## Error handling and degradation

- **No WebGL2.** The provider's capability probe returns false and `useEventHorizon` reports
  `available: false`, so the trigger does not render at all — the plain colophon stays. Without
  the plate there is no hole to pull toward, and a button that promises gravity and delivers a
  scroll-to-top is worse than no button.
- **`prefers-reduced-motion: reduce`.** The trigger renders and works, degraded to a 400ms
  crossfade: the hole swells where it stands, content fades out, three-second hold, fade back.
  No travel, no spin, and **no scrolling** — dragging someone to the top of the document is
  exactly the motion the preference is asking us not to do. The joke survives; the vestibular
  trigger does not.
- **Mode flip mid-run.** Abort, restore every recorded inline style, the scroll position, and
  `html`'s scroll behaviour; cancel the frame. The loop checks `node.isConnected` before each
  write, because React may already have detached the human view.
- **Orientation change or a viewport jump over ~25% mid-run.** Abort rather than animate
  against a layout that moved under it.
- **A second press while running.** Impossible: the button is `disabled` for the duration.
- **Teardown on unmount.** The provider's cleanup restores styles, scroll behaviour, and
  listeners, and cancels the frame, so a navigation mid-swallow cannot leave the document
  locked, transformed, or unable to scroll smoothly again.
- **Audio left ducked.** The volume is normally handed back at the eject beat for the musical
  timing of it, but an abort has no eject beat and a mode flip never reaches this file's
  listeners. `restore()` therefore dispatches the un-duck unconditionally as a safety net;
  ramping to a level it is already at costs nothing.
- **Shader compile failure.** Unchanged from today — logs `[SignalPlate] shader failed to
  compile` and falls back to the static plate.

## Accessibility

- The trigger is a real `<button>` with an `aria-label` that says what it does, not `DO NOT
  PRESS`, which is a joke rather than a description.
- The effect changes nothing semantic: no `aria-live` announcement, no `aria-hidden` on
  content, no DOM removal. A screen-reader user's document is exactly as it was, which is
  the correct experience of a purely visual decoration.
- Focus never moves. The button stays focused through the run and re-enables at the end,
  so a keyboard user is not dropped at the top of the document.
- `pointer-events: none` on content during the run means no link can be activated while it
  is in flight, so nobody navigates somewhere they did not aim for.

## Performance

- **No second WebGL context, no second shader compile, no warm-up.** The plate is already on
  the page and already running; the swallow hands it three numbers. This is the largest single
  saving of the revision.
- `uField → 0` skips the entire ambient sky — the expensive half of the shader — and reaches
  zero exactly when the swollen disk is costing the most.
- Shreds capped at 160, compositor-only properties, `will-change` scoped to the run and
  removed after, because a permanent `will-change` on 160 nodes is a permanent memory cost for
  an effect that runs for ten seconds.
- One `requestAnimationFrame` loop for the DOM and the scroll, plus the plate's existing loop
  for the canvas. No per-frame React renders — the provider changes state exactly twice per
  run — and no per-element `motion` components.
- No new dependencies. No new network requests. No change to the static export or to any
  prerendered HTML: the trigger resolves client-side into a document that is already complete
  without it.

## Assumptions

- **No test runner is added.** The repository has no test infrastructure today, and standing
  up vitest for a decorative visual effect is scope the user did not ask for. `horizon-physics.ts`
  is nonetheless written as pure, import-free functions specifically so that it can be tested
  the day a runner arrives, and so that its correctness can be reviewed by reading it.
  Overrule this and the module is ready.
- The effect is human-view only. `SpecimenSheet` has no Colophon and gains nothing.

## Verification

1. `npm run lint` and `npm run build` clean.
2. The pure geometry exercised at its boundaries (see *Assumptions* — no runner is added, so
   this is a throwaway script rather than a committed suite): endpoints, monotonic infall, the
   wind cap, `across = 1/√stretch`, alpha in range, degenerate `r0 = 0` and `ringR = 0`,
   out-of-range `u`, wave normalisation, radius monotonicity.
3. Both shaders parsed, to catch a scope or brace error in the `uField` gating without a GPU.
4. Browser check on the running dev server, driven, at desktop and mobile widths:
   - the dot's caption reads at 40% and brightens on hover and on keyboard focus;
   - the ride climbs smoothly to the top and does not stutter — the `scroll-behavior`
     suspension is the thing being tested;
   - the swallow runs at the stated timings, the drain sweeps down the document, and the hole
     visibly swells while the sky drains;
   - **the two acts read as two acts**: each section is first visibly stretched — tail pinned,
     head slowly drawn out to the hole's lip, nothing eaten — and then dissolves continuously
     from the head as it streams in. No stepping: the 32-step mask sweep must read as smooth,
     and if it does not, the step count goes up and the repaint budget with it;
   - the plate and the audio control are *not* eaten; everything else is, including the mode
     toggle;
   - the hold shows the hole alone in a void, and the line appears and fades;
   - the ring pulse fires as the hole settles;
   - every element lands exactly where it started, and scroll returns to the dot — compared
     against a screenshot taken before the press.
5. `Esc` mid-swallow and `m` mid-swallow both restore the page fully, including scroll position
   and smooth scroll behaviour afterwards.
6. Audio on, then press: volume ducks and returns to 0.5. Audio off, then press: stays silent.
   Abort mid-run: volume still returns.
7. Reduced motion forced: the crossfade path runs, no travel, and the page does not scroll.
8. WebGL2 disabled: the plain colophon renders, no trigger, no console errors.
9. No `[SignalPlate]` errors in the console, and the resting plate is unchanged — same sky,
   same cursor absorption, same theme flip, same disk.
