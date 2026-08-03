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
uniform vec4  uPsr;      // the pulsar: xy = where it is, z = the flyby gate, w = beam axis angle
uniform vec2  uPsrLit;   // x = the lighthouse flash, 0..1; y = Doppler beaming on the flux

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
  float sinI = 0.992;
  float cosI = 0.125;
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
  float phi = atan(dplane.y, dplane.x);
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
 * The beam is a cone of roughly eighteen degrees half-width, which puts the duty cycle near
 * a tenth of the period. Real pulsars are narrower — a few percent is typical — but a few
 * percent of this star's 0.6 s period is an eighteen-millisecond flash, and at sixty frames
 * a second that is one frame, seen or missed depending on where the raster lands.
 *
 * Nothing here decides *when* it flashes. The spin, the two time dilations and the Doppler
 * shift are integrated on the CPU across the whole flyby and arrive as an angle and a flux;
 * this function draws the star where it is told.
 */
vec2 pulsar(vec2 s, vec2 at, float ang, float flash, float px) {
  vec2 d = s - at;
  vec2 axis = vec2(cos(ang), sin(ang));
  // Absolute value on both projections folds the two poles onto one evaluation: the beam and
  // its antipode are the same cone, drawn once and mirrored through the star.
  float along = abs(dot(d, axis));
  float across = abs(dot(d, vec2(-axis.y, axis.x)));
  float halfW = 0.013 + along * 0.30;
  float lobe = 1.0 - clamp(across / halfW, 0.0, 1.0);
  float reach = max(1.0 - along / 0.34, 0.0);
  float beams = lobe * lobe * reach * reach;

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
  return vec2(core * (0.52 + 0.48 * flash), beams * (0.15 + 0.55 * flash));
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
  float einstein = 0.25;

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

  // The accretion disk — the proper view of the hole, in the same single ink. The annulus
  // lives in the source plane and is seen here through the lens above, which is what folds
  // its far side into the arcs over and under the shadow; the physics is all in diskLight.
  float disk = diskLight(sky - holeAt, rs, uTime, uShadow);

  // The pulsar on its flyby, drawn against the lensed sky exactly like the catalogue stars —
  // which is what makes the lens carry it for free: crossing behind the mass it arcs,
  // doubles and flares toward a ring without a line here asking for any of it. The core is a
  // point source and takes the magnification; the beams are extended, and lensing conserves
  // surface brightness, so they are handed it unbrightened.
  vec2 psrParts = pulsar(sky, uPsr.xy, uPsr.w, uPsrLit.x, px) * uPsr.z * uPsrLit.y;
  float psr = psrParts.x * magn + psrParts.y;

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
  // by rule and mostly still is: the graticule, the dust, the catalogue, the asterism, the
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

  // Weighted by each source's own contribution, and the shadow's cut applied to the two that
  // sit behind it, so the tint follows the ink rather than floating free of it: where the disk
  // is what you are looking at the pixel is amber, where a catalogue star crosses it the ink
  // takes its share back, and inside the shadow — where there is no ink at all — there is no
  // colour either. Read before the mask and the grain, which scale ink and hue alike and so
  // cancel out of the ratio.
  float diskLit = disk * cut;
  float psrLit = psr * cut;
  float hueW = diskLit + ring + psrLit;
  // The ring takes the hot end flat rather than the ramp: it is light that has orbited the
  // mass and come back out, so it is the disk's own material seen at its most beamed.
  vec3 hue = emberRGB * diskLit + emberHot * ring + psrRGB * psrLit;
  vec3 baseInk = mix(uInk, hue / max(hueW, 1e-4), clamp(hueW / max(ink, 1e-4), 0.0, 1.0));

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

    // Mirrors of the shader's geometry — the hole's seat and its capture radius — so the
    // CPU can choreograph what the GPU draws. Change rs in the GLSL and change it here.
    const HOLE_X = 0
    const HOLE_Y = 0.03
    const HOLE_R = 2.598 * 0.075

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

    function updateMark(now: number) {
      const hx = pointer.x - HOLE_X
      const hy = pointer.y - HOLE_Y
      const reach = Math.max(Math.hypot(hx, hy), 1e-3)
      const dirX = hx / reach
      const dirY = hy / reach

      if (mark.phase === 'free') {
        const grab = smooth(1.1, 0.1, reach)
        const dist = Math.max(reach * (1 - Math.pow(Math.max(grab, 1e-4), 1.35) * 0.98), HOLE_R * 1.06)
        mark.x = HOLE_X + dirX * dist
        mark.y = HOLE_Y + dirY * dist
        mark.dirX = -dirX
        mark.dirY = -dirY
        mark.tide = 1 + 5 * grab * grab
        mark.spin = 0
        mark.alpha = Math.sqrt(Math.max(1 - HOLE_R / dist, 0)) * pointer.hover
        if (pointer.hover > 0.5 && reach < 0.42 && now >= mark.cooldownUntil) {
          mark.phase = 'absorb'
          mark.since = now
          mark.startDist = dist
          mark.startAngle = Math.atan2(dirY, dirX)
        }
      } else if (mark.phase === 'absorb') {
        const u = Math.min((now - mark.since) / 0.9, 1)
        // The plunge accelerates (u^2.2) while the drain winds it around and the tide
        // climbs — spaghettification as a cursor understands it.
        const dist = mark.startDist + (HOLE_R * 0.5 - mark.startDist) * Math.pow(u, 2.2)
        const ang = mark.startAngle + 3.2 * u * u
        mark.x = HOLE_X + Math.cos(ang) * dist
        mark.y = HOLE_Y + Math.sin(ang) * dist
        mark.dirX = -Math.cos(ang)
        mark.dirY = -Math.sin(ang)
        mark.tide = 6 + 10 * u * u
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
        const dist = HOLE_R * 1.06 + (Math.max(reach, 0.9) * 1.15 - HOLE_R * 1.06) * e
        mark.x = HOLE_X + dirX * dist
        mark.y = HOLE_Y + dirY * dist
        mark.dirX = -dirX
        mark.dirY = -dirY
        mark.tide = 1 + 5 * (1 - e)
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
    const PSR_RS = 0.075                    // mirrors rs in the GLSL — change both together
    const PSR_GM = PSR_RS / 2               // geometric units: c = 1, lengths in plate units
    const PSR_R0 = 2.6                      // handed to the integrator well off the plate
    const PSR_V0 = 0.3                      // c, comfortably above escape at r0 — unbound
    const PSR_LIFE = 17                     // seconds of flyby, about ten of them on the plate
    const PSR_PERIOD = 41                   // and this long from one flyby to the next
    const PSR_STEP = 0.012                  // leapfrog step: sub-pixel across the whole run
    const PSR_SPIN = (Math.PI * 2) / 0.6    // rad/s at the star. 0.6 s is an ordinary period —
                                            // B0329+54 sits at 0.714 s; the Crab's 33 ms would
                                            // arrive as a blur and read as a flickering star
    const PSR_COS_BEAM = Math.cos(0.32)     // the flash threshold: cos of the beam half-width
    const PSR_SIN_I = 0.992                 // the disk's inclination, reused — the viewer is +y

    const pulsar = { x: 0, y: -9, gate: 0, beam: 0, flash: 0, flux: 1 }

    /** The shader's hash, in JS, so the schedule is drawn from the same kind of noise. */
    function psrHash(n: number) {
      const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
      return s - Math.floor(s)
    }

    function updatePulsar(now: number) {
      const cycle = Math.floor(now / PSR_PERIOD)
      const local = now - cycle * PSR_PERIOD
      if (local > PSR_LIFE) {
        pulsar.gate = 0
        return
      }

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
      const doomed = psrHash(cycle * 7.3 + 4.8) < 0.34
      const side = psrHash(cycle * 1.7 + 0.3) < 0.5 ? 1 : -1
      const hand = psrHash(cycle * 3.1 + 9.4) < 0.5 ? 1 : -1
      const spread = psrHash(cycle * 5.9 + 2.6)
      const aim = (doomed ? 0.170 + 0.035 * spread : 0.245 + 0.055 * spread) * hand
      // In from one side or the other, because the plate is wide and short.
      const th0 = (side > 0 ? 0 : Math.PI) + (psrHash(cycle * 11.3 + 7.2) - 0.5) * 0.44

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

      // A whole number of fixed steps plus one partial step for the remainder. Fixed, so the
      // path is identical on every frame no matter when the frame lands; plus the remainder, so
      // the star travels smoothly instead of in twelve-millisecond hops.
      const whole = Math.floor(local / PSR_STEP)
      for (let i = 0; i <= whole; i++) {
        const dt = i < whole ? PSR_STEP : local - whole * PSR_STEP
        if (dt <= 0) break

        // Leapfrog under Paczyński–Wiita, Φ = −GM/(r − rs): one extra term over Newton, and it
        // puts the innermost stable orbit and the strong-field bending where Schwarzschild puts
        // them. So the periastron advance is not applied to this path afterwards — it *is* this
        // path, straight out of the potential.
        let r = Math.max(Math.hypot(x, y), PSR_RS * 1.05)
        let pull = -PSR_GM / Math.pow(Math.max(r - PSR_RS, PSR_RS * 0.05), 2)
        vx += ((pull * x) / r) * dt * 0.5
        vy += ((pull * y) / r) * dt * 0.5
        x += vx * dt
        y += vy * dt
        r = Math.max(Math.hypot(x, y), PSR_RS * 1.05)
        pull = -PSR_GM / Math.pow(Math.max(r - PSR_RS, PSR_RS * 0.05), 2)
        vx += ((pull * x) / r) * dt * 0.5
        vy += ((pull * y) / r) * dt * 0.5

        // Three separate reasons the pulses do not arrive at the rate they left, and they
        // multiply:
        //  · gravitational dilation, √(1 − rs/r) — the star's clock runs slow to a distant one
        //  · relativistic dilation, √(1 − v²) — it passes 0.6 c at periastron, so this is not a
        //    rounding error on the first one
        //  · Doppler, 1/(1 − β) — the pulses bunch on the approach and stretch on the retreat,
        //    and unlike the other two this factor changes sign halfway through the pass
        const redshift = Math.sqrt(Math.max(1 - PSR_RS / r, 0))
        const speed = Math.min(Math.hypot(vx, vy), 0.97)
        const doppler = 1 / Math.max(1 - vy * PSR_SIN_I, 0.22)
        phase += PSR_SPIN * redshift * Math.sqrt(1 - speed * speed) * doppler * dt
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
      pulsar.flash = smooth(PSR_COS_BEAM, 1, Math.abs(Math.sin(pulsar.beam)))
      pulsar.flux = flux
      // Fade the event in and out. The plate's edge mask will not do it alone: out at r0 the
      // mask still passes about 15%, so without this the star would wink into existence. A star
      // that was eaten stays at nothing for the rest of the cycle — the integrator stopped at
      // the shadow, so there is no position left to trust either.
      pulsar.gate = eaten ? 0 : smooth(0, 0.9, local) * smooth(PSR_LIFE, PSR_LIFE - 1.4, local) * dim
    }

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
      // Solved here rather than in the loop, so every path that renders a frame — the loop, a
      // resize while paused, a theme flip, the reduced-motion still — gets a pulsar that agrees
      // with the clock that frame was drawn for.
      updatePulsar(time)
      gl.uniform2f(uSize, width, height)
      gl.uniform1f(uTime, time)
      gl.uniform2f(uMark, mark.x, mark.y)
      gl.uniform2f(uMarkDir, mark.dirX, mark.dirY)
      gl.uniform1f(uMarkTide, mark.tide)
      gl.uniform1f(uMarkAlpha, mark.alpha)
      gl.uniform1f(uMarkSpin, mark.spin)
      gl.uniform4f(uPsr, pulsar.x, pulsar.y, pulsar.gate, pulsar.beam)
      gl.uniform2f(uPsrLit, pulsar.flash, pulsar.flux)
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
