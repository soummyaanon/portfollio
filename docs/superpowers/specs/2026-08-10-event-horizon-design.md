# Event Horizon — Design

**Date:** 2026-08-10
**Branch:** `feature/event-horizon`
**Status:** Approved
**Components:** `EventHorizon.tsx` (new), `horizon-physics.ts` (new),
`SignalPlate.tsx`, `HumanView.tsx`, `AudioToggle.tsx`

## Premise

The plate already eats the cursor. A visitor who reaches the foot of the human view has
read the whole document and found the one object on the page that behaves like a mass
rather than a decoration. The last thing they meet should be an invitation to find out
what it does to something bigger than a pointer.

Press the dot that closes the document and it turns out to have been a mass all along: it
inflates, rises to the centre of the screen, and takes the page apart — every block on
screen spiralling in, stretching along the line of infall, squeezing across it, going out
at the photon ring. It holds what it took for three seconds. Then it gives all of it back
and collapses into punctuation again.

Nothing is destroyed. The DOM is never touched; the effect is transforms and opacity on
live elements, and the elements are still exactly where they were when it finishes.

## Decisions (locked with user)

- **Manual trigger only.** No scroll-triggered firing, no once-per-session autoplay.
  Nobody loses the page without asking for it.
- **Viewport-scoped, scroll locked.** With scroll locked, what is on screen *is* the whole
  page as far as the eye can tell. Sections above the fold are not transformed — animating
  them costs paint nobody can see. The "whole document" feeling comes instead from
  distance-ordered waves that visibly work the drain outward from the hole.
- **Real hole, real DOM.** A fixed full-viewport canvas runs the actual Gargantua shader;
  live elements wind into it in front of the disk. Rejected: rasterising the page with
  html2canvas and lensing the pixels for real — the library does not understand the 83
  `oklch()` colours in `globals.css`, the marquee's `mask-image`, or `backdrop-filter`, and
  the snapshot costs a visible hitch. Also rejected: a CSS-gradient hole with per-glyph
  shredding, which would put a hole on the page that does not match the one the site owns.
- **Seeds at the Colophon dot, drifts to centre.** Content then converges from every side
  rather than all falling downward into a pit at the foot of the screen.
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
| 0.0 | Press. The Colophon's hairlines retract into the dot. Scroll locks. All content goes `pointer-events: none` so nothing in flight can be clicked. Button disables. |
| 0.0–0.6 | The dot inflates and rises to viewport centre. The disk spins up from nothing. `horizon:duck` fires; audio ramps to 0.1 over 1.2s if it was playing. |
| 0.4–3.6 | **The waves.** Nearest shreds launch at 0.4s, furthest at ~1.8s; each flight is ~1.6s. Everything spirals in, winding faster as it falls, and goes out at the photon ring. |
| — | The hole's radius steps up a notch per absorbed shred. By the end it is visibly fatter than it started, and it got that way from the page. |
| 4.0–7.0 | **Hold.** The hole alone, disk whirling. At 4.4s one tracked line fades in beneath it. |
| 7.0–9.0 | **Return.** The line fades. Shreds unwind outward along the paths they fell, last-eaten-first-out, ~1.0s each — faster than the fall, because falling in is dread and coming back is release. The hole gives back radius as it gives back content. |
| 9.2 | The hole collapses into the dot. One faint ring pulse opens from it and dies. Hairlines extend. Scroll unlocks, `pointer-events` restore, audio ramps back to the level the visitor had set, button re-enables. |

### Copy

- Trigger caption: **`DO NOT PRESS`** — the only imperative on a page that otherwise never
  tells anyone to do anything.
- Hold line: **`NO INFORMATION IS DESTROYED`** — Hawking's concession, and also a literal
  description of the implementation.

Both set in `field-label` (the existing uppercase tracked style). The caption sits under the
Colophon at 40% opacity so touch and keyboard users can find it, and comes to full contrast
on hover or focus. The dot gains a hairline ring in the same state.

### What gets eaten

Everything on screen, including the fixed `ModeToggle` in the top-right corner. Left
behind it would be the one object floating over an empty page, which reads as a bug rather
than a decision. It returns with everything else.

If the viewport is tall enough that the masthead is still on screen when the trigger is
pressed, the plate is simply one more shred and the hole eats its own portrait. Two WebGL
contexts render for those few seconds; both are cheap enough (see Performance).

### Escape

`Esc` aborts. So does `m`, the existing mode key — it snaps back over 250ms and then flips.
Nothing else interrupts. With a nine-second run behind a deliberate press, aborting on a
stray wheel event would mean most visitors never see the thing they just asked for.

## Architecture

### Keystone: one shader, gated by uniforms

`SignalPlate` is not forked, copied, or reimplemented. It gains three uniforms, and the
horizon overlay mounts the same component with the sky switched off.

