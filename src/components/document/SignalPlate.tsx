'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'

import { AudioToggle } from './AudioToggle'

/**
 * The one moving thing on the page.
 *
 * A star chart with a mass pinned at its centre. A faint graticule, four depths of stars
 * parallaxed against each other down to a dust-fine veil, an asterism, a dust lane, small
 * nebulas drifting through, and now and then a meteor. Click it and a ranging circle opens
 * from the point of contact, lifting the magnitude of every star it crosses.
 *
 * The black hole is built from its physics rather than drawn: the sky behind it is sampled
 * through the point-mass lens equation, so stars and graticule lines arc around it and a
 * second inverted image appears inside the Einstein radius without being asked for. Around it
 * an accretion disk lives in the source plane and is seen only through that lens, which is
 * what folds its far side into the arc riding over the shadow; its light carries the Doppler
 * beaming of matter orbiting at four tenths of c, the gravitational redshift of the inner
 * annulus, and the winding shear of a Keplerian flow. Point sources brighten by the lens's
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
uniform vec2  uPointer;  // plate space (y up, 1 unit = half the plate height)
uniform float uHover;    // 0 at rest, 1 while the pointer is over the plate
uniform vec3  uInk;      // resolved page ink, 0..1
uniform vec3  uPulse;    // xy = where the plate was last struck, z = seconds since
uniform float uOpacity;
uniform float uShadow;   // 1 when the ink is darker than the paper, 0 when it is lighter

out vec4 fragColor;

/**
 * The asterism. Seven catalogued positions in plate space, in two figures that flank the
 * hole — hand-placed rather than generated, because a random graph of lines looks like
 * a network diagram and a chosen one looks like a constellation.
 */
const vec2 NODES[7] = vec2[7](
  vec2(-1.30,  0.40), vec2(-0.98,  0.60), vec2(-0.84,  0.16), vec2(-1.18, -0.26),
  vec2( 0.90, -0.46), vec2( 1.18, -0.08), vec2( 1.42,  0.30)
);

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

/** Perpendicular distance to a line segment — the asterism is drawn from these. */
float segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
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
 * A small nebula: a gaussian envelope over two octaves of the same value noise the dust lane
 * uses, thresholded so it arrives as wisps rather than as a blob. The centre seeds the noise,
 * which is what makes three calls with three centres three different clouds.
 */
