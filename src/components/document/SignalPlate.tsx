'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'

import { AudioToggle } from './AudioToggle'

/**
 * The one moving thing on the page.
 *
 * A star chart with a mass pinned at its centre. A faint graticule, four depths of stars
 * parallaxed against each other down to a dust-fine veil, a dust lane, small nebulas drifting
 * through, nine galaxies out toward the corners, and now and then a meteor. Click it and a
 * ranging circle opens from the point of contact, lifting the magnitude of every star it crosses.
 *
 * No asterism. Two hand-placed figures used to flank the hole, and they were the last thing on
 * the plate asserting a shape rather than deriving one — a chosen graph of lines among objects
 * that all now come out of their own physics. The sky is enough.
 *
 * The galaxies are the deep field, and they are placed in three dimensions rather than pasted
 * on: each sits at a world position eight to thirty units behind the hole, and a fixed camera
 * basis projects it, so the perspective divide gives the field a genuine front and back. They
 * are kept out toward the corners because the middle of the plate belongs to the mass. Being
 * extended sources they shear through the lens without brightening, the same rule the nebulas
 * and the graticule follow — a galaxy near the hole is stretched, never lit.
 *
 * The black hole is built from its physics rather than drawn: the sky behind it is sampled
 * through the point-mass lens equation, so stars and graticule lines arc around it and a
 * second inverted image appears inside the Einstein radius without being asked for. Around it
 * an accretion disk lives in the source plane and is seen through that lens, which is what
 * folds its far side into the arc riding over the shadow; its light carries the Doppler
 * beaming of matter orbiting at four tenths of c, the gravitational redshift of the inner
 * annulus, and the winding shear of a Keplerian flow in two octaves of turbulence, with the
 * sampling folded at the disk's inner edge so wings, crown and the ring of light around the
 * shadow are one unbroken flow where a flat lens would leave wedges. Point sources brighten by the lens's
 * true magnification as they cross behind — extended ones do not, because lensing conserves
 * surface brightness — so a star drifting into alignment flares into an Einstein ring on its
 * own schedule. The dark disc is the photon capture radius at 2.598 rs, not the horizon, and
 * the ring on it converges through two sub-rings the way the real one does. A little spin
 * twists the nearby sky (frame dragging), time runs slow beside the mass (the Schwarzschild
 * factor, in the scintillation) and arrives late (the Shapiro delay), and the incursions are
 * the stretch-and-squeeze strain of passing gravitational waves, kept off the hole's own
 * ground where its gravity, not theirs, owns the geometry.
 *
 * It is drawn on a raw WebGL2 canvas rather than through a scene graph: this is a single
 * full-quad fragment shader, so Three.js would have bought a camera, a renderer, and
 * ~170 kB of gzip for a mesh that never moves. The whole thing is the GLSL below.
 *
 * It is decoration with an argument behind it: the page's thesis is that a person is a
 * document, and an atlas plate is the oldest form of that argument there is — a subject
 * reduced to a catalogued position among other catalogued positions. No hue — the ink is
 * the page's own mid-grey, which is also why it survives a theme flip without a second
 * palette, and why the same drawing reads as printed stars on paper in the light theme and
 * as an actual sky in the dark one.
 *
 * Cheap by construction — one draw call per frame, paused off-screen, capped at 2× DPR,
 * frozen on the first frame when the visitor prefers reduced motion, and silently absent
 * if WebGL2 is not there.
 */

const VERTEX_SHADER = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2  uSize;     // drawing buffer size, px
uniform float uTime;     // seconds
uniform vec2  uMark;      // the cursor mark's tip, plate space — the CPU owns the choreography
uniform vec2  uMarkDir;   // unit infall line at the mark, the axis of the tidal stretch
uniform float uMarkTide;  // stretch along the infall line; the squeeze across is its square root
uniform float uMarkAlpha; // hover gate × Schwarzschild dimming × phase — 0 hides the mark
uniform float uMarkSpin;  // glyph rotation, radians — the swirl of the drain
uniform vec3  uInk;      // resolved page ink, 0..1
uniform vec3  uPulse;    // xy = where the plate was last struck, z = seconds since
uniform float uOpacity;
uniform float uShadow;   // 1 when the ink is darker than the paper, 0 when it is lighter
uniform vec4  uPsr[3];    // three pulsars: xy = where it is, z = the flyby gate, w = beam axis angle
uniform vec3  uPsrLit[3]; // x = the lighthouse flash, 0..1; y = Doppler beaming; z = √(Ω/Ω₀), the spread
uniform vec4  uCam;      // the camera: xy = cos/sin of azimuth, z = sin(elevation), w = cos(elevation)
uniform float uField;    // ambient sky density — at 0 the whole field is skipped, not just faded
uniform float uRs;       // the Schwarzschild radius, plate units — everything else follows from it
uniform vec2  uSeat;     // where the hole sits, plate space

out vec4 fragColor;

/**
 * How far the eye sits from the mass, in plate units. This is the one number that turns the
 * plate from an orthographic chart into a view from somewhere: it sets how much perspective
 * the near objects get. Large enough that the hole and its disk stay effectively orthographic
 * — which is what keeps the lens equation and the disk's projection exactly as they were, the
 * hole sitting at unit scale by construction — and small enough that a galaxy seventeen units
 * out is visibly further away than one at eight.
 */
const float CAM_D = 14.0;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 hash2(vec2 p) {
  return vec2(hash(p), hash(p + vec2(41.7, 17.3)));
}

/** Value noise, two octaves. Only the dust lane uses it, and only at a few percent alpha. */
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

/**
 * Coverage of the nearest contour of a scalar field, antialiased. "soft" widens the band.
 * The final factor fades a family out entirely once its lines pack closer than they can be
 * resolved — which is what keeps the graticule from turning to moiré where the lens crushes
 * it against the horizon.
 */
float contour(float f, float soft) {
  float w = fwidth(f) * soft;
  float d = abs(fract(f) - 0.5);
  return (1.0 - smoothstep(0.0, clamp(w, 0.0008, 0.42), d)) * smoothstep(0.45, 0.16, w);
}

/**
 * The arrow. The classic pointer silhouette — tip at the origin, tail down-right — traced
 * as seven vertices, because the absorbed cursor must be recognisably *the* cursor, not a
 * chart mark standing in for it. The user has to see the thing they own being taken.
 */
const vec2 CURSOR[7] = vec2[7](
  vec2(0.000,  0.000), vec2(0.000, -0.850), vec2(0.180, -0.670), vec2(0.310, -0.980),
  vec2(0.490, -0.900), vec2(0.320, -0.590), vec2(0.620, -0.590)
);

/** Signed distance to the arrow polygon — the standard edge-walk with crossing parity. */
float sdCursor(vec2 p) {
  float d = dot(p - CURSOR[0], p - CURSOR[0]);
  float s = 1.0;
  int j = 6;
  for (int i = 0; i < 7; i++) {
    vec2 e = CURSOR[j] - CURSOR[i];
    vec2 w = p - CURSOR[i];
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    d = min(d, dot(b, b));
    bvec3 c = bvec3(p.y >= CURSOR[i].y, p.y < CURSOR[j].y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) s *= -1.0;
    j = i;
  }
  return s * sqrt(d);
}

/**
 * Gravitational lensing — the actual point-mass lens equation, traced backwards.
 *
 * Nothing here draws a black hole. This bends the coordinate the sky is *sampled* at, so every
 * star and every graticule line behind the mass arcs around it on its own. Where the earlier
 * version used an invented softened 1/r pull, this is the real relation: a ray arriving at
 * angle θ from the mass left the source plane at β = θ − θE²/θ, with θE the Einstein radius —
 * the radius at which a source exactly behind the lens is smeared into a full ring. The
 * deflection that falls out of it goes as 1/b, which is the 4GM/c²b of general relativity.
 *
 * Tracing backwards from the image plane gets the second image for free, and that is the whole
 * reason to do it this way. Inside θE the bracket goes negative, the direction flips, and the
 * pixel samples the far side of the source plane — which is precisely the faint inverted
 * counter-image that a point lens produces, appearing without being asked for.
 */
vec2 lens(vec2 s, vec2 c, float einstein) {
  vec2 d = s - c;
  float r = max(length(d), 1e-4);
  // Clamped only against the singularity at r → 0, which is inside the shadow and never seen.
  float source = clamp(r - einstein * einstein / r, -14.0, 14.0);
  return c + d * (source / r);
}

/**
 * The stream, pulled.
 *
 * Everything on this plate that travels was drifting past the mass on a straight line, and only its
 * *light* was being bent. That is half the picture: the material has mass too, and the hole is doing
 * something to it. This is the other half — gravitational focusing of the flow itself, which is a
 * different effect from the lensing and happens to the same field.
 *
 * Derived the way the lens deflection is derived, in the impulse approximation: a body crossing at
 * impact parameter b picks up a transverse kick Δv = 2GM/(bv) directed at the mass, and once it has
 * that kick it keeps it, so the displacement toward the axis grows linearly with how far downstream
 * it has travelled — Δ ≈ (2GM/v²)·x/b. So the flow does not merely bend near the hole, it *converges*
 * behind it, and the convergence tightens with distance. That wake is real: it is the same
 * gravitational focusing that concentrates a stream of matter behind any mass it passes.
 *
 * Traced backwards, like the lens: given where a star appears now, this returns where in the field it
 * came from, which is further from the axis than where it ended up. K carries the 2GM/v² and is a
 * length; y/(y² + soft) stands in for 1/y so the axis itself stays finite, and the smoothstep turns
 * the effect on across the mass rather than switching it at x = 0, because half the kick is already
 * delivered by the time a body reaches closest approach.
 */
vec2 flowPull(vec2 s, vec2 c, float k) {
  vec2 d = s - c;
  // Both of these numbers are bounds, and the first attempt had neither. y/(y² + soft) stands in for
  // 1/y, and with soft at 0.010 its slope at the axis reached 100 — which, multiplied through, gave a
  // warp gradient near 8 and compressed the field ninefold. The whole downstream half of the plate
  // came out as horizontal smear. A softening of 0.045 caps that slope at 22 and the resulting
  // gradient near a third, which bends the flow visibly without stretching it into bands.
  float soft = 0.045;
  // And the growth downstream is capped. Physically it really does keep growing — the kick is
  // permanent, so the displacement accumulates with distance travelled — but a plate is finite and
  // an unbounded term inside it only means the far edge tears. Clamped, the convergence still builds
  // behind the mass and then holds.
  float ramp = smoothstep(-0.55, 0.65, d.x);
  float reach = clamp(d.x + 0.55, 0.0, 1.4);
  // A radial falloff, and leaving it out was an error rather than an omission. With reach saturating
  // at 1.4 and then holding, the warp stayed at full strength across the whole downstream half —
  // measured, it displaced 0.059 units at the right edge against 0.036 beside the mass, so the pull
  // was *stronger* far away than close in. Gravity does not do that, and on the plate it read as the
  // top-right corner drifting for no reason anybody could point at.
  //
  // The impulse approximation this is built on only holds through the encounter anyway; far
  // downstream the stream stopped responding to the mass long ago. So the effect is confined to the
  // mass's own neighbourhood, which drops the corner by about 85% and leaves the region that matters
  // untouched.
  float fade = smoothstep(1.6, 0.5, length(d));
  float pull = clamp(k * reach * ramp * fade * (d.y / (d.y * d.y + soft)), -0.07, 0.07);
  return vec2(s.x, s.y + pull);
}

/**
 * A small nebula: a gaussian envelope over two octaves of the same value noise the dust lane
 * uses, thresholded so it arrives as wisps rather than as a blob. The centre seeds the noise,
 * which is what makes three calls with three centres three different clouds.
 */
float wisp(vec2 p, vec2 c, float size) {
  vec2 d = p - c;
  float q = dot(d, d) / (size * size);
  // Leave before paying for the noise. The envelope is e^-q and the two noise calls below are all
  // of this function's cost, so beyond three sigma there is nothing to compute but a rounding
  // error — e^-9 is about a ten-thousandth. That mattered once the field went from three wisps to
  // six: any given pixel is inside at most one of them, so this turns twelve noise calls per
  // fragment back into two. Safe as an early exit because nothing in here takes a derivative;
  // fwidth() under non-uniform control flow would be undefined, and noise() only hashes.
  if (q > 9.0) return 0.0;
  float env = exp(-q);
  // The noise is sampled in units of the wisp's own size, not in plate units, and that is a fix
  // rather than a tidy-up. At a fixed frequency the noise cell is about 0.14 across, so a wisp of
  // 0.17 got barely one cell and a wisp of 0.10 got less than one — meaning whether a small one
  // landed on high noise or low was a coin toss, and half of them came out empty. Two of the three
  // coloured pairs below vanished for exactly that reason. Normalised by size, every wisp gets the
  // same three or four cells across it whatever its scale, so size changes how big it is and
  // nothing else. The centre still seeds the pattern, so no two are the same cloud.
  vec2 dn = d / size;
  float tex = noise(dn * 1.15 + c * 3.1) * 0.62 + noise(dn * 2.30 - c * 1.7) * 0.38;
  return env * smoothstep(0.28, 0.88, tex);
}

/**
 * A wisp and its twin half a span away.
 *
 * Everything that travels on this plate wraps on span, so a single centre is only in view for part
 * of its cycle — and on the outer shells that cycle is minutes long. The first pass at the coloured
 * nebulas put them on the veil and dust shells, whose wrap periods work out at 327 and 653 seconds,
 * so two of the six were simply off-plate at any given moment and the field read as red-only.
 *
 * Two centres half a span apart fixes that by construction rather than by tuning: the gap between
 * the twins is span/2 and the plate is wider than that, so at least one of the pair is always in
 * view, whatever the aspect ratio and wherever the pan happens to have got to.
 */
float wisp2(vec2 p, vec2 c, float size, float span) {
  return wisp(p, c, size) + wisp(p, c + vec2(span * 0.5, 0.0), size);
}


/**
 * The distant galaxies — the universe behind the subject.
 *
 * Nine of them, every one at negative world x, which with this camera puts all nine *behind*
 * the hole: their depths run 18 to 36 plate units against the mass's own 14. They are placed
 * out toward the corners and the edges rather than scattered evenly, because the middle of this
 * plate belongs to the hole and its disk, and a galaxy crowding the photon ring would be
 * competing with the one thing the drawing is about. The depth spread is doing real work even
 * with a fixed eye: perspective scales each one by CAM_D/depth, so the near ones are half again
 * the size of the far ones and the field has front and back rather than just extent.
 *
 * Each is a spiral seen at its own orientation: a bulge, an exponential disk, and two
 * logarithmic arms. Two because most spirals genuinely have two — m = 2 is the dominant mode —
 * and logarithmic because a spiral galaxy's arms are log spirals to within a few degrees of
 * pitch. They do not rotate: at these distances a galaxy turns once every quarter of a billion
 * years, and a plate that visibly spun one would be lying by a factor of about 10^15.
 */
