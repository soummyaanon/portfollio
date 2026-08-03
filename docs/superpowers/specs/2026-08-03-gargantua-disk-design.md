# Gargantua Disk Upgrade — Design

**Date:** 2026-08-03
**Component:** `src/components/document/SignalPlate.tsx` (fragment shader only)
**Goal:** Make the black hole's accretion disk richer and faster, inspired by
Interstellar's Gargantua (the DNGR renders), while keeping the plate's
single-ink monochrome design and one-draw-call architecture.

## Decisions (locked with user)

- **Colour:** ~~stays monochrome~~ **superseded 2026-08-03.** The disk uses the
  page's single ink like everything else on the plate. The Gargantua feel comes
  from shape, motion, and light — not hue.

  > **Reversed later the same day.** The hole and the pulsar now carry their own
  > colour — a blackbody amber-to-white-gold ramp on the disk and photon ring,
  > light cyan on the pulsar — while every other mark on the plate stays in the
  > page's ink. The grounds for the exception: both objects are emitting, and
  > what they emit has a temperature. Everything else here still holds, and the
  > theme-flip trick (probe-read ink, `uShadow` mix) is still untouched — the
  > accents ride it too, deepening on paper the way the halos already do.
- **Scope:** full Gargantua silhouette — including the near-side band of the
  disk crossing in front of the shadow, which the current shadow mask eats.

## Approach

Extend the existing fragment shader's disk block in place (lines ~486–511).
No new passes, framebuffers, or dependencies. The lens already folds the far
side of the source-plane disk into the arcs over and under the shadow; we
enrich that disk and add one image-space evaluation for the near side.

Rejected alternatives: ray-marched geodesics (a rewrite, ~10× GPU cost for a
decorative plate) and multi-pass bloom (breaks the one-draw-call claim for an
effect we can fake analytically).

## Changes

### 1. Whirl speed

`float whirl = 0.16 / pow(bandR, 1.5)` → coefficient `0.26` (~1.6×). The
r^(-3/2) Keplerian law is unchanged, so the differential shear between lanes
stays honest; everything just laps faster.

### 2. Richer whirl shading

- **Second turbulence octave:** the lanes gain a higher-frequency noise term
  (roughly double the radial frequency, ~1.35× the angular shear rate) that
  modulates the coarse lanes. Fine filaments visibly slip past the coarse
  bands — turbulence, not just banding.
- **Higher lane contrast:** the lane mix is rebalanced so the bright
  filaments carry more of the range.
- **Hot inner rim:** a brightness term peaking just outside the ISCO
  (`diskIn = 3 rs`), where the film's disk is brightest, still dimmed by the
  existing gravitational-redshift factor on the innermost annulus.
- **Doppler beaming stays asymmetric** (approaching limb heavy, receding limb
  faint) — the DNGR-paper look, clamp unchanged at 6.

### 3. Near-side band (the Gargantua silhouette)

A second evaluation of the same annulus/lanes/Doppler math, sampled in
**image space** (`p`, unlensed — light from disk material between the viewer
and the hole barely bends), masked to the **near half** of the disk plane
(soft fade across the seam at the projected minor axis), and composited
**after** the shadow mask so the thin equatorial band cuts across the black
disc just below centre.

Geometry check: with `rs = 0.075`, inclination `cosI = 0.208`, the band's
projected extent at the shadow's central column is y ≈ −0.047 … −0.109 in
plate units against a shadow radius of 0.195 — a thin band crossing the
lower-middle of the shadow, matching the film's framing.

The band fades out by ~2× the shadow radius so it hands over to the noisy
lensed disk without a visible seam (the lens equation would not line the two
up exactly; the noise hides the join, and exact consistency is out of scope
for a stylised plate).

### 4. Analytic glow

A faint wide envelope reusing the disk's radius terms at a few percent alpha,
standing in for bloom along the disk and arcs. Nearly off in the light theme
via the same `uShadow` mix the rest of the plate uses (glow on paper reads as
a thumbprint).

## Unchanged

Single ink, colour probes, reduced-motion freeze, IntersectionObserver
pause/play, DPR cap, cursor absorption, graticule/stars/meteors/nebulas/
gravitational waves, the lens equation itself, the photon ring and its
sub-rings, the WebGL setup and React component code.

## Performance

Adds roughly two `noise()` calls and a few dozen ALU ops per pixel. No new
uniforms, textures, or draw calls. Well within the plate's budget.

## Error handling

Same as today: a shader compile failure logs
`[SignalPlate] shader failed to compile` with the info log and the component
falls back to the static dot-field plate.

## Verification

- Shader compiles (no `[SignalPlate]` errors in the console).
- Dev server + browser check: near-side band crosses the shadow; arcs still
  ride over/under it; whirl is visibly faster; filaments shear past each
  other; both themes read correctly (no glow smudge on paper).
- Reduced-motion still renders a sane first frame.