| Uniform | Plate | Horizon | Role |
| --- | --- | --- | --- |
| `uField` (float 0..1) | `1` | `0` | Ambient sky density. At `0` the shader skips the graticule, all four star depths, the nine galaxies, the nebulas, the meteors, the three pulsars, and the gravitational-wave block. |
| `uRs` (float) | `0.075` | ramped | The Schwarzschild radius, today a GLSL constant. As a uniform, the growth *is* one number moving. |
| `uSeat` (vec2) | `(0, 0.03)` | animated | The hole's seat, today the `HOLE_X`/`HOLE_Y` constants. Lets the hole rise from the dot to centre. |

This gating is what makes a full-viewport hole affordable: the overlay covers roughly nine
times the plate's pixels, and it is precisely the ambient sky layers that cost. What remains
— the lens equation, the shadow, the disk and its near-side band, the photon ring and
sub-rings, the analytic glow — is cheap. The branches are on uniforms, so control flow stays
uniform across the wavefront and there is no divergence penalty.

`uRs` and `uSeat` also remove a standing hazard in the current file: the CPU mirrors the
hole's geometry in `HOLE_X`, `HOLE_Y`, and `HOLE_R` with a comment asking whoever edits the
GLSL constant to remember to edit the TypeScript one too. After this change there is one
source for each value.

### No re-render per frame

The ramps for `uRs`, `uSeat`, and the disk spin-up are written to a mutable `drive` ref by
the controller's `requestAnimationFrame` loop and read inside `SignalPlate`'s existing draw
loop. `SignalPlate` takes it as one optional prop. This is the discipline the file already
uses for `mark`, `pulse`, and `pointer`: React renders the component once, and the animation
lives entirely outside the render cycle.

### Files

| File | Change | Size |
| --- | --- | --- |
| `EventHorizon.tsx` | New. The `EventHorizonProvider`, the `useEventHorizon` hook, the fixed overlay layer, the hold line, and the `free → absorb → held → eject` clock — named to echo the plate's own cursor state machine, which is the same idea one scale up. | ~200 |
| `horizon-physics.ts` | New. Pure functions: `collectShreds`, the infall path, the tidal transform, wave ordering, the easing. No DOM writes, no React, no imports. | ~120 |
| `SignalPlate.tsx` | Three uniforms, one optional `drive` prop, shader blocks gated on `uField`, CPU geometry constants replaced by the uniform values. | +~50 |
| `HumanView.tsx` | Wraps its root in `EventHorizonProvider` and hands it the root's `ref`; `Colophon`'s dot becomes a `<button>` with its caption. | +~30 |
| `AudioToggle.tsx` | A listener for the `horizon:duck` `CustomEvent`, reusing the existing `rampTo`. | +~15 |

### Wiring the trigger to the controller

The trigger is a leaf inside `Colophon`; the clock and the overlay are at the root. They are
joined by the smallest thing that will do it — a context exported from `EventHorizon.tsx`:

- `EventHorizonProvider` wraps the human-view root, receives that root's `ref`, holds the
  controller, and renders the overlay layer as its last child.
- `useEventHorizon()` returns `{ fire, phase, available }`. `Colophon` calls `fire` on press,
  reads `phase` to disable the button and retract its hairlines, and renders nothing at all
  when `available` is false.

`available` comes from a one-line capability probe in the provider — a throwaway
`document.createElement('canvas').getContext('webgl2')`, run once on mount — rather than
from `SignalPlate`'s internal `supported` state, which is private to that component and
belongs to the plate at the top of the page, not to this feature.

The provider is also what promotes the root to `position: relative; z-index: 1` for the
duration, as an inline write on the ref it was handed. `HumanView` itself declares no
z-index and knows nothing about stacking: every style mutation in this feature is made by
the controller and recorded so it can be undone exactly.

### Component boundaries

- **`horizon-physics.ts`** knows the geometry and nothing else. Given a shred's start box, the
  hole's seat, and a normalised time, it returns a transform string and an opacity. It never
  reads or writes the DOM and holds no state, so it can be reasoned about — and later
  tested — in isolation.
- **`EventHorizon.tsx`** owns the clock, the element list, and every style write. It is the
  only file that mutates anything outside its own tree, and every mutation it makes is
  recorded so it can be undone exactly.
- **`SignalPlate.tsx`** stays what it is: a thing that draws a hole. It learns three new
  numbers and gains no knowledge of swallowing, shreds, or the foot of the page.
- **`AudioToggle.tsx`** learns nothing at all. It hears an event on `window` and turns its
  own volume down. The two components stay strangers, which is right for a decorative
  coupling — a context or lifted state would make the audio control's correctness depend on
  a visual gag.

### Finding the shreds

Recursive descent from the human-view root. An element becomes a shred when its box
intersects the viewport **and** either it has no element children or its height is under
~120px; otherwise the walk recurses into it. The `ModeToggle` is appended by hand, being
outside the root.

Result: `li` rows, section heads, paragraphs, the marquee rails, images, and the
contribution graph all come out as natural units without a single `data-*` attribute in the
markup, and the set adapts automatically to whichever disclosures the visitor happens to
have open.

Capped at ~80 shreds. On overflow the walk stops recursing, so shreds get *coarser* rather
than content getting dropped — an over-full viewport still swallows completely, just in
bigger pieces.

### The path