const vec3 GALAXY[9] = vec3[9](
  vec3(-12.04, -0.47, -1.89), vec3( -7.04, -0.10,  1.47), vec3(-15.72, -3.23, -1.89),
  vec3( -3.89, -1.11,  1.39), vec3( -9.95, -1.01, -2.09), vec3(-18.88, -2.14,  2.92),
  vec3( -5.08,  0.32, -0.84), vec3(-12.73, -2.93,  1.31), vec3(-17.98, -1.30,  0.23)
);

/**
 * Index 8 is not scenery: it is the one the hole gets. See the drain note in galaxyField for what is
 * actually being eaten, because it is the light and not the galaxy, and the difference matters.
 *
 * It used to bob — a 70-second sinusoid in world y that carried it across the hole's line of sight
 * and back. That was wrong twice over. It swung its image through nearly the full height of the
 * plate, which made it the one thing on here reading as an object levitating rather than as a sky
 * moving; and a galaxy does not do that, because their proper motions are nothing on any timescale a
 * person has.
 *
 * So it holds still, close to the line of sight, and is *permanently* drawn out by the lens. That is
 * not a compromise, it is what real lensed galaxies do: the Einstein Cross and the cluster arcs are
 * not events that come and go, they are fixed configurations, sheared for as long as anyone looks at
 * them. A static galaxy caught in a lens is the honest picture, and it costs a schedule to keep.
 */

/**
 * Semi-major axis, axis ratio from its own inclination, rotation on the sky, arm phase.
 *
 * The axes are sized *against* each galaxy's perspective scale rather than uniformly, so the
 * far ones are given a larger intrinsic radius and all nine arrive at a similar apparent size.
 * Left equal, the 36-unit galaxy came out a third the width of the 18-unit one and read as a
 * speck. No axis ratio goes below 0.38 either: a thinner one is geometrically fine — plenty of
 * real spirals are edge-on — but on a plate at this scale it stops reading as a galaxy and
 * starts reading as a scratch in the emulsion.
 */
const vec4 GALAXY_FORM[9] = vec4[9](
  vec4(0.190, 0.55, 0.55, 0.0), vec4(0.140, 0.80, 2.10, 1.9), vec4(0.250, 0.38, 1.35, 3.4),
  vec4(0.110, 0.92, 0.20, 5.1), vec4(0.160, 0.48, 2.65, 2.2), vec4(0.290, 0.62, 1.05, 0.7),
  vec4(0.105, 0.85, 2.95, 4.3), vec4(0.220, 0.42, 0.80, 1.2), vec4(0.230, 0.68, 1.10, 2.6)
);

/**
 * One galaxy's surface brightness at an offset d from its centre. The axis ratio is its own
 * inclination, so the field holds everything from a face-on spiral to an edge-on sliver. The
 * arms are raised to a power to sit them between the lanes rather than smear them across the
 * whole disk, and the bulge is allowed to swallow them at the centre the way a bright core does.
 */
float galaxyLight(vec2 d, vec4 form) {
  float c = cos(form.z), s = sin(form.z);
  vec2 g = mat2(c, -s, s, c) * d;
  g.y /= max(form.y, 0.055);
  float r = length(g) / max(form.x, 1e-3);
  float bulge = exp(-r * r * 11.0);
  float body = exp(-r * 2.35) * smoothstep(1.45, 0.30, r);
  float th = atan(g.y, g.x);
  float arms = 0.5 + 0.5 * cos(2.0 * (th - 2.55 * log(max(r, 0.05)) + form.w));
  return bulge * 0.85 + body * (0.28 + 0.72 * pow(arms, 2.4));
}

/**
 * The whole galaxy field, projected and summed — and the camera that does the projecting.
 *
 * World coordinates put the hole at the origin with its accretion disk in the x–z plane, so +y is
 * the disk's own axis. The eye sits on a sphere around that origin at an azimuth and an elevation,
 * looking back at the mass. Choosing those two angles is what lets the existing lens survive being
 * given a camera at all — nothing here re-derives a single term of it:
 *
 *  · The point-mass deflection is radially symmetric in the image plane, so the lens equation is
 *    correct from any direction the eye is put.
 *  · A thin axisymmetric disk looks identical from every azimuth, so the azimuth is free: it costs
 *    the disk nothing, and only the elevation touches how the annulus projects.
 *
 * The basis is built once, above the loop, and that placement is the only performance note on this
 * function worth making: it depends on neither the galaxy nor the pixel, so building it per galaxy
 * cost nine normalises and nine cross products in every fragment to arrive at nine identical
 * answers. Hoisted, it is one of each. The forward vector needs no normalise at all — the eye is
 * CAM_D times a unit vector by construction, so the unit vector is already in hand.
 *
 * Sampled at the *lensed* coordinate, which is why this is a few lines and not a special case: a
 * galaxy sitting behind the mass is sheared by the same map that already bends the graticule, and
 * one directly behind it closes toward a ring. What it must never do is brighten — lensing
 * conserves surface brightness, so an extended source is stretched and never lit. The point
 * sources on this plate take the magnification; these are handed none of it, which is the rule the
 * nebulas and the graticule already follow.
 */
float galaxyField(vec2 sky) {
  float ca = uCam.x, sa = uCam.y, se = uCam.z, ce = uCam.w;
  vec3 axis = vec3(ce * ca, se, ce * sa);
  vec3 eye = CAM_D * axis;
  vec3 fwd = -axis;
  // The right vector lies in the disk plane, perpendicular to the azimuth — which is what keeps
  // it defined at every elevation, including straight down the disk's own axis, where a cross
  // product against world up would collapse to nothing.
  vec3 rgt = vec3(-sa, 0.0, ca);
  vec3 upv = cross(fwd, rgt);

  float acc = 0.0;
  for (int i = 0; i < 9; i++) {
    vec3 rel = GALAXY[i] - eye;
    float depth = dot(rel, fwd);
    // Behind the eye is not merely off-plate, it is on the wrong side of it.
    if (depth <= 0.45) continue;
    // One divide, used twice: the perspective scale moves the galaxy and resizes it. Applied to
    // the position alone, a nearer galaxy would slide across the field without ever growing.
    float k = CAM_D / depth;
    vec2 at = vec2(dot(rel, rgt), dot(rel, upv)) * k;
    vec4 form = GALAXY_FORM[i];
    form.x *= k;
    acc = max(acc, galaxyLight(sky - at, form));
  }
  return acc;
}


/**
 * A meteor. Each slot fires on its own hashed period: a hashed cycle picks a starting point
 * along the top of the plate and a diagonal, the head runs the chord for under a second with
 * a tail dying quadratically behind it, and the rest of the period is silence. Two slots on
 * mutually indifferent periods make the schedule feel like weather rather than a loop.
 */
float meteor(vec2 p, float t, float seed, float px) {
  float period = 9.0 + 7.0 * hash(vec2(seed, 4.7));
  float cycle = floor(t / period + seed);
  float ft = fract(t / period + seed) * period;
  float life = 0.9;
  if (ft > life) return 0.0;
  vec2 h = hash2(vec2(seed * 13.7, cycle));
  vec2 a = vec2(mix(-1.7, 1.7, h.x), mix(0.35, 1.05, h.y));
  vec2 dir = normalize(vec2(mix(-0.9, 0.9, hash(vec2(cycle, seed + 2.2))), -1.0));
  vec2 head = a + dir * 2.4 * ft;
  vec2 d = p - head;
  float along = dot(d, dir);
  vec2 perp = d - dir * along;
  float width = max(0.0065, px);
  float core = exp(-dot(perp, perp) / (width * width));
  float t01 = clamp(-along / 0.34, 0.0, 1.0);
  float tail = (1.0 - t01) * (1.0 - t01) * smoothstep(0.03, 0.0, along);
  float headGlow = exp(-dot(d, d) / (0.02 * 0.02));
  return (core * tail + headGlow) * smoothstep(0.0, 0.10, ft) * smoothstep(life, life * 0.5, ft);
}

/**
 * An incursion: a gravitational wave passing through the plate.
 *
 * What used to be a directionless gaussian buckle is now the strain a quadrupole wave actually
 * applies: space stretched along one axis and squeezed along the perpendicular one, the axes
 * set by a slowly drifting polarisation angle, the whole pattern rippling outward from its
 * centre at a fixed phase speed. Two of these ride long, mutually prime drift periods, each
 * breathing right down through zero so the event arrives, holds and is gone. The displacement
 * comes back with its envelope, because the envelope is also the blur — stars seen through
 * strained space swim out of focus.
 */
vec3 gwave(vec2 p, vec2 c, float t, float w, float k, float breathe, float psi) {
  vec2 d = p - c;
  float env = exp(-dot(d, d) * 4.8) * breathe;
  // 0.22, down from 0.80, and the reason is arithmetic rather than taste.
  //
  // This term is a *displacement that oscillates*, and at the old amplitude it reached 0.098 plate
  // units at the top-right corner on a six-second period — while the steady drift it rides on covers
  // 0.030 units in the same time. So the back-and-forth was three times larger than the travel, which
  // is precisely what makes something read as levitating instead of moving: it bobs rather than goes
  // anywhere. Worse, the two wave centres roam right through the upper right — at t = 20 s they sit at
  // (1.22, 0.33) and (0.78, 0.32) — so that corner got the worst of it.
  //
  // It was always the loudest exaggeration on the plate. Real strain is of order 10^-21; nothing
  // about a passing gravitational wave is visible to anybody without a four-kilometre interferometer,
  // so cutting this is strictly the more honest direction. At 0.22 the peak is 0.027 units, just under
  // the drift, and the incursion reads as a shimmer passing through rather than a patch of sky
  // swimming.
  //
  // Only the displacement is cut. env is returned untouched, so the blur and the swelling of the star
  // cores — stars going soft because the space they are seen through is not flat — keep their full
  // strength. That cue never caused the bobbing; the offset did.
  float h = env * 0.22 * sin(t * w - length(d) * k);
  float c2 = cos(2.0 * psi);
  float s2 = sin(2.0 * psi);
  // The quadrupole: the + polarisation rotated to psi. Along the axis space stretches, across
  // it space squeezes — which is why a grid inside it goes oval rather than merely sideways.
  vec2 disp = 0.5 * h * vec2(c2 * d.x + s2 * d.y, s2 * d.x - c2 * d.y);
  return vec3(disp, env);
}

/**
 * An asteroid, and the two things that make one look like a rock rather than a dot.
 *
 * The first is its light curve. An asteroid is not round and does not shine on its own, so what
 * varies is how much sunlit cross-section it happens to be presenting — and a long body presents
 * its broad side *twice* per rotation, so the curve is double-peaked at twice the spin frequency.
 * That is the single most characteristic thing about asteroid photometry, and amplitudes of a few
 * tenths of a magnitude are ordinary. It is also why these read as tumbling instead of blinking.
 *
 * The second is what the hole does to one that comes too close. A rubble pile has no tensile
 * strength worth the name — it is held together by its own weak gravity alone — so it comes apart
 * where the tide beats that, which is the Roche limit. The stretch is applied along the radial
 * line, because that is the axis a real one is pulled out along, and it goes as 1/r³ like the tide
 * itself: nothing at all out in the field, and violent once inside. Sampling at a compressed
 * coordinate along the axis is what draws it longer.
 *
 * They are drawn against the lensed sky like everything else out here, so the chord they travel
 * arcs on its own near the mass and the drain takes the ones that get too close. Slower and much
 * fainter than the meteors, and without a tail — a meteor's tail is ablation in an atmosphere, and
 * there is no atmosphere out here for a rock to burn in.
 */
float asteroid(vec2 p, vec2 holeAt, float t, float seed, float px) {
  float period = 26.0 + 19.0 * hash(vec2(seed, 8.3));
  float cyc = floor(t / period + seed);
  float u = fract(t / period + seed);
  vec2 h = hash2(vec2(seed * 9.1, cyc));
  // In on a hashed heading from a hashed point, and straight — the lens supplies the curvature.
  vec2 a0 = vec2(mix(-1.9, 1.9, h.x), mix(-1.0, 1.0, h.y));
  float ang = hash(vec2(cyc, seed + 4.4)) * 6.2831853;
  vec2 dir = vec2(cos(ang), sin(ang));
  vec2 at = a0 + dir * (4.2 * u - 2.1);
  vec2 d = p - at;

  vec2 g = at - holeAt;
  float gr = max(length(g), 1e-4);
  vec2 rad = g / gr;
  float tide = min(0.85 * pow(0.34 / gr, 3.0), 7.0);
  float al = dot(d, rad);
  d = rad * (al / (1.0 + tide)) + (d - rad * al);

  float spin = 1.1 + 2.4 * hash(vec2(seed + 5.5, cyc));
  float curve = 0.62 + 0.38 * cos(2.0 * (t * spin + hash(vec2(cyc, seed)) * 6.2831853));

  float w = max(0.0075, px);
  float dd = dot(d, d);
  float core = exp(-dd / (w * w)) + 0.28 * exp(-dd / (0.017 * 0.017));
  // Faded at both ends of the chord so none of them winks into being mid-plate.
  return core * curve * smoothstep(0.0, 0.10, u) * smoothstep(1.0, 0.90, u);
}

/**
 * The accretion disk's light at an offset d from the hole, sampled through the lens: the
 * far side of the annulus folds up over the shadow and arrives as the arc riding the ring,
 * its inverted twin hugging the underside — nothing here draws either arc. The shadow
 * itself stays clean: a band across it was tried and retired, because at this size the
 * plate reads better with the dark disc unbroken.
 *
 * The disk is a thin annulus from the innermost stable orbit at 3 rs out to 9 rs, seen at
 * ~83° of inclination — the camera riding just above the disk plane, which is where the
 * film put it. Its light is Keplerian speed √(rs/2r), Doppler beaming, and gravitational
 * redshift — but the beaming arrives heavily muted, at anderthalb power instead of cubed,
 * because that is the film's own call: Thorne's full asymmetry left half the disk missing
 * and Nolan had it evened out rather than explain it. A hot rim just outside the ISCO
 * carries the brightness the film put there, and the whole thing runs through a soft-knee
 * tonemap, 1 − e^(−x), so the inner band saturates into an even blaze instead of clipping
 * into a flat wedge — blown out the way film stock blows out, not the way a clamp does.
 *
 * The texture is silk, not smoke: two octaves of noise stretched long along the flow and
 * fine across it, at low contrast, carried on annular bands that each turn at their own
 * Keplerian rate — banded because a continuous shear winds any pattern below pixel scale
 * within minutes, and the finer octave shearing 35% faster than the lanes it rides is the
 * turbulence. The streaks live in the disk's midtones; the blaze at the rim is allowed to
 * swallow them exactly as an overexposed frame would.
 *
 * The last term is bloom without a blur pass: a taller, fainter ellipse of haze riding the
 * same annulus, carrying the same muted beaming. Nearly off on paper, where haze reads as
 * a thumbprint.
 */