float wisp(vec2 p, vec2 c, float size) {
  vec2 d = p - c;
  float env = exp(-dot(d, d) / (size * size));
  float tex = noise(d * 7.0 + c * 3.1) * 0.62 + noise(d * 14.0 - c * 1.7) * 0.38;
  return env * smoothstep(0.28, 0.88, tex);
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
  float h = env * 0.80 * sin(t * w - length(d) * k);
  float c2 = cos(2.0 * psi);
  float s2 = sin(2.0 * psi);
  // The quadrupole: the + polarisation rotated to psi. Along the axis space stretches, across
  // it space squeezes — which is why a grid inside it goes oval rather than merely sideways.
  vec2 disp = 0.5 * h * vec2(c2 * d.x + s2 * d.y, s2 * d.x - c2 * d.y);
  return vec3(disp, env);
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
  // the asterism, the nebulas, and the occasional meteor.
  float span = (uSize.x / uSize.y) * 2.0 + 1.4;
  vec2 holeAt = vec2(0.0, 0.03);

  // One free parameter, the Schwarzschild radius; everything else about the hole follows from
  // it the way it does in the real object. The dark disc is not the horizon — it is the photon
  // capture cross-section at √27/2 · rs ≈ 2.598 rs, which is what an observer actually sees and
  // is why a black hole always looks larger than its own horizon. The Einstein radius is the
  // one genuinely free choice here, since it depends on distances this scene does not have —
  // it is set just outside the capture radius, so the strong-lensing region hugs the shadow
  // the way it does when the source sky sits far behind the lens, and the far side of the
  // disk folds up against the ring instead of floating above it.
  float rs = 0.075;
  float holeR = 2.598 * rs;
  float einstein = 0.22;

  // Time, bent. Two separate relativistic effects, and they show up in different ways:
  //
  //  · dilation — the Schwarzschild factor √(1 − rs/r), which is the rate a distant observer
  //    sees a clock tick at radius r. It runs to zero at the horizon and to one far away. It
  //    is taken from the shadow edge rather than the horizon itself, because the horizon is
  //    hidden inside the shadow and a gradient nobody can see is not worth computing. Stars
  //    near the mass blink slower; the effect is continuous, so there is no edge to it.
  //  · Shapiro delay — light passing close to a mass takes measurably longer to arrive, by an
  //    amount going as ln of the impact parameter. This is a fixed lag, not a slower rate, so
  //    the sky near the hole sits a constant interval behind the sky around it and the field
  //    shears rather than tears. A rate difference would have wound the two apart without
  //    bound and eventually ripped the plate in half.
  float holeDist = length(p - holeAt);
  float dil = sqrt(clamp(1.0 - holeR / max(holeDist, holeR), 0.0, 1.0));
  float shapiro = 19.0 * rs * log(1.0 + 3.0 * holeR / max(holeDist, holeR * 0.6));
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

  // The incursions, as strain: displacement applied to the sky, envelopes kept for the blur.
  float breathe1 = smoothstep(0.30, 0.95, sin(uTime * 0.047) * 0.5 + 0.5);
  float breathe2 = smoothstep(0.38, 0.98, cos(uTime * 0.031) * 0.5 + 0.5) * 0.7;
  vec3 wave1 = gwave(sky, vec2(sin(uTime * 0.061) * 1.30, cos(uTime * 0.043) * 0.50), uTime, 1.05, 3.1, breathe1, uTime * 0.021);
  vec3 wave2 = gwave(sky, vec2(cos(uTime * 0.037) * 1.05, sin(uTime * 0.029) * 0.58), uTime, 0.83, 2.6, breathe2, 1.7 - uTime * 0.017);
  // The strain is held out of the lens's neighbourhood. Near the mass, spacetime is the
  // hole's, and a passing ripple is a rounding error on it — and on the plate, a wobbling
  // shadow reads as a broken shadow. The waves own the field; the hole owns its ground.
  float calm = smoothstep(0.30, 0.85, length(p - holeAt));
  sky += (wave1.xy + wave2.xy) * calm;
  float anomaly = clamp(wave1.z + wave2.z, 0.0, 1.0) * calm;

  // The graticule: meridians and parallels, each bowed a little by the other's coordinate, so
  // the grid carries the suggestion of a projected sphere before anything bends it. It is the
  // paper, not the subject — but it is also the only thing on the plate whose *shape* is known
  // in advance, which is what makes it the instrument that shows the lensing.
  vec2 q = vec2(sky.x * (1.0 + 0.055 * sky.y * sky.y), sky.y + 0.045 * sky.x * sky.x);
  float graticule = max(contour(q.x * 1.35, 3.0), contour(q.y * 1.35, 3.0)) * 0.075;

  // A dust lane, drifting with the deep sky. Two octaves of value noise inside a soft diagonal
  // band, at a few percent — enough that the field is not evenly empty, never enough to read
  // as a cloud someone painted.
  vec2 dustAt = sky * vec2(0.9, 2.1) - vec2(uTime * 0.0075, 0.0);
  float dust = (noise(dustAt * 1.7) * 0.65 + noise(dustAt * 3.9) * 0.35);
  dust *= smoothstep(0.95, 0.10, abs(sky.y * 1.6 - sky.x * 0.28)) * mix(0.030, 0.016, uShadow);

  // Small nebulas, where the wormhole used to be. Three wisps riding two of the sky's depth
  // layers, wrapping on the same span as everything else that travels — so they cross, leave,
  // and come back around, and the parallax between the pair and the loner is one more depth
  // cue for free. Extended sources, so like the graticule they bend through the lens without
  // brightening.
  vec2 nebA = sky + vec2(mod(tSky * 0.0230 + span * 0.31, span) - span * 0.5, 0.0);
  vec2 nebB = sky + vec2(mod(tSky * 0.0400 + span * 0.77, span) - span * 0.5, 0.0);
  float nebula = wisp(nebA, vec2(-0.72, 0.47), 0.17)
               + wisp(nebA, vec2(0.95, -0.50), 0.21)
               + wisp(nebB, vec2(0.18, 0.62), 0.13);
  nebula *= mix(0.085, 0.045, uShadow);

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
  float weight = mix(1.0, 1.10, uShadow);
  float glow = mix(0.20, 0.055, uShadow);
  float swell = 1.0 + anomaly * 0.55;
  float deep = catalogue(sky - vec2(tSky * 0.0230, 0.0), 8.0, 0.20, uTime, 0.55 * weight, px, swell, glow, dil);
  float mid = catalogue(sky - vec2(tSky * 0.0400, 0.0), 5.0, 0.17, uTime, 0.85 * weight, px, swell, glow, dil);
  float near = catalogue(sky - vec2(tSky * 0.0680, 0.0), 2.9, 0.14, uTime, 1.00 * weight, px, swell, glow, dil);
  // A fourth layer, behind the deep one: star dust. Denser, fainter, smaller and slower than
  // everything in front of it — the veil that keeps the gaps between catalogued stars from
  // reading as empty paper.
  float veil = catalogue(sky - vec2(tSky * 0.0150, 0.0), 13.0, 0.30, uTime, 0.30 * weight, px, swell, glow * 0.4, dil);
  float stars = max(max(near, veil), max(mid, deep));

  // The asterism rides the middle layer, wrapping on the same span as everything that
  // travels, so it leaves at one edge and returns at the other where the mask has already
  // faded it to nothing.
  vec2 figure = vec2(mod(uTime * 0.0400 + span * 0.5, span) - span * 0.5, 0.0);
  vec2 pf = sky + figure;

  float nodes = 0.0;
  for (int k = 0; k < 7; k++) {
    vec2 d = pf - NODES[k];
    float dd = dot(d, d);
    nodes = max(nodes, exp(-dd / (0.0230 * 0.0230)) + 0.18 * exp(-dd / (0.070 * 0.070)));
  }

  // Two open figures, three segments and two. Never a closed shape — a closed one reads as a
  // polygon someone drew, an open one reads as a path between stars.
  float links = 1e9;
  links = min(links, segment(pf, NODES[0], NODES[1]));
  links = min(links, segment(pf, NODES[1], NODES[2]));
  links = min(links, segment(pf, NODES[2], NODES[3]));
  links = min(links, segment(pf, NODES[4], NODES[5]));
  links = min(links, segment(pf, NODES[5], NODES[6]));
  float asterism = smoothstep(hair + px, hair - px, links) * 0.15;

  // The accretion disk — the proper view of the hole, in the same single ink.
  //
  // The disk is a thin annulus living in the source plane, from the innermost stable orbit
  // at 3 rs out to where its emission has died, seen at ~78° of inclination. Because it is
  // sampled through the lens above, the famous silhouette assembles itself: the far side of
  // the disk is folded up over the shadow and arrives as the arc riding the ring, with its
  // inverted twin hugging the underside — nothing here draws either arc.
  //
  // Its light is shaped by three real factors. Keplerian speed √(rs/2r), four tenths of c at
  // the inner edge; the Doppler factor cubed, which is why the approaching limb is laid in
  // dense ink and the receding one in almost none — beaming, rendered as line weight; and
  // the gravitational redshift √(1 − rs/r), quietly dimming the innermost annulus that the
  // beaming would otherwise overstate. The lanes are noise carried on annular bands, each
  // band turning at its own Keplerian rate — banded on purpose, because a continuous shear
  // winds any pattern below pixel scale within minutes, and adjacent lanes visibly slipping
  // past each other is precisely what differential rotation looks like on a plate.
  float sinI = 0.978;
  float cosI = 0.208;
  vec2 dsrc = sky - holeAt;
  vec2 dplane = vec2(dsrc.x, dsrc.y / cosI);
  float rd = max(length(dplane), 1e-4);
  float diskIn = 3.0 * rs;
  float diskOut = 7.0 * rs;
  // Every per-orbit factor is clamped at the ISCO: inside it nothing orbits and nothing
  // emits — and the raw radius runs through zero near the Einstein ring, where an unclamped
  // β would pass 1 and the Doppler term would divide by nothing.
  float rdc = max(rd, diskIn);
  float phi = atan(dplane.y, dplane.x);
  // The rotation is the point of the disk, so it is allowed to be seen: the inner lanes lap
  // the hole in a few seconds and the outer ones in tens, on the same r^(-3/2) law, and the
  // contrast between lanes is kept high enough that the motion reads from across the room.
  float bandR = max((floor(rd * 26.0) + 0.5) / 26.0, diskIn);
  float whirl = 0.16 / pow(bandR, 1.5);
  float lanes = 0.35 + 0.90 * noise(vec2(rd * 46.0, (phi - whirl * uTime) * 3.0));
  float beta = sqrt(rs / (2.0 * rdc));
  float dopp = pow(1.0 / (1.0 - beta * sinI * (dplane.x / rdc)), 3.0);
  float gfac = sqrt(max(1.0 - rs / rdc, 0.0));
  float disk = pow(rs / rdc, 2.0) * 26.0
    * smoothstep(diskIn * 0.92, diskIn * 1.22, rd)
    * smoothstep(diskOut * 1.55, diskOut * 0.72, rd)
    * lanes * min(dopp, 6.0) * gfac * gfac
    * mix(0.34, 0.30, uShadow);

  // The sky, in the order a plate is printed: paper, dust, the lines drawn on it, the objects.
  // The sweep lifts the magnitude of every star it crosses, which is the whole point of it —
  // it is not a ring travelling over the chart, it is the chart being read. The point sources
  // alone carry the lens magnification, for the surface-brightness reason given above.
  float field = max(graticule, max(dust, max(asterism, nebula)));
  field = max(field, disk);
  field = max(field, max(stars, nodes) * magn * (1.0 + sweep * 1.8 + anomaly * 0.35));
  // Meteors are point-like too, so they carry the magnification: one crossing behind the
  // hole flares as it goes, which is worth the wait when it happens.
  field = max(field, (meteor(sky, uTime, 3.1, px) + meteor(sky, uTime, 7.9, px)) * 0.6 * magn);
  field = max(field, sweep * 0.30);

  // Inside the capture radius there is nothing to draw — not dark ink, *no* ink, so the disc
  // is the colour of whatever the plate is sitting on. On paper that is a hole punched in the
  // chart; on a dark ground it is the thing itself. One rule, and the theme decides what it
  // means. The edge is nearly hard, because the photon sphere is: a ray one hair inside it
  // does not come back.
  float holeD = holeDist;
  field *= smoothstep(holeR * 0.90, holeR * 1.02, holeD);

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

  // No marker rings the subject any more — the dashed reticle went with the portrait, and
  // the halo that cleared space for it went too. A hole that bends the whole sky around
  // itself does not need an arrow pointing at it; the sky runs all the way in to the shadow,
  // because the crowding at the lens is the picture.

  // One mask, applied last, covering lines and objects alike — so nothing reaches the edge of
  // the drawing buffer and the plate has no boundary of its own.
  float mask = smoothstep(2.0, 0.35, length(p * vec2(0.62, 1.0)));
  mask *= smoothstep(0.0, 0.30, uv.x) * smoothstep(1.0, 0.70, uv.x);
  mask *= smoothstep(0.0, 0.30, uv.y) * smoothstep(1.0, 0.70, uv.y);
  ink *= mask;

  // The cursor, absorbed. The native cursor is hidden over the canvas and the arrow drawn
  // here stands in for it — same silhouette, tip on the same hotspot — drawn where the
  // hole's gravity says it is, not where the hand says. At arm's length the two agree and
  // nobody notices the swap. Then the pull comes on over most of the plate: the arrow is
  // dragged off the hand toward the mass, harder the closer it gets, stretched along the
  // infall line and squeezed across it — the tide.
  //
  // It never vanishes and it never crosses. The infall is clamped just outside the ring,
  // where the arrow freezes, dims by the Schwarzschild factor, and waits — which is exactly
  // how a distant observer watches a thing fall in, and also what keeps a quarter of the
  // plate from becoming a dead zone with no cursor in it at all. Pull the hand back and
  // the arrow climbs back out to the fingertip.
  float reach = length(uPointer - holeAt);
  float grab = smoothstep(1.10, 0.10, reach);
  vec2 handDir = (uPointer - holeAt) / max(reach, 1e-3);
  float rawDist = reach * (1.0 - pow(max(grab, 1e-4), 1.35) * 0.98);
  float markDist = max(rawDist, holeR * 1.06);
  vec2 markAt = holeAt + handDir * markDist;
  vec2 inDir = -handDir;
  vec2 md = p - markAt;
  float tide = 1.0 + 5.0 * grab * grab;
  float along = dot(md, inDir);
  vec2 perpD = vec2(-inDir.y, inDir.x);
  vec2 msd = inDir * (along / tide) + perpD * (dot(md, perpD) * sqrt(tide));
  float alive = sqrt(clamp(1.0 - holeR / markDist, 0.0, 1.0));

  // Black body, white rim, small — the macOS arrow, in its own two inks on top of the
  // plate's one. The cursor is the visitor's property, not the chart's subject, so it is
  // the single thing on the plate allowed to keep its native colours in both themes.
  float cs = 0.095;
  float dC = sdCursor(msd / cs) * cs;
  float bodyM = smoothstep(px * 1.2, -px * 1.2, dC);
  float rimM = smoothstep(px * 1.2, -px * 1.2, dC - px * 1.7) * (1.0 - bodyM);
  float curA = (bodyM + rimM) * uHover * alive;
  vec3 curRGB = mix(vec3(1.0), vec3(0.0), bodyM);

  // Grain multiplies rather than adds. Added, it survived the mask and laid a faint dither
  // across every pixel of the buffer — which is exactly the rectangle that was showing up
  // against the page. Multiplied, zero stays zero and the plate has no visible extent.
  ink *= 1.0 + (hash(gl_FragCoord.xy) - 0.5) * 0.13;

  // The plate in its one ink and the cursor in its two, composited source-over. Divided
  // back out of premultiplied form, because the context was asked for straight alpha.
  float baseA = clamp(ink, 0.0, 1.0) * uOpacity;
  float outA = curA + baseA * (1.0 - curA);
  fragColor = vec4((curRGB * curA + uInk * baseA * (1.0 - curA)) / max(outA, 1e-4), outA);
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

export function SignalPlate({ children }: { readonly children?: React.ReactNode }) {
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
    const uPointer = gl.getUniformLocation(program, 'uPointer')
    const uHover = gl.getUniformLocation(program, 'uHover')
    const uInk = gl.getUniformLocation(program, 'uInk')
    const uPulse = gl.getUniformLocation(program, 'uPulse')
    const uOpacity = gl.getUniformLocation(program, 'uOpacity')
    const uShadow = gl.getUniformLocation(program, 'uShadow')

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

    // The cursor's position in plate space, for the absorption mark. The rendered values
    // chase the targets rather than jumping, so a fast hand drags the mark instead of
    // teleporting it — which near the mass reads as the hand losing the tug of war. Parked
    // far off-plate so the mark's first appearance is a fade-in, not a jump from origin.
    const pointer = { x: 0, y: -3, targetX: 0, targetY: -3, hover: 0, targetHover: 0 }

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
      gl.uniform2f(uSize, width, height)
      gl.uniform1f(uTime, time)
      gl.uniform2f(uPointer, pointer.x, pointer.y)
      gl.uniform1f(uHover, pointer.hover)
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
  }, [])

  return (
    // The tilt is gone with the rest of the cursor theatre, but the perspective stays on the
    // outer box: it is what lets a translateZ on anything seated on the plate read as depth.
    <div className="relative isolate mx-auto grid h-[clamp(16rem,30vw,24rem)] w-full max-w-[var(--measure-column)] place-items-center [perspective:1100px]">
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