```
r(t)     = r0 · (1 − easeIn(t))              accelerates inward
θ(t)     = θ0 + WIND · ((r0/r)^1.5 − 1)      Keplerian r^−3/2, capped
stretch  = 1 + TIDE · (1 − r/r0)²            along the infall line
across   = 1 / √stretch                      squeeze across it
opacity  → 0 across the photon ring at 2.598·rs
```

Composed as `translate(…) rotate(θ) scale(stretch, across) rotate(−θ)`.

The exponent in `θ(t)` is the same `r^−3/2` shear law the disk lanes already use, so the
page winds at the rate of the lanes it is falling into rather than at a rate chosen to look
about right. `across = 1/√stretch` is the rule the plate's `uMarkTide` comment already
states for the cursor. Things go out at the photon ring, not at the centre, because a
distant observer never does watch anything cross a horizon.

Return runs the same functions with time reversed, a shorter flight, and the wave order
inverted.

### Transform and opacity only

No `filter: blur()`, no `box-shadow`, no `background` animation — nothing that forces paint
or a new raster. Eighty nodes moving on the compositor is free; eighty blurred nodes is a
slideshow on a laptop. The softness that sells the effect comes from the canvas underneath,
which is already drawing an analytic glow.

`will-change: transform, opacity` is set on shreds at press and removed when the run ends,
because a permanent `will-change` on eighty nodes is a permanent memory cost for an effect
that runs for nine seconds.

### Stacking

The hole layer is `position: fixed; inset: 0; z-index: 0`, painting the page's own
`--background` behind the canvas so it covers the document. The human-view root takes
`position: relative; z-index: 1` for the duration, which puts shreds in front of the disk.
`ModeToggle` keeps its `z-50` and is shredded where it stands.

All three added properties are inline and removed on teardown.

## Error handling and degradation

- **No WebGL2.** The provider's capability probe returns false and `useEventHorizon` reports
  `available: false`, so the trigger does not render at all. There is no fallback rendering:
  a black hole made of CSS gradients is not worth shipping on this page, and a button that
  promises gravity and delivers a grey circle is worse than no button.
- **`prefers-reduced-motion: reduce`.** The trigger renders and works, degraded to a 400ms
  crossfade — content fades out, a still hole frame fades in, three-second hold, fade back.
  No travel, no spin, no scroll lock. The joke survives; the vestibular trigger does not.
- **Mode flip mid-run.** Abort, restore every recorded inline style, cancel the frame. The
  loop checks `node.isConnected` before each write, because React may already have detached
  the human view.
- **Orientation change or a viewport jump over ~25% mid-run.** Abort rather than recompute
  against a layout that moved under the animation.
- **A second press while running.** Impossible: the button is `disabled` for the duration.
- **Teardown on unmount.** The controller's cleanup restores styles, unlocks scroll, removes
  listeners, and cancels the frame, so a navigation mid-swallow cannot leave the document
  locked or transformed.
- **Shader compile failure.** Unchanged from today — logs `[SignalPlate] shader failed to
  compile` and falls back to the static plate, which also means the trigger does not render.

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

- Overlay DPR capped at 1.5 and rendered at 0.85 scale. Nothing in a nine-second animation
  rewards per-pixel sharpness.
- `uField = 0` skips the entire ambient sky, which is the expensive half of the shader.
- Shreds capped at ~80, compositor-only properties, `will-change` scoped to the run.
- One `requestAnimationFrame` loop total for the DOM, plus the plate's existing loop for the
  canvas. No per-frame React renders, no per-element `motion` components.
- No new dependencies. No new network requests. No change to the static export or to any
  prerendered HTML — the trigger and the overlay mount client-side into a document that is
  already complete without them.

## Assumptions

- **No test runner is added.** The repository has no test infrastructure today, and standing
  up vitest for a decorative visual effect is scope the user did not ask for. `horizon-physics.ts`
  is nonetheless written as pure, import-free functions specifically so that it can be tested
  the day a runner arrives, and so that its correctness can be reviewed by reading it.
  Overrule this and the module is ready.
- The effect is human-view only. `SpecimenSheet` has no Colophon and gains nothing.

## Verification

1. `npm run lint` and `npm run build` clean.
2. Browser check on the running dev server, driven, at desktop and mobile widths:
   - the dot's caption reads at 40% and brightens on hover and on keyboard focus;
   - the swallow runs at the stated timings and the hole visibly grows as it eats;
   - the mode toggle is eaten and comes back;
   - every element lands exactly where it started — compared against a screenshot taken
     before the press;
   - the hold line appears and fades;
   - the ring pulse fires as the hole closes.
3. `Esc` mid-swallow and `m` mid-swallow both restore the page fully.
4. Audio on, then press: volume ducks and returns to 0.5. Audio off, then press: stays
   silent.
5. Reduced motion forced: the crossfade path runs, no travel, no scroll lock.
6. WebGL2 disabled: no trigger renders, no console errors, page otherwise normal.
7. No `[SignalPlate]` errors in the console, and the masthead plate is unchanged — same
   sky, same cursor absorption, same theme flip.