float diskLight(vec2 d, float rs, float t, float shadow) {
  // The inclination is the camera's now, not a constant. cosI is the sine of the eye's
  // elevation above the disk plane — the factor an orthographic projection squashes a circle's
  // vertical extent by — and sinI is its cosine, the line-of-sight component the Doppler
  // beaming is taken along. Both fall straight out of the camera's basis, so tilting the view
  // opens the annulus from a knife-edge into a full ellipse without a term here knowing that
  // anything moved. At the default elevation these are the 0.125 and 0.992 they always were.
  // Floored where the disk is exactly edge-on and the divide would run away; the CPU clamps
  // the elevation to the same place, so the floor is a guard rather than a working value.
  float cosI = max(uCam.z, 0.05);
  float sinI = uCam.w;
  vec2 dplane = vec2(d.x, d.y / cosI);
  float diskIn = 3.0 * rs;
  float diskOut = 9.0 * rs;
  // The wrap. A flat lens leaves a void around the shadow — the radii it hands this
  // function dive inside the inner edge, where nothing emits, and the disk used to arrive
  // as two flaps floating beside a separate ring. In the film's render that void is filled
  // by light that crossed the disk plane more than once on its way around the mass.
  // Folding the radius back across the inner edge is this plate's version of the same
  // thing: a pixel the lens sends inside the edge samples the inner annulus again, so the
  // wings, the crown and the ring of light around the shadow are one piece of material
  // seen more than once — the lanes bend around the hole because they are the lanes,
  // continued.
  float rd0 = max(length(dplane), 1e-4);
  float rd = diskIn + abs(rd0 - diskIn);
  // Every per-orbit factor stays clamped at the ISCO, which the fold now enforces by
  // construction — and it keeps β from passing 1 where the raw radius ran through zero.
  float rdc = max(rd, diskIn);
  // The camera's azimuth is added in, so the turbulence is pinned to the *material* rather
  // than to the screen. Left out, swinging the view would drag every lane around with it and
  // the one thing azimuth is supposed to cost this disk — nothing — would become a visible
  // smear of the entire texture.
  float phi = atan(dplane.y, dplane.x) + atan(uCam.y, uCam.x);
  // The rotation is the point of the disk, so it is allowed to be seen: the inner lanes lap
  // the hole in a few seconds and the outer ones in tens, on the same r^(-3/2) law.
  float bandR = max((floor(rd * 32.0) + 0.5) / 32.0, diskIn);
  float whirl = 0.34 / pow(bandR, 1.5);
  float coarse = noise(vec2(rd * 40.0, (phi - whirl * t) * 2.6));
  float fine = noise(vec2(rd * 110.0, (phi - whirl * t * 1.35) * 7.0) + 7.3);
  // Contrast pitched so the streaks live in the tonemap's midtones across most of the
  // disk — silk was tried and the rotation vanished into it; a whirl nobody can see is
  // not a whirl.
  float lanes = 0.42 + 0.42 * coarse + 0.26 * fine;
  float beta = sqrt(rs / (2.0 * rdc));
  float dopp = pow(1.0 / (1.0 - beta * sinI * (dplane.x / rdc)), 1.5);
  // The Doppler flip. Inside the fold the lens is showing the counter-image of the
  // opposite limb, so the raw beaming changes sides right at the ring — a dim sliver
  // hugging the shadow on the bright side, which is precisely what read as the wing
  // floating free of the hole. But the wrap is light from every part of the orbit at
  // once, so its beaming is blended flat, and the wings fade smoothly into an evenly
  // lit ring instead of docking against their own dimmed reflection.
  float foldMix = smoothstep(diskIn * 1.1, diskIn * 0.5, rd0);
  float doppEff = mix(min(dopp, 3.5), 1.15, foldMix);
  float gfac = sqrt(max(1.0 - rs / rdc, 0.0));
  float rim = 1.0 + 1.0 * smoothstep(diskIn * 1.9, diskIn * 1.02, rd);
  float body = pow(rs / rdc, 1.7) * 17.0
    * smoothstep(diskOut * 1.25, diskOut * 0.75, rd)
    * lanes * rim * doppEff * gfac;
  float film = 1.0 - exp(-body);
  vec2 hp = vec2(d.x, d.y / 0.42);
  float hr = length(hp);
  float haze = smoothstep(diskIn * 0.85, diskIn * 1.15, hr)
    * smoothstep(diskOut * 1.5, diskIn * 1.1, hr)
    * (0.25 + 0.75 * min(dopp, 3.5) / 3.5)
    * mix(0.10, 0.03, shadow);
  return max(film * mix(0.92, 0.62, shadow), haze);
}

/**
 * The pulsar: a lighthouse, drawn from above.
 *
 * Two beams leave the magnetic poles a hundred and eighty degrees apart and sweep with the
 * star's rotation, and a distant observer sees a pulse each time one crosses the line of
 * sight. That is the whole of the lighthouse model, and it is the reason the object has a
 * period at all — nothing about the star is blinking, only its aim. Both beams are drawn
 * faintly at all times, because a top-down view of a lighthouse shows you the beam that is
 * not currently pointed at you; the flash is carried by the core.
 *
 * The beam is a cone of roughly eighteen degrees half-width at rest, which puts the duty cycle
 * near a tenth of the period. Real pulsars are narrower — a few percent is typical — but a few
 * percent of this star's 0.6 s period is an eighteen-millisecond flash, and at sixty frames
 * a second that is one frame, seen or missed depending on where the raster lands.
 *
 * The cone is not a constant, though, and what widens it is the same thing that speeds the star
 * up. A pulsar's beam comes off the open field lines over the polar cap, and the cap's angular
 * size is θ ≈ asin√(RΩ/c) — so it grows as the square root of the spin. A star that has been
 * spun up by accretion therefore flashes both faster *and* wider, and its duty cycle climbs on
 * both counts. That is handed in as uPsrLit.z, which is √(Ω/Ω₀).
 *
 * Nothing here decides *when* it flashes. The spin, the accretion torque, the two time dilations
 * and the Doppler shift are integrated on the CPU across the whole flyby and arrive as an angle,
 * a flux and a spread; this function draws the star where it is told.
 */
vec2 pulsar(vec2 s, vec2 at, float ang, float flash, float spread, float px) {
  vec2 d = s - at;
  vec2 axis = vec2(cos(ang), sin(ang));
  // Absolute value on both projections folds the two poles onto one evaluation: the beam and
  // its antipode are the same cone, drawn once and mirrored through the star.
  float along = abs(dot(d, axis));
  float across = abs(dot(d, vec2(-axis.y, axis.x)));
  // Thin, and thin on purpose. The drawn wedge and the flash *timing* are two separate controls,
  // which is what makes this safe: PSR_BEAM sets the duty cycle on the CPU, and the numbers here
  // set only how wide the cone looks. So the wedge can be narrowed hard — 0.30 to 0.14, and the
  // hairline base from 0.013 to 0.008 — without the flash collapsing to a single frame, which is
  // the reason it was ever broad. It is also the more honest shape: a real pulsar's beam is a few
  // percent of the sky, not eighteen degrees of it.
  //
  // The cube rather than the square is the contrast. Squared, the lobe falls off gently and the
  // beam reads as a soft wedge with a bright middle; cubed, the edge is close to a hard line and
  // what is left is a blade of light. Same for the reach, which now falls off faster along the
  // beam so it tapers to a point instead of stopping.
  float halfW = 0.008 + along * 0.14 * max(spread, 0.2);
  float lobe = 1.0 - clamp(across / halfW, 0.0, 1.0);
  float reach = max(1.0 - along / 0.34, 0.0);
  float beams = lobe * lobe * lobe * reach * reach * reach;

  // Core, halo, glow. The proportions matter more than they look like they should, and both
  // times they were wrong it was the same mistake in a different direction: first the core was
  // a hundredth of a unit against beams a quarter of one, so the star came out a bare streak
  // with nothing at the middle of it — a shard, not an object. Then the whole thing was sized
  // against a test render twice the width of the real plate, where it shrank to a blue speck.
  // These are set against the plate's own furniture: the halo is about a quarter of the
  // shadow's radius, the beams a little under twice it.
  float dd = dot(d, d);
  float w = max(0.0200, px);
  float core = exp(-dd / (w * w))
    + 0.50 * exp(-dd / (0.045 * 0.045))
    + 0.16 * exp(-dd / (0.105 * 0.105));

  // Split, because the two halves lens differently: a point source collects its magnified
  // flux into the same dot and brightens, an extended one does not. Caller applies it.
  // And the contrast between off and on is widened at both ends: the idle beam drops from 0.15 to
  // 0.05 and the lit one climbs from 0.70 to 0.95, so the sweep past the line of sight is a snap
  // rather than a swell. The faint always-on pair is still there — a lighthouse seen from above
  // does show you the beam that is not currently pointed at you — but only just.
  return vec2(core * (0.46 + 0.54 * flash), beams * (0.05 + 0.90 * flash));
}

/**
 * One magnitude class of the catalogue.
 *
 * A hashed grid: each cell either holds a star or does not, and the ones that do place it at a
 * hashed offset so nothing lands on a lattice. Three of these at different scales, panning at
 * different rates, make the sky — the rate difference is the parallax, and the parallax is the
 * only reason a flat plate reads as depth.
 *
 * Every star is a tight core, a halo and — on the brighter half — two crossed diffraction
 * spikes. The halo is the one part that cannot be shared between the themes: on a night
 * ground it is a glow, and on paper the identical mark is a smudge. So it arrives as a
 * parameter and is all but switched off in the light theme, where a printed chart wants a
 * hard dot and nothing around it. The core is never allowed below a device pixel: sub-pixel stars
 * scintillate on their own as the field slides, which reads as a rendering fault rather than
 * as an atmosphere.
 *
 * No derivatives in here: the loop skips empty cells, so control flow is non-uniform and
 * fwidth() would be undefined. Hence px arriving as an argument.
 */
float catalogue(vec2 p, float scale, float cut, float t, float bright, float px, float swell, float glow, float dil) {
  vec2 g = p * scale;
  vec2 cell = floor(g);
  vec2 f = g - cell;
  float acc = 0.0;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      vec2 id = cell + o;
      float pick = hash(id);
      if (pick > cut) continue;

      vec2 at = o + 0.18 + 0.64 * hash2(id + 3.1);
      vec2 dv = (f - at) / scale;
      float d = length(dv);

      // Magnitude, squared so bright stars are rare — an even spread of brightness reads as
      // noise, and the legibility of a star field is entirely in its few anchors.
      float m = hash(id + 7.7);
      m *= m;

      // Scintillation. Each star gets its own rate as well as its own phase: a field on one
      // shared rate pulses like a cursor, and it is the spread of rates that makes a sky look
      // like many separate things rather than one thing blinking.
      // "dil" is the local rate of time at this pixel, from the Schwarzschild factor. A star
      // seen close to the mass is being watched through slowed time, so it blinks slower — the
      // one place on this plate where the clock is not the same everywhere.
      float rate = 0.60 + 2.00 * hash(id + 19.3);
      float mag = bright * mix(0.62, 1.0, m) * (0.60 + 0.40 * sin(t * rate * dil + pick * 51.0));

      // Sizes are in plate units, which are independent of device pixels — a star is the same
      // size on the page at 1× and at 2×. The pixel floor is only a floor, and it must not be
      // what decides how big a star is: sized off px, the whole catalogue halved on a retina
      // screen and the field turned to specks.
      float core = max(mix(0.0110, 0.0240, m), px) * swell;
      float halo = 0.045 + 0.040 * m;

      float spike = 0.0;
      if (m > 0.28) {
        float across = core * 0.62;
        spike = m * 0.24 * (
          exp(-(dv.y * dv.y) / (across * across)) * exp(-abs(dv.x) / (0.030 + 0.060 * m)) +
          exp(-(dv.x * dv.x) / (across * across)) * exp(-abs(dv.y) / (0.022 + 0.042 * m))
        );
      }

      acc = max(acc, mag * (
        exp(-(d * d) / (core * core)) + spike + glow * m * exp(-(d * d) / (halo * halo))
      ));
    }
  }
  return acc;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  // Origin at the centre of the plate, where the hole sits, isotropic: one unit is half the plate height on both axes.
  vec2 p = (uv - 0.5) * vec2(uSize.x / uSize.y, 1.0) * 2.0;

  // One device pixel, in plate units — used only as a floor on how thin a line may get. Sizes
  // here are otherwise in plate units, so the drawing is the same size on the page at 1× and
  // at 2×. Sized off px instead, everything halved on a retina screen: hairlines came out at
  // a third of a CSS pixel and the whole plate rendered as a faint dusting of specks.
  float px = 2.0 / uSize.y;
  float hair = max(0.0060, px);

  // The hole no longer travels: it holds the centre, because it is the catalogued object this
  // plate is about, and the sky streams through its lens instead — which keeps stars arcing,
  // doubling and flaring in view for as long as anyone watches. Pinned dead still: it briefly
  // had a breathing drift, and even that read as the hole waving — the fixed point of the
  // whole page has no business waving. Everything else travels around it: the star layers,
  // the nebulas, and the occasional meteor.
  float span = (uSize.x / uSize.y) * 2.0 + 1.4;
  // The seat is handed in rather than fixed here. On the plate it is the constant it always
  // was; on the event horizon overlay it travels, because a hole that grows out of the dot
  // closing the document has to start where that dot is and then take the middle of the screen.
  vec2 holeAt = uSeat;

  // One stream, and it is one number.
  //
  // The field used to pan on four separately chosen rates, which is four independent motions and
  // reads as four sheets sliding over one another rather than as a sky going past. There is a
  // single velocity through the field now, and every shell's apparent rate is that velocity
  // divided by its own distance — which is what parallax *is*, and the only honest reason a near
  // shell may cross faster than a far one.
  //
  // The distances are the shells' own grid scales, because those were never two separate facts: a
  // shell twice as far away shows twice as many stars across the same patch of sky and slides
  // half as fast. Both follow from the one distance, so both are now read off it.
  //
  // Solving the four old rates for a common velocity gives 0.197, 0.200, 0.184 and 0.195 — the
  // field was already a single stream to within a few percent, and nobody had noticed. So this
  // costs the plate nothing it had and buys it a reason.
  //
  // Then slowed to 0.130, a third off. At the old rate the field read as drifting *past* the hole,
  // busy enough that the one thing worth watching — the mass bending the flow into itself — was
  // lost in the traffic. A calmer stream lets the pull below be the motion you notice.
  float streamV = 0.130;
  const float SHELL_NEAR = 2.9;
  const float SHELL_MID = 5.0;
  const float SHELL_DEEP = 8.0;
  const float SHELL_VEIL = 13.0;
  const float SHELL_DUST = 26.0;

  // One free parameter, the Schwarzschild radius; everything else about the hole follows from
  // it the way it does in the real object. The dark disc is not the horizon — it is the photon
  // capture cross-section at √27/2 · rs ≈ 2.598 rs, which is what an observer actually sees and
  // is why a black hole always looks larger than its own horizon. The Einstein radius is the
  // one genuinely free choice here, since it depends on distances this scene does not have —
  // it is set just outside the capture radius, so the strong-lensing region hugs the shadow
  // the way it does when the source sky sits far behind the lens, and the far side of the
  // disk folds up against the ring instead of floating above it.
  // Handed in for the same reason the seat is: the overlay's hole grows, and the growth is
  // this one number moving. It was a constant here with a copy on the CPU and a comment asking
  // whoever edited one to remember the other; there is one source for it now.
  float rs = uRs;
  float holeR = 2.598 * rs;
  // Held at a fixed ratio to the capture radius rather than as an absolute, which it was while
  // rs was a constant and the two happened to agree. They stop agreeing the moment the hole
  // grows: at the horizon overlay's final size a literal 0.25 would put the entire strong-lensing
  // region *inside* the black disc, so the far side of the disk would have nothing to fold up
  // against and the ring would come apart. 1.283 is 0.25 / (2.598 · 0.075) — the plate renders
  // exactly what it rendered before, and every other size now renders the same picture scaled.
  float einstein = holeR * 1.283;

  // Time, bent. Two separate relativistic effects, and they show up in different ways:
  //
  //  · dilation — the Schwarzschild factor √(1 − rs/r), which is the rate a distant observer
  //    sees a clock tick at radius r. It runs to zero at the horizon and to one far away. It
  //    is taken from the shadow edge rather than the horizon itself, because the horizon is
  //    hidden inside the shadow and a gradient nobody can see is not worth computing. Stars
  //    near the mass blink slower; the effect is continuous, so there is no edge to it. It is
  //    also, now, what decides whether a star survives its pass — see the drain below.
  //  · Shapiro delay — light passing close to a mass takes measurably longer to arrive, by an
  //    amount going as ln of the impact parameter. This is a fixed lag, not a slower rate, so
  //    the sky near the hole sits a constant interval behind the sky around it and the field
  //    shears rather than tears. A rate difference would have wound the two apart without
  //    bound and eventually ripped the plate in half.
  //
  //    The lag being a *function of radius* is what makes the stream visibly slow as it is drawn
  //    in, without any rate anywhere being changed. A star moving inward moves into a larger lag,
  //    and the growth of that lag subtracts from its apparent motion — the chain rule doing the
  //    work a rate change would have done unsafely. The coefficient sets how much: at 19 the near
  //    shell loses about a third of its speed just outside the shadow, which is too polite to
  //    read as a capture, and the ceiling is the value at which the innermost flow would slow
  //    past a stop and appear to run backwards. 30 sits between the two — roughly a half to two
  //    thirds of the speed gone at the edge — so the stream is seen to hesitate and hang there.
  float holeDist = length(p - holeAt);
  float dil = sqrt(clamp(1.0 - holeR / max(holeDist, holeR), 0.0, 1.0));
  float shapiro = 30.0 * rs * log(1.0 + 3.0 * holeR / max(holeDist, holeR * 0.6));
  float tSky = uTime - shapiro;

  // The sky is sampled through everything that bends it, in the order light would meet them.
  // The cursor is not one of those things: a chart's promise is that the positions on it are
  // true, so only mass bends the chart. The traffic runs the other way — at the end of main,
  // the mass bends the cursor.
  vec2 sky = p;

  // Frame dragging. The hole is given a little spin, and spin drags the space around it
  // azimuthally — Lense–Thirring, falling off fast with distance. Like the Shapiro term this
  // is a fixed twist rather than a rate: a rate would wind the sky around the hole without
  // bound, and the imprint of a steadily rotating mass on a steady sky is itself steady.
  vec2 dh = sky - holeAt;
  float drag = 0.60 * pow(holeR / max(length(dh), holeR), 2.0);
  sky = holeAt + mat2(cos(drag), -sin(drag), sin(drag), cos(drag)) * dh;

  sky = lens(sky, holeAt, einstein);

  // Magnification. The lens above moves images; this brightens them. The point-lens total
  // magnification, (u² + 2) / (u √(u² + 4)) with u the source offset in Einstein radii — and
  // it is applied only to point sources further down, because lensing conserves surface
  // brightness: an extended thing like the graticule bends but never brightens, while an
  // unresolved star collects all of its magnified flux in the same dot. So a star drifting
  // behind the hole flares, stretches, and at alignment becomes a ring — the plate's
  // recurring event, free with the streaming sky. Clamped where the divergence at u = 0
  // would outshine everything; six is as loud as this chart speaks.
  float uSrc = length(sky - holeAt) / einstein;
  float magn = min((uSrc * uSrc + 2.0) / max(uSrc * sqrt(uSrc * uSrc + 4.0), 1e-3), 6.0);

  // Everything from here to the disk is the *field* — the sky the hole sits in — and every bit
  // of it is gated on uField, which runs from 1 at rest to 0 while the hole is eating the page.
  //
  // It drains because the hole is taking the field too. The plate already has a drain: every star
  // is multiplied by the Schwarzschild factor, so the ones that pass too close go out. This is
  // that idea at the scale of the whole sky — while the document is being swallowed the starlight
  // goes with it, and what is left at the bottom of it is the subject alone: the lens, the shadow,
  // the disk, the photon ring. A hole in a void, which is the right picture for a page that has
  // just been eaten.
  //
  // The gate is a skip rather than a fade, and that is worth something exactly when it fires. At
  // uField = 0 the four star shells, the nine galaxies, the twelve nebula wisps, the two wave
  // integrals, the meteors, the asteroids and the three pulsars are not evaluated at all — and
  // zero is reached at the moment the hole is at its fattest, where rs is three and a half times
  // its resting value and the disk covers most of the plate. The most expensive frames are the
  // ones that stop paying for a sky nobody can see.
  //
  // Every branch is on a uniform, so control flow stays uniform across the wavefront and there is
  // no divergence to pay for. The multiplications by uField carry the partial values in between.
  float anomaly = 0.0;

  // The incursions, as strain: displacement applied to the sky, envelopes kept for the blur.
  if (uField > 0.0) {
    float breathe1 = smoothstep(0.30, 0.95, sin(uTime * 0.047) * 0.5 + 0.5);
    float breathe2 = smoothstep(0.38, 0.98, cos(uTime * 0.031) * 0.5 + 0.5) * 0.7;
    vec3 wave1 = gwave(sky, vec2(sin(uTime * 0.061) * 1.30, cos(uTime * 0.043) * 0.50), uTime, 1.05, 3.1, breathe1, uTime * 0.021);
    vec3 wave2 = gwave(sky, vec2(cos(uTime * 0.037) * 1.05, sin(uTime * 0.029) * 0.58), uTime, 0.83, 2.6, breathe2, 1.7 - uTime * 0.017);
    // The strain is held out of the lens's neighbourhood. Near the mass, spacetime is the
    // hole's, and a passing ripple is a rounding error on it — and on the plate, a wobbling
    // shadow reads as a broken shadow. The waves own the field; the hole owns its ground.
    float calm = smoothstep(0.30, 0.85, length(p - holeAt));
    sky += (wave1.xy + wave2.xy) * calm * uField;
    anomaly = clamp(wave1.z + wave2.z, 0.0, 1.0) * calm * uField;
  }

  // The flow, pulled toward the mass. Applied to the streaming field only — the stars, the dust and
  // the nebulas — and deliberately not to the galaxies, which sit at fixed world positions and are
  // not part of this current, nor to the pulsar, whose infall is integrated properly on the CPU and
  // would be counted twice.
  vec2 flow = uField > 0.0 ? flowPull(sky, holeAt, 0.018) : sky;

  // The graticule: meridians and parallels, each bowed a little by the other's coordinate, so
  // the grid carries the suggestion of a projected sphere before anything bends it. It is the
  // paper, not the subject — but it is also the only thing on the plate whose *shape* is known
  // in advance, which is what makes it the instrument that shows the lensing.
  vec2 q = vec2(sky.x * (1.0 + 0.055 * sky.y * sky.y), sky.y + 0.045 * sky.x * sky.x);
  float graticule = uField > 0.0
    ? max(contour(q.x * 1.35, 3.0), contour(q.y * 1.35, 3.0)) * 0.075 * uField
    : 0.0;

  // A dust lane, drifting with the deep sky. Two octaves of value noise inside a soft diagonal
  // band, at a few percent — enough that the field is not evenly empty, never enough to read
  // as a cloud someone painted.
  // The dust rides the stream too, on the farthest shell of all — which is why it barely moves.
  // It was the one thing on the plate reading its own clock rather than the sky's; now it carries
  // the same delay as everything else out there, because it is out there.
  float dust = 0.0;
  if (uField > 0.0) {
    vec2 dustAt = flow * vec2(0.9, 2.1) - vec2(tSky * (streamV / SHELL_DUST), 0.0);
    dust = (noise(dustAt * 1.7) * 0.65 + noise(dustAt * 3.9) * 0.35);
    dust *= smoothstep(0.95, 0.10, abs(sky.y * 1.6 - sky.x * 0.28)) * mix(0.030, 0.016, uShadow) * uField;
  }

  // Small nebulas, where the wormhole used to be. Three wisps riding two of the sky's depth
  // layers, wrapping on the same span as everything else that travels — so they cross, leave,
  // and come back around, and the parallax between the pair and the loner is one more depth
  // cue for free. Extended sources, so like the graticule they bend through the lens without
  // brightening.
  // Nebulas ride the two farthest shells, and the reason is their size rather than a look.
  //
  // They do drift, and that is not the nebula moving: nothing about a real one changes on a human
  // timescale — the Orion Nebula's internal motions come to about a thousandth of an arcsecond a
  // year — so what this is showing is parallax, the same streaming that carries the star field. A
  // static object in a moving field still slides.
  //
  // But it must slide at the rate its *distance* dictates, and a nebula is vastly larger and further
  // off than the near stars, so it belongs at the back where almost nothing moves. They were on the
  // deep and mid shells, which had them crossing faster than the stars behind them — backwards. The
  // only reason they were ever put there was to keep them in view, and the twinning above removed
  // that reason: on a shell whose wrap period is five minutes, one of a twinned pair is still always
  // on the plate. So they go where they belong and stay visible anyway.
  float nebula = 0.0;
  float nebHa = 0.0;
  float nebO3 = 0.0;
  float nebRef = 0.0;
  if (uField > 0.0) {
    vec2 nebA = flow + vec2(mod(tSky * (streamV / SHELL_VEIL) + span * 0.31, span) - span * 0.5, 0.0);
    vec2 nebB = flow + vec2(mod(tSky * (streamV / SHELL_DUST) + span * 0.77, span) - span * 0.5, 0.0);
  // Twinned like the coloured ones, for the same reason: these shells are slow enough that a single
  // centre would be off-plate for minutes at a time.
    nebula = wisp2(nebA, vec2(-0.72, 0.47), 0.17, span)
           + wisp2(nebA, vec2(0.95, -0.50), 0.21, span)
           + wisp2(nebB, vec2(0.18, 0.62), 0.13, span)
           // Three more, smaller — filling the space the asterism left without putting another
           // drawn figure there.
           + wisp2(nebA, vec2(-1.10, -0.42), 0.085, span)
           + wisp2(nebB, vec2(1.08, 0.34), 0.070, span)
           + wisp2(nebB, vec2(-0.30, -0.66), 0.095, span);
    nebula *= mix(0.085, 0.045, uShadow) * uField;

  // Colour, out in the far field — and it passes the plate's own rule rather than bending it.
  //
  // The rule is that only things which are emitting get a hue, and what they emit has to set it.
  // A nebula qualifies more sharply than a blackbody does, because its light is not a continuum at
  // all: it arrives in discrete lines, and the lines are why these objects look the way they do.
  //
  //  · Hα at 656.3 nm — hydrogen recombining in an H II region, and the reason Orion is red.
  //  · O III at 500.7 nm — a forbidden transition, only possible at densities this low, and the
  //    reason planetary nebulae are that particular unmistakable teal.
  //  · Reflection is not emission at all: dust scattering a nearby star, and it comes out blue for
  //    the same Rayleigh reason the daytime sky does — short wavelengths scatter far more readily.
  //
  // Carried on the deepest shells, so they sit behind everything and drift slowest. Kept faint:
  // these are a few percent of the ink, because a bright nebula on an atlas plate reads as a
  // printing error, and the point is a wash of colour at the edge of noticing.
  // Moved onto the deep and mid shells — the veil and dust shells drift so slowly that a nebula on
  // them is off-plate for minutes at a stretch — and each is a twinned pair, so one is always in
  // view. Kept to |x| under about 1.15 as well: the plate's edge mask passes only a quarter to a
  // half of the ink out past that, which is the same trap the galaxies fell into.
    nebHa = wisp2(nebA, vec2(-1.02, 0.54), 0.160, span)
          + wisp2(nebB, vec2(-0.56, -0.72), 0.115, span);
    nebO3 = wisp2(nebB, vec2(0.88, 0.30), 0.125, span)
          + wisp2(nebA, vec2(1.06, -0.44), 0.105, span);
    nebRef = wisp2(nebA, vec2(0.34, -0.66), 0.140, span)
           + wisp2(nebB, vec2(-1.14, 0.20), 0.120, span);
  // And a real amplitude. Colour only reads where the tinted thing is most of the ink in its pixel,
  // so a wash at a few percent comes out as grey with an opinion; this is faint but actually hued.
    float nebTint = mix(0.70, 0.40, uShadow) * uField;
    nebHa *= nebTint;
    nebO3 *= nebTint;
    nebRef *= nebTint;
    nebula = max(nebula, nebHa + nebO3 + nebRef);
  }

  // The galaxies, far out in the field where there is room for them — the hole keeps the
  // centre, and these are scenery at eight to thirty units. Extended sources, so like the
  // nebulas and the graticule they shear through the lens without ever brightening. They stay
  // in the page's own ink: a galaxy is starlight in bulk, and the plate reserves colour for the
  // things on it that are emitting at a temperature of their own.
  // The amplitude has to carry the plate's own edge mask, which is severe out where these live:
  // it passes only about a quarter to a half of the ink at these positions, and an earlier pass
  // placed them further out still, where it passed seven percent and they were invisible.
  // Drained like the star field, and for the same reason: light that comes too close to the mass is
  // captured, and dil runs to zero exactly at the capture radius. This is what the doomed galaxy
  // above is actually for, and it is worth being exact about what happens to it. A black hole
  // cannot eat a galaxy — a galaxy is some 10^8 times wider than even a supermassive hole's capture
  // radius, and would not notice it was there. What is eaten is the *image*: as the galaxy passes
  // behind, the lens shears it into arcs, closes it toward an Einstein ring at alignment, and then
  // the capture radius takes the light and the galaxy is gone from the plate. Nothing is torn apart.
  // The event that genuinely tears something apart and swallows it needs a star, not a galaxy.
  float galaxies = uField > 0.0 ? galaxyField(sky) * dil * mix(0.90, 0.50, uShadow) * uField : 0.0;

  // The ranging sweep: a hairline circle opening from wherever the plate was last struck, fast
  // at first and easing to a stop. The one thing here that happens because someone asked.
  float age = uPulse.z;
  float sweepLife = clamp(age / 4.6, 0.0, 1.0);
  float sweepRadius = 1.55 * (1.0 - exp(-age * 1.15));
  float sweepEdge = abs(length(p - uPulse.xy) - sweepRadius);
  float sweepFade = (1.0 - sweepLife) * (1.0 - sweepLife);
  float sweep = smoothstep(hair * 1.6 + px, hair * 1.6 - px, sweepEdge) * sweepFade;

  // Three magnitude classes, panning at different rates — the near layer crosses about eight
  // CSS pixels a second, which is slow enough to be weather and fast enough that the sky has
  // plainly moved by the time you look up from the name. Counts are deliberately sparse: an
  // atlas plate is mostly empty paper and a dense one is just grain. The whole catalogue is
  // carried heavier on a light ground, where a mid-grey dot is a far weaker mark than a pale
  // one on near-black at the same alpha. Inside an incursion the cores swell, which is the
  // blur — stars going out of focus because the space they are being seen through is not flat.
  // Four catalogue calls, and the most expensive thing on the plate — each walks a
  // neighbourhood of cells. All four are behind the field gate.
  float stars = 0.0;
  if (uField > 0.0) {
    float weight = mix(1.0, 1.10, uShadow) * uField;
    float glow = mix(0.20, 0.055, uShadow);
    float swell = 1.0 + anomaly * 0.55;
    // Each shell's distance appears twice in its own call and nowhere else — once as the rate it
    // drifts at, once as the density it is drawn at. That repetition is the point.
    float deep = catalogue(flow - vec2(tSky * (streamV / SHELL_DEEP), 0.0), SHELL_DEEP, 0.20, uTime, 0.55 * weight, px, swell, glow, dil);
    float mid = catalogue(flow - vec2(tSky * (streamV / SHELL_MID), 0.0), SHELL_MID, 0.17, uTime, 0.85 * weight, px, swell, glow, dil);
    float near = catalogue(flow - vec2(tSky * (streamV / SHELL_NEAR), 0.0), SHELL_NEAR, 0.14, uTime, 1.00 * weight, px, swell, glow, dil);
    // A fourth layer, behind the deep one: star dust. Denser, fainter, smaller and slower than
    // everything in front of it — the veil that keeps the gaps between catalogued stars from
    // reading as empty paper.
    float veil = catalogue(flow - vec2(tSky * (streamV / SHELL_VEIL), 0.0), SHELL_VEIL, 0.30, uTime, 0.30 * weight, px, swell, glow * 0.4, dil);
    stars = max(max(near, veil), max(mid, deep));
  }

  // The accretion disk — the proper view of the hole, in the same single ink. The annulus
  // lives in the source plane and is seen here through the lens above, which is what folds
  // its far side into the arcs over and under the shadow; the physics is all in diskLight.
  float disk = diskLight(sky - holeAt, rs, uTime, uShadow);

  // The pulsar on its flyby, drawn against the lensed sky exactly like the catalogue stars —
  // which is what makes the lens carry it for free: crossing behind the mass it arcs,
  // doubles and flares toward a ring without a line here asking for any of it. The core is a
  // point source and takes the magnification; the beams are extended, and lensing conserves
  // surface brightness, so they are handed it unbrightened.
  // Three of them now, on staggered schedules and with three different natural periods, so the
  // plate usually has one or two in view and they never arrive together. Combined with max rather
  // than a sum: they are separate objects and a rare overlap should not double the ink.
  float psr = 0.0;
  if (uField > 0.0) {
    for (int i = 0; i < 3; i++) {
      vec2 pp = pulsar(sky, uPsr[i].xy, uPsr[i].w, uPsrLit[i].x, uPsrLit[i].z, px)
        * uPsr[i].z * uPsrLit[i].y;
      psr = max(psr, pp.x * magn + pp.y);
    }
    psr *= uField;
  }


  // The sky, in the order a plate is printed: paper, dust, the lines drawn on it, the objects.
  // The sweep lifts the magnitude of every star it crosses, which is the whole point of it —
  // it is not a ring travelling over the chart, it is the chart being read. The point sources
  // alone carry the lens magnification, for the surface-brightness reason given above.
  float field = max(graticule, max(dust, max(nebula, galaxies)));
  field = max(field, disk);

  // The drain — the hole taking its share of the stream.
  //
  // Nothing here chooses which stars are swallowed, and that is the whole design: which ones go in
  // is decided by how close they pass, and how close they pass is the actual physical criterion.
  // So the selection is free. dil is the Schwarzschild factor √(1 − r_c/r) already computed
  // above, and it is the right factor twice over — it is the rate a distant clock is seen to tick
  // down there, and it is also, to the order this plate works at, how much of the light climbs
  // back out. It reaches exactly zero at the capture radius.
  //
  // So a star drawn toward the mass dims, slows, hangs at the edge of the black disc and is gone,
  // arriving at nothing precisely as it reaches it — which is what is really seen, because a
  // distant observer never does watch anything cross. Its neighbour a little further out sails
  // past untouched. The cursor's absorption and the doomed pulsar already fade on this exact
  // factor against this exact radius; this puts the whole star field under the one rule.
  //
  // It runs *against* the magnification, and the order they win in is the physics rather than a
  // compromise: out where the lens is strong but the redshift is not, magn wins and a star
  // crossing behind the mass flares up toward its Einstein ring; in the last stretch the redshift
  // overtakes it and the same star is extinguished. Flare, then out. Both are true at once, and
  // the sequence falls out of multiplying them.
  field = max(field, stars * magn * dil * (1.0 + sweep * 1.8 + anomaly * 0.35));
  // Meteors are point-like too, so they carry the magnification: one crossing behind the
  // hole flares as it goes, which is worth the wait when it happens. They are drawn against the
  // lensed sky like everything else out there, so they are drained on the same terms.
  if (uField > 0.0) {
    field = max(field, (meteor(sky, uTime, 3.1, px) + meteor(sky, uTime, 7.9, px)
      + meteor(sky, uTime, 5.3, px)) * 0.6 * magn * dil * uField);
  }

  // Four asteroids on mutually indifferent periods, each on its own long chord. Point sources, so
  // they take the lens magnification like the stars and the meteors, and they are drained on the
  // same terms — one that wanders in close is stretched by the tide and then extinguished.
  if (uField > 0.0) {
    float rocks = asteroid(sky, holeAt, uTime, 1.7, px);
    rocks = max(rocks, asteroid(sky, holeAt, uTime, 4.3, px));
    rocks = max(rocks, asteroid(sky, holeAt, uTime, 6.1, px));
    rocks = max(rocks, asteroid(sky, holeAt, uTime, 9.7, px));
    field = max(field, rocks * 0.52 * magn * dil * uField);
  }
  field = max(field, sweep * 0.30);
  field = max(field, psr);

  // Inside the capture radius there is nothing to draw — not dark ink, *no* ink, so the disc
  // is the colour of whatever the plate is sitting on. On paper that is a hole punched in the
  // chart; on a dark ground it is the thing itself. One rule, and the theme decides what it
  // means. The edge is nearly hard, because the photon sphere is: a ray one hair inside it
  // does not come back.
  float holeD = holeDist;
  float cut = smoothstep(holeR * 0.90, holeR * 1.02, holeD);
  field *= cut;


  // The photon ring, and its sub-rings. Light that has gone one more half-orbit around the
  // mass arrives exponentially closer to the critical curve and exponentially fainter — the
  // true ratio is e^(−π) ≈ 1/23 per half-orbit, which would put the first sub-ring below a
  // single 8-bit step. They are drawn at a third and a ninth instead: exaggeration, in the
  // service of the structure existing at all. The brightest mark on the plate and the only
  // one allowed to be — it is light that has orbited the mass and come back out to the eye.
  float ring = smoothstep(hair * 1.5 + px, hair * 1.5 - px, abs(holeD - holeR * 1.10)) * 0.52;
  ring += smoothstep(hair + px, hair - px, abs(holeD - holeR * 1.040)) * 0.17;
  ring += smoothstep(hair * 0.75 + px, hair * 0.75 - px, abs(holeD - holeR * 1.012)) * 0.06;
  // A breath of light outside the rings, where the lensed sky piles up. Nearly switched off
  // on paper: the identical mark that reads as light on a dark ground reads as a thumbprint
  // on a white one.
  ring += smoothstep(holeR * 1.10, holeR * 2.4, holeD) * smoothstep(holeR * 3.2, holeR * 1.3, holeD) * mix(0.05, 0.018, uShadow);

  float ink = max(field, ring);

  // Colour, on the two objects that have one — and on nothing else. The plate was single-ink
  // by rule and mostly still is: the graticule, the dust, the catalogue, the
  // nebulas, the meteors and the sweep all remain the page's own foreground colour, because
  // an atlas plate is printed in one ink and a chart that colours everything is a poster. The
  // hole and the pulsar are the exceptions, and they are exceptions on the same grounds — both
  // are emitting, and what they emit has a temperature, and a temperature is a colour.
  //
  // The disk is a blackbody read off the brightness it already computed: the cool outer
  // annulus runs amber, the hot inner rim and the photon ring run up to white-gold. That
  // ramp is not a stylisation of the temperature gradient, it is the temperature gradient —
  // the disk is hotter where it is brighter, for the same reason in both cases. The pulsar
  // gets cyan: a neutron star's surface sits near a million kelvin, far off the blue end of
  // anything else on the plate.
  //
  // Both ends deepen and saturate on paper. A pale amber on white is not a colour, it is a
  // smudge — the same reason the halos and the glow already switch down in the light theme.
  // uShadow is 1 on *paper* — it means the ink is darker than the page — so the second
  // argument of each of these mixes is the light theme's value, not the dark one. Written the
  // other way round first, which put the near-white hot end on white paper and turned the
  // whole disk into a pale peach smudge, and handed the dark theme the burnt end meant for
  // print. The rule is the same one the halos and the glow already follow, in both directions:
  // on a dark ground the colour can be bright, on paper it has to be deep to be a colour at all.
  vec3 emberCool = mix(vec3(0.96, 0.44, 0.07), vec3(0.66, 0.26, 0.02), uShadow);
  vec3 emberHot = mix(vec3(1.00, 0.90, 0.72), vec3(0.92, 0.62, 0.14), uShadow);
  vec3 emberRGB = mix(emberCool, emberHot, smoothstep(0.16, 0.80, disk));
  vec3 psrRGB = mix(vec3(0.65, 0.94, 1.00), vec3(0.03, 0.45, 0.58), uShadow);
  // The three nebula lines, deepened on paper by the same rule as everything else: a pale wash on
  // white is not a colour, it is a stain.
  vec3 nebHaRGB = mix(vec3(1.00, 0.30, 0.36), vec3(0.60, 0.05, 0.13), uShadow);
  vec3 nebO3RGB = mix(vec3(0.34, 0.96, 0.84), vec3(0.02, 0.44, 0.38), uShadow);
  vec3 nebRefRGB = mix(vec3(0.50, 0.64, 1.00), vec3(0.09, 0.19, 0.62), uShadow);

  // Weighted by each source's own contribution, and the shadow's cut applied to the two that
  // sit behind it, so the tint follows the ink rather than floating free of it: where the disk
  // is what you are looking at the pixel is amber, where a catalogue star crosses it the ink
  // takes its share back, and inside the shadow — where there is no ink at all — there is no
  // colour either. Read before the mask and the grain, which scale ink and hue alike and so
  // cancel out of the ratio.
  float diskLit = disk * cut;
  float psrLit = psr * cut;
  // The coloured nebulas join the same weighting the disk and the pulsar use, so where one of them
  // is the brightest thing in a pixel the pixel takes its line colour, and where a catalogue star
  // crosses it the ink takes its share back.
  float nebHaLit = nebHa * cut;
  float nebO3Lit = nebO3 * cut;
  float nebRefLit = nebRef * cut;
  float hueW = diskLit + ring + psrLit + nebHaLit + nebO3Lit + nebRefLit;
  // The ring takes the hot end flat rather than the ramp: it is light that has orbited the
  // mass and come back out, so it is the disk's own material seen at its most beamed.
  vec3 hue = emberRGB * diskLit + emberHot * ring + psrRGB * psrLit
    + nebHaRGB * nebHaLit + nebO3RGB * nebO3Lit + nebRefRGB * nebRefLit;
  vec3 baseInk = mix(uInk, hue / max(hueW, 1e-4), clamp(hueW / max(ink, 1e-4), 0.0, 1.0));

  // No marker rings the subject any more — the dashed reticle went with the portrait, and the halo
  // that cleared space for it went too. A hole that bends the whole sky around itself does not need
  // an arrow pointing at it: the crowding at the lens is the picture.
  //
  // The sky no longer runs all the way in to the shadow, though, and that is the drain's doing. The
  // two factors were measured against each other across the field: far out the product sits near
  // 0.9, a slight vignette; it climbs to 2.8 at the Einstein radius, where the crowding peaks; and
  // inside that it collapses to nothing by the edge of the black disc. So the ring of piled-up sky
  // survives intact and is now the brightest thing in the star field, with a swept edge inside it
  // where the stream is being consumed. The hole clears its own ground.

  // One mask, applied last, covering lines and objects alike — so nothing reaches the edge of
  // the drawing buffer and the plate has no boundary of its own.
  float mask = smoothstep(2.0, 0.35, length(p * vec2(0.62, 1.0)));
  mask *= smoothstep(0.0, 0.30, uv.x) * smoothstep(1.0, 0.70, uv.x);
  mask *= smoothstep(0.0, 0.30, uv.y) * smoothstep(1.0, 0.70, uv.y);
  ink *= mask;

  // The cursor, absorbed — now on a schedule with teeth. The native cursor is hidden over
  // the canvas and the arrow drawn here stands in for it — same silhouette, tip on the
  // same hotspot — but the choreography moved to the CPU, which is the one that knows what
  // time it is. Drift too close and the hole stops dragging the arrow and takes it: wound
  // around the drain, stretched along the infall line and squeezed across it, dimming by
  // the Schwarzschild factor all the way down, gone entirely for a few seconds — and then
  // thrown back out toward the hand, because a spinning mass is allowed one piece of
  // theatre. The shader just draws the glyph where it is told, at the stretch and the
  // angle and the alpha it is handed.
  float cSpin = cos(uMarkSpin);
  float sSpin = sin(uMarkSpin);
  vec2 md = mat2(cSpin, -sSpin, sSpin, cSpin) * (p - uMark);
  vec2 inDir = uMarkDir;
  float along = dot(md, inDir);
  vec2 perpD = vec2(-inDir.y, inDir.x);
  vec2 msd = inDir * (along / max(uMarkTide, 1.0)) + perpD * (dot(md, perpD) * sqrt(max(uMarkTide, 1.0)));

  // Black body, white rim, small — the macOS arrow, in its own two inks on top of the
  // plate's one. The cursor is the visitor's property, not the chart's subject, so it is
  // the single thing on the plate allowed to keep its native colours in both themes.
  float cs = 0.095;
  float dC = sdCursor(msd / cs) * cs;
  float bodyM = smoothstep(px * 1.2, -px * 1.2, dC);
  float rimM = smoothstep(px * 1.2, -px * 1.2, dC - px * 1.7) * (1.0 - bodyM);
  float curA = (bodyM + rimM) * clamp(uMarkAlpha, 0.0, 1.0);
  vec3 curRGB = mix(vec3(1.0), vec3(0.0), bodyM);

  // Grain multiplies rather than adds. Added, it survived the mask and laid a faint dither
  // across every pixel of the buffer — which is exactly the rectangle that was showing up
  // against the page. Multiplied, zero stays zero and the plate has no visible extent.
  ink *= 1.0 + (hash(gl_FragCoord.xy) - 0.5) * 0.13;

  // The plate in its page ink plus the two objects allowed their own colour, and the cursor
  // in its two, composited source-over. Divided back out of premultiplied form, because the
  // context was asked for straight alpha.
  float baseA = clamp(ink, 0.0, 1.0) * uOpacity;
  float outA = curA + baseA * (1.0 - curA);
  fragColor = vec4((curRGB * curA + baseInk * baseA * (1.0 - curA)) / max(outA, 1e-4), outA);
}
`

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // Say why. A shader that fails to compile takes the canvas with it and drops the plate
    // to its static fallback, which looks close enough to the real thing that the failure
    // is invisible unless something prints the reason.
    console.error('[SignalPlate] shader failed to compile\n', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * One 1×1 scratch canvas for the life of the module, not one per read. Three probes are
 * resolved every animation frame, and minting a canvas and a 2D context for each of them was
 * ~180 throwaway contexts a second on a plate whose whole claim is that it is cheap.
 */
let colourContext: CanvasRenderingContext2D | null | undefined

/**
 * Resolve a CSS colour of any syntax — the palette is authored in oklch — to RGB, by
 * letting a 1×1 2D canvas do the parsing the browser already knows how to do.
 */
function readColour(probe: HTMLElement): [number, number, number] {
  const fallback: [number, number, number] = [0.52, 0.52, 0.54]
  const colour = getComputedStyle(probe).color
  if (colourContext === undefined) {
    colourContext = document.createElement('canvas').getContext('2d')
  }
  const context = colourContext
  if (!context) return fallback

  // The scratch pixel is shared now, so it has to be cleared rather than assumed blank —
  // otherwise a colour with alpha would composite onto whatever the last probe left there.
  context.clearRect(0, 0, 1, 1)
  context.fillStyle = colour
  context.fillRect(0, 0, 1, 1)
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data
  if (r === undefined || g === undefined || b === undefined) return fallback
  return [r / 255, g / 255, b / 255]
}

function luminance([r, g, b]: readonly [number, number, number]): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * The plate's own geometry: one free parameter and a seat, handed to the shader as uniforms
 * rather than repeated as constants at both ends. The GLSL used to carry `rs` and the seat as
 * literals with copies here and a comment asking whoever edited one to remember the other.
 */
export const PLATE_RS = 0.075
const PLATE_SEAT_X = 0
const PLATE_SEAT_Y = 0.03
/** √27/2 — the photon capture radius in units of rs. The edge of the black disc, not the horizon. */
export const CAPTURE_RATIO = 2.598

/**
 * What the event horizon takes hold of while it is eating the page.
 *
 * Handed over as a mutable object behind a ref rather than as props, because these change sixty
 * times a second and a prop would mean sixty React renders. It is the same arrangement the
 * component already uses internally for the cursor mark, the strike and the pointer: the render
 * happens once and the animation lives outside it.
 *
 * At rest it holds the plate's own values, so the drive is always the authority and there is no
 * second code path for "nothing is happening".
 */
export interface HorizonDrive {
  /** Schwarzschild radius, plate units. The hole's swelling is this number moving. */
  rs: number
  /** Ambient sky density, 1 at rest. The field drains as the hole feeds. */
  field: number
  /** Bumped to open a ranging ring from the hole. Any change fires one. */
  strike: number
  /** True while the page is being taken, which retires the cursor stand-in for the duration. */
  taking: boolean
}

export function SignalPlate({
  children,
  drive,
}: {
  readonly children?: React.ReactNode
  readonly drive?: React.RefObject<HorizonDrive | null>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const paperProbeRef = useRef<HTMLSpanElement>(null)
  const [supported, setSupported] = useState(true)

  /**
   * Scroll parallax, applied to the field but not the hole: the sheets fall behind the
   * page and dissolve while the hole travels with it. Driven by a motion value, so
   * scrolling never re-renders React.
   *
   * This is the one ambient motion left on the component: the pointer tilt and the hover
   * slide are gone on purpose. The plate answers the strike, and it does one thing more —
   * near the mass it takes the cursor itself. The chart never performs for the cursor;
   * the hole simply treats it as one more thing that got too close.
   */
  const prefersReducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const parallax = useTransform(scrollY, [0, 420], [0, 64])
  const fade = useTransform(scrollY, [0, 380], [1, 0])

  useEffect(() => {
    const canvas = canvasRef.current
    const probe = probeRef.current
    const paperProbe = paperProbeRef.current
    if (!canvas || !probe || !paperProbe) return

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    })
    if (!gl) {
      setSupported(false)
      return
    }

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    const program = gl.createProgram()
    if (!vertex || !fragment || !program) {
      setSupported(false)
      return
    }

    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[SignalPlate] program failed to link\n', gl.getProgramInfoLog(program))
      setSupported(false)
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const uSize = gl.getUniformLocation(program, 'uSize')
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uMark = gl.getUniformLocation(program, 'uMark')
    const uMarkDir = gl.getUniformLocation(program, 'uMarkDir')
    const uMarkTide = gl.getUniformLocation(program, 'uMarkTide')
    const uMarkAlpha = gl.getUniformLocation(program, 'uMarkAlpha')
    const uMarkSpin = gl.getUniformLocation(program, 'uMarkSpin')
    const uInk = gl.getUniformLocation(program, 'uInk')
    const uPulse = gl.getUniformLocation(program, 'uPulse')
    const uOpacity = gl.getUniformLocation(program, 'uOpacity')
    const uShadow = gl.getUniformLocation(program, 'uShadow')
    const uPsr = gl.getUniformLocation(program, 'uPsr')
    const uPsrLit = gl.getUniformLocation(program, 'uPsrLit')
    const uCam = gl.getUniformLocation(program, 'uCam')
    const uField = gl.getUniformLocation(program, 'uField')
    const uRs = gl.getUniformLocation(program, 'uRs')
    const uSeat = gl.getUniformLocation(program, 'uSeat')

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    let width = 0
    let height = 0
    let visible = true
    let frame = 0
    let start = performance.now()
    let elapsed = 0

    // Where the plate was last struck, and when. `at` starts far enough in the past that the
    // strike term is already dead on the first frame — an unclicked plate has never been
    // clicked, rather than having been clicked at the origin at time zero.
    const pulse = { x: 0, y: 0, at: -1000 }

    // The last strike counter seen on the drive, so a bump fires exactly one ring.
    let lastStrike = 0

    // The cursor's position in plate space, for the absorption mark. The rendered values
    // chase the targets rather than jumping, so a fast hand drags the mark instead of
    // teleporting it — which near the mass reads as the hand losing the tug of war. Parked
    // far off-plate so the mark's first appearance is a fade-in, not a jump from origin.
    const pointer = { x: 0, y: -3, targetX: 0, targetY: -3, hover: 0, targetHover: 0 }

    // The hole's seat and its capture radius, so the CPU can choreograph what the GPU draws.
    // Read off the same constants the shader is handed, so there is nothing left to keep in
    // step by hand. Both are the plate's values: the cursor mark and the pulsar flyby that use
    // them are field objects, and the field is switched off entirely on the horizon variant.
    const HOLE_X = PLATE_SEAT_X
    const HOLE_Y = PLATE_SEAT_Y
    const HOLE_R = CAPTURE_RATIO * PLATE_RS

    /**
     * The mark's life as a state machine, because the absorption is now an event with a
     * clock, not a spring. FREE is the old tug of war: dragged off the hand toward the
     * mass, frozen just outside the ring. Cross the trigger radius and ABSORB takes over —
     * the arrow is wound around the drain and pulled through the ring, fading by the same
     * Schwarzschild factor that always dimmed it, which lands it at zero exactly as it
     * crosses: a distant observer never does see a thing fall in. HELD is five seconds of
     * the visitor genuinely having no cursor over the plate, which is the point of the
     * whole routine. EJECT throws it back out along the line to the hand — the one
     * unphysical beat, granted to the theatre — and FREE resumes with a short cooldown so
     * a hand parked at the trigger radius cycles rather than strobes.
     */
    const mark = {
      phase: 'free' as 'free' | 'absorb' | 'held' | 'eject',
      since: 0,
      cooldownUntil: 0,
      startDist: 0,
      startAngle: 0,
      x: 0,
      y: -3,
      dirX: 0,
      dirY: 1,
      tide: 1,
      alpha: 0,
      spin: 0,
    }

    function smooth(a: number, b: number, x: number) {
      const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
      return t * t * (3 - 2 * t)
    }

    /**
     * The tidal stretch on the cursor, taken off the law instead of off a curve.
     *
     * It was 1 + 5·grab², where grab was a smoothstep on distance — which is a shape someone chose,
     * and it topped out at six. The real thing is not a shape: the tidal force is the *difference* in
     * gravity across a body, and that difference goes as 1/r³. So it is nearly nothing at arm's
     * length and it runs away as the horizon is approached, which is the entire character of the
     * effect and exactly what a smoothstep flattens out.
     *
     * On the cube law the stretch is about 1.7× at three shadow-radii out, 7× at one and a half, and
     * 21× at the edge itself — so drifting close is gentle and the last stretch is violent.
     *
     * The coefficient is set by where the glyph ends up, not by taste. At 30 the stretch reached 31×,
     * which puts a 0.095-unit arrow at 2.94 units long against a plate two units tall — verified in
     * the browser, and the filament ran off the bottom of the frame, because the cursor is composited
     * after the edge mask and nothing fades it. At 20 the longest visible streak is 2.0 units: the
     * full height of the plate and no more. Still three times the old maximum of six.
     *
     * Capped at 40, which the plunge only reaches inside the shadow where the glyph has already faded
     * to nothing — the alpha runs to zero on √(1 − r_c/r) at the same radius the plunge ends on, so
     * the longest stretch is also the faintest and no frame draws a full-length streak at full
     * strength.
     */
    const MARK_TIDE_K = 20
    function tidalStretch(dist: number) {
      const q = HOLE_R / Math.max(dist, HOLE_R * 0.42)
      return Math.min(1 + MARK_TIDE_K * q * q * q, 40)
    }

    function updateMark(now: number) {
      const hx = pointer.x - HOLE_X
      const hy = pointer.y - HOLE_Y
      const reach = Math.max(Math.hypot(hx, hy), 1e-3)
      const dirX = hx / reach
      const dirY = hy / reach

      if (mark.phase === 'free') {
        const grab = smooth(1.1, 0.1, reach)
        // 1.15 rather than 1.35: the pull bites sooner on the approach, so the hand feels the mass
        // taking the arrow well before it is close enough to be taken.
        // Held at twice the shadow's radius, not 1.06× it, and that floor was the whole bug.
        //
        // At 1.06 the arrow was parked 0.0117 plate units outside the black disc — six tenths of a
        // percent of the plate's height — so when the absorption fired it had essentially nowhere to
        // fall. Its alpha, which runs to zero on √(1 − r_c/r) at the shadow's edge, reached zero
        // 0.33 s into a 0.9 s plunge, and every bit of the tidal stretch worth watching happened
        // after the glyph was already invisible. It read as the cursor blinking out rather than
        // being taken, which is exactly what it was doing.
        //
        // At 2.0 the arrow visibly refuses to be brought closer — the mass holding it off the hand
        // outside the ring — and the plunge has 0.195 units to cross, ten percent of the plate, with
        // the stretch climbing 5× to 31× the whole way down while it is still bright enough to see.
        const dist = Math.max(reach * (1 - Math.pow(Math.max(grab, 1e-4), 1.15) * 0.98), HOLE_R * 2.0)
        mark.x = HOLE_X + dirX * dist
        mark.y = HOLE_Y + dirY * dist
        mark.dirX = -dirX
        mark.dirY = -dirY
        mark.tide = tidalStretch(dist)
        mark.spin = 0
        mark.alpha = Math.sqrt(Math.max(1 - HOLE_R / dist, 0)) * pointer.hover
        if (pointer.hover > 0.5 && reach < 0.55 && now >= mark.cooldownUntil) {
          mark.phase = 'absorb'
          mark.since = now
          mark.startDist = dist
          mark.startAngle = Math.atan2(dirY, dirX)
        }
      } else if (mark.phase === 'absorb') {
        // 1.2 s rather than 0.9: there is real distance to cover now, and the stretch wants time.
        const u = Math.min((now - mark.since) / 1.2, 1)
        // The plunge accelerates (u^2.2) while the drain winds it around and the tide climbs —
        // spaghettification as a cursor understands it. It ends *at* the shadow's edge rather than
        // half way inside it, so the fade and the arrival coincide: the alpha below reaches zero on
        // the same radius the plunge stops at, which means the glyph runs out of light exactly as it
        // crosses and there is no moment of it being drawn inside the disc, and none of it wasted
        // being invisible either. The same rule the doomed pulsar already ends on.
        const dist = mark.startDist + (HOLE_R - mark.startDist) * Math.pow(u, 2.2)
        const ang = mark.startAngle + 3.2 * u * u
        mark.x = HOLE_X + Math.cos(ang) * dist
        mark.y = HOLE_Y + Math.sin(ang) * dist
        mark.dirX = -Math.cos(ang)
        mark.dirY = -Math.sin(ang)
        // The same law down the plunge, so the spaghettification is the geometry doing it rather
        // than a ramp: as dist collapses toward the shadow the cube term runs away on its own.
        mark.tide = tidalStretch(dist)
        mark.spin = 5.5 * u * u
        mark.alpha = Math.sqrt(Math.max(1 - HOLE_R / Math.max(dist, 1e-3), 0)) * pointer.hover
        if (u >= 1) {
          mark.phase = 'held'
          mark.since = now
        }
      } else if (mark.phase === 'held') {
        mark.alpha = 0
        if (now - mark.since >= 5.0) {
          mark.phase = 'eject'
          mark.since = now
        }
      } else {
        const u = Math.min((now - mark.since) / 0.7, 1)
        const e = 1 - Math.pow(1 - u, 3)
        const dist = HOLE_R + (Math.max(reach, 0.9) * 1.15 - HOLE_R) * e
        mark.x = HOLE_X + dirX * dist
        mark.y = HOLE_Y + dirY * dist
        mark.dirX = -dirX
        mark.dirY = -dirY
        mark.tide = tidalStretch(dist)
        mark.spin = 2 * (1 - e)
        mark.alpha = Math.sqrt(Math.max(1 - HOLE_R / dist, 0)) * pointer.hover
        if (u >= 1) {
          mark.phase = 'free'
          mark.cooldownUntil = now + 2.5
          // Land the chase where the throw ended, so the arrow glides back to the
          // fingertip instead of teleporting there.
          pointer.x = mark.x
          pointer.y = mark.y
        }
      }
    }

    /**
     * The pulsar's flyby, solved on the CPU for the same reason the absorption is: the shader
     * cannot know what time it is. The observed pulse phase is an integral over the whole
     * flyby — every stretch of it dilated and Doppler-shifted by a different amount — and a
     * per-pixel program that starts from nothing on every fragment has no history to
     * integrate. It is also two million times cheaper to solve one orbit per frame than one
     * orbit per pixel.
     *
     * Re-integrated from the start of the cycle on every frame rather than advanced from the
     * last one, which costs about fourteen hundred steps and buys immunity to everything that
     * interrupts this canvas: the IntersectionObserver pausing it off-screen, a resize
     * redrawing it while paused, a theme flip, a reduced-motion still frame. The path is a
     * pure function of the clock, so all of those land on it correctly by construction.
     */
    const PSR_RS = PLATE_RS                 // the same one source as the shader's own rs
    const PSR_GM = PSR_RS / 2               // geometric units: c = 1, lengths in plate units
    const PSR_R0 = 2.6                      // handed to the integrator well off the plate
    const PSR_V0 = 0.3                      // c, comfortably above escape at r0 — unbound
    const PSR_LIFE = 19                     // seconds of flyby, about ten of them on the plate.
                                            // Was 17, which was exactly enough before the passage
                                            // was slowed; the same path now takes 17.7 s of the
                                            // observer's time and was being cut off mid-egress
    const PSR_PERIOD = 41                   // and this long from one flyby to the next
    const PSR_STEP = 0.012                  // leapfrog step: sub-pixel across the whole run
    // Three natural periods, one per slot, and the spin-up is measured against whichever one the
    // slot owns. Real pulsars run from about 1.4 ms to 23 s, so these are three ordinary field
    // rotators rather than a spread invented for variety — B0329+54 sits at 0.714 s. The Crab's
    // 33 ms is deliberately outside the set: at sixty frames a second it would arrive as a blur
    // and read as a star with a rendering fault rather than as a lighthouse.
    const PSR_BASE = [0.6, 0.34, 0.89]
    const PSR_BEAM = 0.32                   // the beam half-width at rest, radians — widens with spin
    const PSR_DISK_IN = 3.0 * PSR_RS        // the hole's disk, mirroring diskLight's own annulus
    const PSR_DISK_OUT = 9.0 * PSR_RS
    // Accretion torque coupling, and the one tuned number in the flyby. Swept: below ~150 the
    // spin-up is a few percent and invisible; above ~600 every pass slams into the ceiling below
    // and they all come out identical, which is a scripted result wearing physics. At 300 the
    // closest approach decides the outcome and nothing saturates — see PSR_SPIN_CAP.
    const PSR_ACCRETE = 300
    // A ceiling, so a freak pass cannot strobe. Deliberately set clear of what the sweep actually
    // reaches (2.05× for the closest survivor), so it is a guard rail and not the mechanism.
    const PSR_SPIN_CAP = 2.5
    const PSR_SIN_I = 0.992                 // the disk's inclination, reused — the viewer is +y

    // One state object per slot, and two flat arrays to hand them to the GPU in one call each.
    const pulsars = [0, 1, 2].map(() => ({
      x: 0, y: -9, gate: 0, beam: 0, flash: 0, flux: 1, spread: 1,
    }))
    const psrPack = new Float32Array(12)
    const psrLitPack = new Float32Array(9)

    /** The shader's hash, in JS, so the schedule is drawn from the same kind of noise. */
    function psrHash(n: number) {
      const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
      return s - Math.floor(s)
    }

    function updatePulsar(clock: number, slot: number) {
      const pulsar = pulsars[slot]!
      const baseSpin = (Math.PI * 2) / PSR_BASE[slot]!
      // Staggered by a third of a period each, so the three never arrive together and the plate
      // usually has one or two in view rather than all three or none.
      const now = clock + (slot * PSR_PERIOD) / 3
      const cycle = Math.floor(now / PSR_PERIOD)
      const local = now - cycle * PSR_PERIOD
      if (local > PSR_LIFE) {
        pulsar.gate = 0
        return
      }
      // The slot is mixed into every hash below, so the three draw independent paths from the same
      // schedule instead of three copies of one flyby.
      const seed = slot * 37.13

      // Every flyby is drawn fresh from its cycle index, so no two are the same path. The aim —
      // the angle between the inbound line and the line to the hole, which sets the impact
      // parameter — is the number that decides the whole event, because there is a critical
      // value of it either side of which the star does something completely different. Solved
      // numerically against this potential, that value is 0.20842: below it every path crosses
      // the shadow and the star is eaten, above it every path turns and the star escapes.
      //
      // So the schedule draws from two bands well clear of the edge, and one flyby in three is
      // doomed. Both bands were swept across every entry angle and both directions of travel to
      // confirm they never cross over: the survivors' closest approach is 4.05 rs, and the
      // doomed are always taken, at around seven seconds in. A guaranteed slingshot every time
      // is a loop; a guaranteed death every time is also a loop. The capture has to be possible
      // and not certain, or watching one go past means nothing.
      const doomed = psrHash(cycle * 7.3 + 4.8 + seed) < 0.34
      const side = psrHash(cycle * 1.7 + 0.3 + seed) < 0.5 ? 1 : -1
      const hand = psrHash(cycle * 3.1 + 9.4 + seed) < 0.5 ? 1 : -1
      const spread = psrHash(cycle * 5.9 + 2.6 + seed)
      const aim = (doomed ? 0.170 + 0.035 * spread : 0.245 + 0.055 * spread) * hand
      // In from one side or the other, because the plate is wide and short.
      const th0 = (side > 0 ? 0 : Math.PI) + (psrHash(cycle * 11.3 + 7.2 + seed) - 0.5) * 0.44

      let x = PSR_R0 * Math.cos(th0)
      let y = PSR_R0 * Math.sin(th0)
      // The aim is the angle between the inbound line and the line to the hole, so the impact
      // parameter is r0·sin(aim) and its sign is which way round the star goes.
      let vx = -PSR_V0 * Math.cos(th0 + aim)
      let vy = -PSR_V0 * Math.sin(th0 + aim)
      let phase = 0
      let flux = 1
      let dim = 1
      let eaten = false
      // The intrinsic rotation rate, which is no longer a constant: it arrives at this slot's own
      // natural rate and leaves faster, by however much of the disk it went through.
      let spin = baseSpin

      // A whole number of fixed steps plus one partial step for the remainder. Fixed, so the
      // path is identical on every frame no matter when the frame lands; plus the remainder, so
      // the star travels smoothly instead of in twelve-millisecond hops.
      const whole = Math.floor(local / PSR_STEP)
      for (let i = 0; i <= whole; i++) {
        const dt = i < whole ? PSR_STEP : local - whole * PSR_STEP
        if (dt <= 0) break

        // The passage, slowed — and slowed in the one way that does not disturb the path.
        //
        // A flyby is *fastest* at periastron; that is Kepler, and no amount of gravity makes an
        // object dawdle at its closest approach in its own reckoning. What does slow is the clock
        // it is being watched by: coordinate velocity is suppressed near the mass, which is the
        // same statement as things appearing to freeze at a horizon. So the star really does take
        // longer to get past, to the observer holding this plate, and it is worth being exact
        // about which of the two it is.
        //
        // The step is therefore split: dt is the observer's second, dLam is how much of the path
        // gets traversed in it. Only the *rate along the path* changes, never the path — so the
        // geometry is untouched and the critical aim below survives verbatim. Verified rather than
        // asserted: bisecting for the capture threshold gives 0.20840 without this and 0.20842
        // with it, the survivors' closest approach stays 4.05 rs, every doomed entry angle is
        // still taken and every survivor still escapes.
        //
        // The factor is taken against the capture radius rather than rs, for the reason the main
        // shader already gives for doing the same: the horizon is hidden inside the shadow, so a
        // gradient measured from it is one nobody can see. Measured from the shadow's edge it is
        // worth 40% at a survivor's periastron and runs to zero for the doomed — who therefore
        // creep to a halt exactly where they also run out of light, since dim below fades on this
        // same radius. They stop and vanish in the same place, which is the whole point: a distant
        // observer is never shown the crossing.
        let r = Math.max(Math.hypot(x, y), PSR_RS * 1.05)
        const crawl = Math.sqrt(Math.max(1 - HOLE_R / Math.max(r, HOLE_R), 0))
        const dLam = dt * Math.max(crawl, 1e-4)

        // Leapfrog under Paczyński–Wiita, Φ = −GM/(r − rs): one extra term over Newton, and it
        // puts the innermost stable orbit and the strong-field bending where Schwarzschild puts
        // them. So the periastron advance is not applied to this path afterwards — it *is* this
        // path, straight out of the potential.
        let pull = -PSR_GM / Math.pow(Math.max(r - PSR_RS, PSR_RS * 0.05), 2)
        vx += ((pull * x) / r) * dLam * 0.5
        vy += ((pull * y) / r) * dLam * 0.5
        x += vx * dLam
        y += vy * dLam
        r = Math.max(Math.hypot(x, y), PSR_RS * 1.05)
        pull = -PSR_GM / Math.pow(Math.max(r - PSR_RS, PSR_RS * 0.05), 2)
        vx += ((pull * x) / r) * dLam * 0.5
        vy += ((pull * y) / r) * dLam * 0.5

        // The spin-up, and it is accretion that does it.
        //
        // Tidal coupling was the first attempt and it is the wrong sign. Tides drive a spin toward
        // *corotation* with the orbit, and the orbit here turns at about 1.5 rad/s against the
        // star's 10.5 — so tides brake a pulsar on a flyby like this rather than winding it up.
        // Integrated, it came out at 0.14× and lengthened the period to four seconds.
        //
        // What genuinely spins pulsars up is accretion, and it is not a borrowed mechanism here:
        // it is how every millisecond pulsar in the sky got fast, and the matter is already in
        // frame. The hole's disk runs from 3 to 9 rs — the same annulus diskLight draws — and the
        // survivors' closest approach falls between 4.05 and 6.04 rs, so the star passes through
        // the disk it is being fed by. Torque N = Ṁ√(GMr), with Ṁ standing in as the local disk
        // density times the speed it is being swept at. Density goes as (r_in/r)³, steeply inward,
        // and that steepness is what makes the outcome depend on the approach instead of averaging
        // flat: a 4 rs pass leaves at 2.05× and a 6 rs pass at 1.43×, so no two flybys end alike.
        //
        // It never spins back down. Magnetic dipole braking is the term that would do it and its
        // timescale is millions of years, so on the ten seconds this plate has to show, a star
        // that leaves faster stays faster. That is the real reason recycled pulsars are still
        // spinning quickly, and it is why nothing here relaxes it afterwards.
        const band =
          smooth(PSR_DISK_IN * 0.65, PSR_DISK_IN * 1.10, r) *
          smooth(PSR_DISK_OUT * 1.25, PSR_DISK_OUT * 0.80, r) *
          Math.pow(PSR_DISK_IN / Math.max(r, PSR_DISK_IN), 3)
        spin = Math.min(
          spin + PSR_ACCRETE * band * Math.hypot(vx, vy) * Math.sqrt(PSR_GM * r) * dLam,
          baseSpin * PSR_SPIN_CAP,
        )

        // Three separate reasons the pulses do not arrive at the rate they left, and they
        // multiply:
        //  · gravitational dilation, √(1 − rs/r) — the star's clock runs slow to a distant one
        //  · relativistic dilation, √(1 − v²) — it passes 0.6 c at periastron, so this is not a
        //    rounding error on the first one
        //  · Doppler, 1/(1 − β) — the pulses bunch on the approach and stretch on the retreat,
        //    and unlike the other two this factor changes sign halfway through the pass
        // A fourth reason now, and it is the only one that is the star's own doing rather than an
        // artefact of watching it from here: it is genuinely turning faster than it was. The other
        // three still fight it — the two dilations always slow the observed rate — so what a
        // distant observer records is the product, and the spin-up is partly masked at closest
        // approach by the very redshift that is deepest there. It wins on the way out, where the
        // gravity has let go and the rotation has not.
        //
        // The phase advances against the observer's second, not the path parameter: the dilation
        // factors are what convert the star's own rate into ours, so applying dLam as well would
        // count the same slowing twice.
        const redshift = Math.sqrt(Math.max(1 - PSR_RS / r, 0))
        const speed = Math.min(Math.hypot(vx, vy), 0.97)
        const doppler = 1 / Math.max(1 - vy * PSR_SIN_I, 0.22)
        phase += spin * redshift * Math.sqrt(1 - speed * speed) * doppler * dt
        // Beaming, at the same muted exponent the disk already uses — the plate's own
        // precedent, and the honest cube would make the retreat leg vanish outright. Dimmed on
        // top of it by the redshift, the one factor that never works in the star's favour.
        flux = Math.min(Math.pow(doppler, 1.5) * redshift, 2.6)

        // The ending, for the ones that do not come back out. A distant observer never sees
        // anything cross a horizon: the light it sends on the way in arrives redder, slower and
        // fainter without limit, and the object fades where it is rather than disappearing at a
        // moment. This is the same factor the cursor's absorption already fades on, against the
        // same radius, and it reaches exactly zero at the edge of the shadow — so the star runs
        // out of light precisely as it reaches the black disc, and there is no pop to hide.
        // Survivors are spared it: their dimming is the redshift in the flux above, and putting
        // this on top of that would double-count the gravity and mute the one moment worth
        // watching.
        if (doomed) {
          dim = Math.sqrt(Math.max(1 - HOLE_R / r, 0))
          if (r <= HOLE_R) {
            eaten = true
            break
          }
        }
      }

      pulsar.x = HOLE_X + x
      pulsar.y = HOLE_Y + y
      pulsar.beam = phase % (Math.PI * 2)
      // The flash: the beam axis is the phase, and the line of sight is +y — the same direction
      // the disk's beaming already assumes the viewer sits in. The absolute value counts both
      // poles, so the star pulses twice per turn, which is what a two-pole lighthouse does.
      //
      // The threshold is no longer fixed, because the beam is not. The polar cap that the beam
      // comes off subtends θ ≈ asin√(RΩ/c), so it widens as the square root of the spin — a star
      // that left the disk at twice the rate has a cone about 40% broader. Both effects push the
      // duty cycle the same way, so a spun-up star is on screen a good deal more of the time, and
      // the widening is what stops the faster period from reading as a thinner flicker.
      const beamSpread = Math.sqrt(spin / baseSpin)
      pulsar.spread = beamSpread
      pulsar.flash = smooth(Math.cos(Math.min(PSR_BEAM * beamSpread, 1.2)), 1, Math.abs(Math.sin(pulsar.beam)))
      pulsar.flux = flux
      // Fade the event in and out. The plate's edge mask will not do it alone: out at r0 the
      // mask still passes about 15%, so without this the star would wink into existence. A star
      // that was eaten stays at nothing for the rest of the cycle — the integrator stopped at
      // the shadow, so there is no position left to trust either.
      pulsar.gate = eaten ? 0 : smooth(0, 0.9, local) * smooth(PSR_LIFE, PSR_LIFE - 1.4, local) * dim
    }

    /**
     * The camera — two fixed angles: an azimuth around the disk's axis and an elevation above
     * its plane, handed to the shader, which builds the basis and does the projecting.
     *
     * The elevation is asin(0.125) — the 7.2° the disk has always been drawn at, which is roughly
     * where Interstellar put its own camera. That is not a coincidence to be tidied away later:
     * it is the number the disk's projection was already built around, so the hole, its disk, the
     * photon ring and the lens all render exactly what they rendered before any of this existed.
     * Nothing about the subject moved. The universe was put behind it.
     *
     * The camera exists as a basis rather than as a control because that is what lets the galaxies
     * be placed in honest 3D world coordinates and projected, instead of pasted onto the plate at
     * 2D positions someone eyeballed. Their depth is real, and it does real work even with the eye
     * held still: it sets each one's perspective scale, so the field has a front and a back.
     */
    const CAM_ELEV = Math.asin(0.125)         // the framing the plate has always had
    const cam = { az: 0, elev: CAM_ELEV }

    // The canvas's geometry, cached. Everything that needs the plate's position or size reads
    // it from here rather than from the element, because both `clientWidth` and
    // `getBoundingClientRect()` force the browser to flush pending layout — and one of the
    // places that wants them runs every animation frame. The ResizeObserver and a scroll
    // listener keep this current, which is the same information for none of the cost.
    let box = { left: 0, top: 0, width: 0, height: 0 }

    function measure() {
      const rect = canvas!.getBoundingClientRect()
      box = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    }

    function resize() {
      if (!gl) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const next = Math.max(1, Math.round(box.width * dpr))
      const nextHeight = Math.max(1, Math.round(box.height * dpr))
      if (next === width && nextHeight === height) return
      width = next
      height = nextHeight
      canvas!.width = width
      canvas!.height = height
      gl.viewport(0, 0, width, height)
    }

    function draw(time: number) {
      if (!gl) return
      resize()

      // What the hole is doing this frame. At rest the drive holds the plate's own values, so
      // this is one path rather than two.
      const d = drive?.current ?? null
      const rs = d ? d.rs : PLATE_RS
      const field = d ? d.field : 1

      // A ranging ring, asked for from outside — the one the hole opens as it settles back to
      // its own size. It reuses the strike the plate already draws for a click, seated at the
      // hole rather than at a pointer.
      if (d && d.strike !== lastStrike) {
        lastStrike = d.strike
        pulse.x = PLATE_SEAT_X
        pulse.y = PLATE_SEAT_Y
        pulse.at = time
      }

      // Solved here rather than in the loop, so every path that renders a frame — the loop, a
      // resize while paused, a theme flip, the reduced-motion still — gets a pulsar that agrees
      // with the clock that frame was drawn for. Skipped outright with the field: this is some
      // fourteen hundred integration steps per star per frame, and there is no star to draw.
      if (field > 0) {
        updatePulsar(time, 0)
        updatePulsar(time, 1)
        updatePulsar(time, 2)
      }
      gl.uniform2f(uSize, width, height)
      gl.uniform1f(uTime, time)
      gl.uniform1f(uField, field)
      gl.uniform1f(uRs, rs)
      gl.uniform2f(uSeat, PLATE_SEAT_X, PLATE_SEAT_Y)
      gl.uniform2f(uMark, mark.x, mark.y)
      gl.uniform2f(uMarkDir, mark.dirX, mark.dirY)
      gl.uniform1f(uMarkTide, mark.tide)
      // The stand-in is retired while the page is being taken. Its whole choreography is measured
      // against the plate's resting capture radius, and the hole is several times that for those
      // ten seconds — an arrow being absorbed at a radius the shadow has long since swallowed
      // reads as a bug, and the hole has bigger prey in frame anyway.
      gl.uniform1f(uMarkAlpha, d?.taking ? 0 : mark.alpha)
      gl.uniform1f(uMarkSpin, mark.spin)
      for (let i = 0; i < 3; i++) {
        const q = pulsars[i]!
        psrPack[i * 4] = q.x
        psrPack[i * 4 + 1] = q.y
        psrPack[i * 4 + 2] = q.gate
        psrPack[i * 4 + 3] = q.beam
        psrLitPack[i * 3] = q.flash
        psrLitPack[i * 3 + 1] = q.flux
        psrLitPack[i * 3 + 2] = q.spread
      }
      gl.uniform4fv(uPsr, psrPack)
      gl.uniform3fv(uPsrLit, psrLitPack)
      gl.uniform4f(uCam, Math.cos(cam.az), Math.sin(cam.az), Math.sin(cam.elev), Math.cos(cam.elev))
      // Every probe is read every frame rather than cached, which is what lets a theme
      // flip take effect without any wiring between the toggle and this canvas.
      const ink = readColour(probe!)
      const paper = readColour(paperProbe!)
      const inkIsDarker = luminance(ink) < luminance(paper)

      gl.uniform3fv(uInk, ink)
      gl.uniform3f(uPulse, pulse.x, pulse.y, time - pulse.at)
      gl.uniform1f(uShadow, inkIsDarker ? 1 : 0)
      // Points, unlike the contour field this plate used to draw, cover almost none of the
      // canvas — so the light theme is no longer the one that needs holding back. Near full
      // strength there, and a shade under it on a dark ground where pale ink carries further.
      gl.uniform1f(uOpacity, inkIsDarker ? 1.0 : 0.90)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    function loop(now: number) {
      elapsed = (now - start) / 1000
      // The chase is fast enough that the mark feels like the cursor and slow enough that
      // the hole visibly wins near the shadow.
      pointer.x += (pointer.targetX - pointer.x) * 0.3
      pointer.y += (pointer.targetY - pointer.y) * 0.3
      pointer.hover += (pointer.targetHover - pointer.hover) * 0.12
      updateMark(elapsed)
      draw(elapsed)
      frame = requestAnimationFrame(loop)
    }

    function play() {
      if (frame || reduceMotion.matches) return
      start = performance.now() - elapsed * 1000
      frame = requestAnimationFrame(loop)
    }

    function pause() {
      if (!frame) return
      cancelAnimationFrame(frame)
      frame = 0
    }

    /** Viewport pixels to plate space — the shader's coordinates, y up, origin at the hole. */
    function toPlateSpace(event: PointerEvent) {
      if (box.height === 0) return null
      const x = (event.clientX - box.left) / box.width
      const y = 1 - (event.clientY - box.top) / box.height
      return { x, y, px: (x - 0.5) * (box.width / box.height) * 2, py: (y - 0.5) * 2 }
    }

    /**
     * Track the hand, for the absorption mark alone: the native cursor is hidden over the
     * canvas, so the shader must always know where to draw its stand-in. Hover gates the
     * mark to the plate's own rectangle so it does not haunt the rest of the page.
     */
    function onPointerMove(event: PointerEvent) {
      if (!visible || reduceMotion.matches) return
      const at = toPlateSpace(event)
      if (!at) return
      pointer.targetX = at.px
      pointer.targetY = at.py
      pointer.targetHover = at.x >= 0 && at.x <= 1 && at.y >= 0 && at.y <= 1 ? 1 : 0
    }

    /**
     * Strike the plate. A click opens a ranging circle from where it landed — the one thing
     * on this canvas that happens because you asked for it rather than on its own schedule.
     *
     * Bound to the canvas, not the window, so it answers the plate and nothing else; and the
     * listener is not there at all under reduced motion, where the shader is a still frame and
     * a click would have nowhere to go. Decoration stays out of the tab order, so this is
     * deliberately pointer-only — nothing is behind it that a keyboard user would be missing.
     */
    function onPointerDown(event: PointerEvent) {
      if (reduceMotion.matches) return
      const at = toPlateSpace(event)
      if (!at) return
      pulse.x = at.px
      pulse.y = at.py
      pulse.at = elapsed
      // A strike while the canvas is paused off-screen would otherwise sit unrendered and
      // then appear mid-life when the plate scrolls back in.
      if (!frame) draw(elapsed)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false
        if (visible) play()
        else pause()
      },
      { rootMargin: '96px' },
    )
    observer.observe(canvas)

    const resizeObserver = new ResizeObserver(() => {
      measure()
      resize()
      if (!frame) draw(elapsed)
    })
    resizeObserver.observe(canvas)

    // Repaint on a theme flip: the ink is read from the resolved palette, and nothing else
    // would tell a paused canvas that the palette moved.
    const themeObserver = new MutationObserver(() => {
      if (!frame) draw(elapsed)
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    })

    function onMotionPreferenceChange() {
      if (reduceMotion.matches) {
        pause()
        draw(0)
      } else if (visible) {
        play()
      }
    }

    // Scrolling changes where the plate is without changing its size, which no ResizeObserver
    // reports. One passive read per scroll event keeps the cached box honest for the strike.
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    canvas.addEventListener('pointerdown', onPointerDown, { passive: true })
    reduceMotion.addEventListener('change', onMotionPreferenceChange)

    measure()
    resize()
    draw(0)
    if (!reduceMotion.matches) play()

    return () => {
      pause()
      observer.disconnect()
      resizeObserver.disconnect()
      themeObserver.disconnect()
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      window.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerdown', onPointerDown)
      reduceMotion.removeEventListener('change', onMotionPreferenceChange)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      gl.deleteBuffer(buffer)
    }
    // The drive is a ref, so its identity never changes: this still runs exactly once per mount
    // and the WebGL context is never rebuilt.
  }, [drive])

  return (
    // The tilt is gone with the rest of the cursor theatre, but the perspective stays on the
    // outer box: it is what lets a translateZ on anything seated on the plate read as depth.
    //
    // data-horizon-hole marks this subtree as the attractor rather than prey. The swallow walks
    // the document and transforms everything it finds; the one thing it must not touch is the
    // hole doing the swallowing, and the audio control that rides along with it.
    <div
      data-horizon-hole
      className="relative isolate mx-auto grid h-[clamp(16rem,30vw,24rem)] w-full max-w-[var(--measure-column)] place-items-center [perspective:1100px]"
    >
      {/* Colour probe. The shader reads its ink off this element's resolved `color`,
          which costs nothing and keeps the palette in one place instead of duplicated in
          GLSL — including across a light/dark flip, where this simply resolves differently. */}
      <span
        ref={probeRef}
        aria-hidden
        className="pointer-events-none absolute text-foreground opacity-0"
      />
      {/* Second probe for the paper. Comparing the two luminances is how the shader learns
          which way round the theme is, without anything here knowing the word "dark". */}
      <span
        ref={paperProbeRef}
        aria-hidden
        className="pointer-events-none absolute text-background opacity-0"
      />

      <div className="absolute inset-0 grid place-items-center [transform-style:preserve-3d]">
        {/* Scroll parallax rides on the canvas itself rather than a wrapper: an `opacity`
            on an ancestor creates a stacking context, which flattens the 3D subtree and
            collapses the subject's translateZ back onto the plate.

            The native cursor is hidden over the canvas because the shader draws its own —
            the absorption mark — and two cursors is one too many. Not under reduced motion,
            where the shader is a still frame and could not keep a stand-in under the hand. */}
        <motion.canvas
          ref={canvasRef}
          aria-hidden
          className={`absolute inset-0 h-full w-full ${supported ? '' : 'hidden'} ${
            supported && !prefersReducedMotion ? 'cursor-none' : ''
          }`}
          style={prefersReducedMotion ? undefined : { y: parallax, opacity: fade }}
        />

        {/* Where WebGL2 is unavailable the plate still prints: a field of points with a
            blank disc at the centre. The shadow is the one part of the drawing that survives
            losing the GPU, because it was never made of ink to begin with. */}
        {!supported && (
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(closest-side,transparent_22%,black_46%,transparent_92%)]"
            style={{
              backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1.4px)',
              backgroundSize: '19px 19px',
            }}
          />
        )}

        {/* Anything handed to the plate rides pushed toward the viewer. Nothing is handed
            over since the portrait moved down beside the name, but the seat stays for
            whoever sits in it next. */}
        {children ? <div className="relative [transform:translateZ(52px)]">{children}</div> : null}
      </div>

      {/* Outside the plate's own box on purpose: this control must not inherit the canvas's
          scroll fade. */}
      <AudioToggle />
    </div>
  )
}
