'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'

import { AudioToggle } from './AudioToggle'
import { KEPLER, PLATE_RS, PLATE_SEAT_X, PLATE_SEAT_Y } from './plate-geometry'
import { EnduranceOrbit } from '@/components/figures/endurance/EnduranceOrbit'

/**
 * The one moving thing on the page.
 *
 * Gargantua, as the film shows it: a black hole and its accretion disk against a field of lensed
 * stars, four depths of them parallaxed against each other down to a dust-fine veil, and nothing
 * else in the sky. The Endurance orbits it on a canvas laid over this one (EnduranceOrbit). Click
 * the plate and a ranging circle opens from the point of contact, lifting the magnitude of every
 * star it crosses.
 *
 * The black hole is built from its physics rather than drawn: the sky behind it is sampled
 * through the point-mass lens equation, so the stars arc around it and a
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
 * reduced to a catalogued position among other catalogued positions. Greys at rest — the ink is
 * the page's own — with the disk's real colour eased in while the plate is hovered.
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
uniform vec3  uInk;      // resolved page ink, 0..1
uniform vec3  uPulse;    // xy = where the plate was last struck, z = seconds since
uniform float uOpacity;
uniform float uColour;   // 0 greys, 1 the objects' own colours; eased in while the plate is hovered
uniform float uShadow;   // 1 when the ink is darker than the paper, 0 when it is lighter
uniform vec4  uCam;      // the camera: xy = cos/sin of azimuth, z = sin(elevation), w = cos(elevation)
uniform float uField;    // ambient sky density — at 0 the whole field is skipped, not just faded
uniform float uKepler;   // Kepler's law on the page's one clock: ω(r) = uKepler / r^1.5
uniform float uRs;       // the Schwarzschild radius, plate units — everything else follows from it
uniform vec2  uSeat;     // where the hole sits, plate space

out vec4 fragColor;

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
 * Gravitational lensing — the actual point-mass lens equation, traced backwards.
 *
 * Nothing here draws a black hole. This bends the coordinate the sky is *sampled* at, so every
 * star and every galaxy behind the mass arcs around it on its own. Where the earlier
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
 * The accretion disk's light at an offset d from the hole, sampled through the lens: the
 * far side of the annulus folds up over the shadow and arrives as the arc riding the ring,
 * its inverted twin hugging the underside — nothing here draws either arc. The shadow
 * itself stays clean: a band across it was tried and retired, because at this size the
 * plate reads better with the dark disc unbroken.
 *
 * The disk is a thin annulus from the innermost stable orbit at 3 rs out to 9 rs, seen at
 * ~83° of inclination — the camera riding just above the disk plane, which is where the
 * film put it. Its light is Keplerian speed √(rs/2r), Doppler beaming, and gravitational
 * redshift. The beaming is muted, as the film's Gargantua has it: Thorne's full asymmetry left
 * half the disk missing, and Nolan had it evened out, so the approaching limb leads only a
 * little. A hot rim just outside the ISCO
 * carries the brightness the film put there, and the whole thing runs through a soft-knee
 * tonemap, 1 − e^(−x), so the inner band saturates into an even blaze instead of clipping
 * into a flat wedge — blown out the way film stock blows out, not the way a clamp does.
 *
 * The texture is silk, not smoke, as the film's disk is: two octaves of noise stretched long
 * along the flow and fine across it, at low contrast, carried on annular bands that each turn
 * at their own Keplerian rate, on the same clock as the Endurance's orbit — banded because a continuous shear winds any pattern below pixel scale
 * within minutes, and the finer octave shearing 35% faster than the lanes it rides is the
 * turbulence. The streaks live in the disk's midtones; the blaze at the rim is allowed to
 * swallow them exactly as an overexposed frame would.
 *
 * The last term is bloom without a blur pass: a taller, fainter ellipse of haze riding the
 * same annulus, carrying the same beaming — the scattered light a lens and the gas around
 * the flow both throw off a source this bright. Nearly off on paper, where haze reads as
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
  // Each band turns at Kepler's rate on the page's one clock, the clock the Endurance orbits
  // on: the inner lanes lap the hole in about fourteen seconds and the outer ones in about
  // seventy, the same r^(-3/2) law that carries the ship round in two minutes further out.
  float bandR = max((floor(rd * 32.0) + 0.5) / 32.0, diskIn);
  float whirl = uKepler / pow(bandR, 1.5);
  float coarse = noise(vec2(rd * 40.0, (phi - whirl * t) * 2.6));
  float fine = noise(vec2(rd * 110.0, (phi - whirl * t * 1.35) * 7.0) + 7.3);
  // Each octave fades out as its radial period closes on a pixel. At hero size the fine one
  // ran at two or three cycles per pixel near the rim and aliased into a sandy speckle that
  // read as noise on a photograph rather than gas; filtered, it is the turbulence it was meant
  // to be wherever it can be resolved and its mean everywhere else.
  float coarseW = smoothstep(0.9, 0.35, fwidth(rd * 40.0));
  float fineW = smoothstep(0.9, 0.35, fwidth(rd * 110.0));
  // Contrast held low, as on the film's disk: fine silky streaks that show the flow turning
  // without breaking the even blaze into lanes.
  float lanes = 0.6 + 0.28 * mix(0.5, coarse, coarseW) + 0.12 * mix(0.5, fine, fineW);
  float beta = sqrt(rs / (2.0 * rdc));
  // Beaming at the 1.2th power, the film's evened-out look rather than the full cube.
  float dopp = pow(1.0 / (1.0 - beta * sinI * (dplane.x / rdc)), 1.2);
  // The Doppler flip. Inside the fold the lens is showing the counter-image of the
  // opposite limb, so the raw beaming changes sides right at the ring — a dim sliver
  // hugging the shadow on the bright side, which is precisely what read as the wing
  // floating free of the hole. But the wrap is light from every part of the orbit at
  // once, so its beaming is blended flat, and the wings fade smoothly into an evenly
  // lit ring instead of docking against their own dimmed reflection.
  float foldMix = smoothstep(diskIn * 1.1, diskIn * 0.5, rd0);
  float doppEff = mix(min(dopp, 3.0), 1.15, foldMix);
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
    * (0.25 + 0.75 * min(dopp, 3.0) / 3.0)
    * mix(0.15, 0.03, shadow);
  return max(film * mix(0.92, 0.62, shadow), haze);
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
  // brightness: an extended thing like a nebula bends but never brightens, while an
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
  // uField = 0 the four star shells and the two wave integrals are not evaluated at all — and
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

  // The sky, as the film shows it behind Gargantua: the disk and the lensed stars, and nothing
  // else. The sweep lifts the magnitude of every star it crosses — it is not a ring travelling
  // over the chart, it is the chart being read. The point sources alone carry the lens
  // magnification, for the surface-brightness reason given above.
  float field = disk;

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
  // past untouched.
  //
  // It runs *against* the magnification, and the order they win in is the physics rather than a
  // compromise: out where the lens is strong but the redshift is not, magn wins and a star
  // crossing behind the mass flares up toward its Einstein ring; in the last stretch the redshift
  // overtakes it and the same star is extinguished. Flare, then out. Both are true at once, and
  // the sequence falls out of multiplying them.
  field = max(field, stars * magn * dil * (1.0 + sweep * 1.8 + anomaly * 0.35));
  field = max(field, sweep * 0.30);

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
  // The ring is beamed like the disk it is made of, and as gently: a touch brighter on the
  // approaching (+x) side, nearly even all the way round as the film's ring is.
  ring *= 0.88 + 0.24 * smoothstep(-1.0, 1.0, (p.x - holeAt.x) / max(holeD, 1e-4));
  // A breath of light outside the rings, where the lensed sky piles up. Nearly switched off
  // on paper: the identical mark that reads as light on a dark ground reads as a thumbprint
  // on a white one.
  ring += smoothstep(holeR * 1.10, holeR * 2.4, holeD) * smoothstep(holeR * 3.2, holeR * 1.3, holeD) * mix(0.05, 0.018, uShadow);

  float ink = max(field, ring);

  // Greys at rest, like the rest of the site. The objects that carry colour keep their tonal
  // structure in grey: the disk is still a blackbody read off its own brightness, with
  // temperature carried as lightness, so the cool outer annulus runs a mid grey and the hot
  // inner rim and the photon ring run up to white.
  //
  // Hovered, the plate shows the colour the disk really has, uColour easing from one set to the
  // other: its blackbody ramp from amber to white-gold.
  //
  // uShadow is 1 on *paper* (ink darker than the page), so the second argument of each mix is
  // the light theme's value: there the hot end is the deep one, as ink on white has to be.
  vec3 emberCool = mix(vec3(mix(0.62, 0.34, uShadow)), mix(vec3(0.96, 0.44, 0.07), vec3(0.66, 0.26, 0.02), uShadow), uColour);
  vec3 emberHot = mix(vec3(mix(1.00, 0.10, uShadow)), mix(vec3(1.00, 0.90, 0.72), vec3(0.92, 0.62, 0.14), uShadow), uColour);
  vec3 emberRGB = mix(emberCool, emberHot, smoothstep(0.16, 0.80, disk));

  // Weighted by each source's own contribution, and the shadow's cut applied to the disk,
  // which sits behind it, so the grey follows the ink rather than floating free of it: where the disk
  // is what you are looking at the pixel takes the disk's grey, where a catalogue star crosses
  // it the ink takes its share back, and inside the shadow there is no ink at all. Read before
  // the mask and the grain, which scale ink and hue alike and so cancel out of the ratio.
  float diskLit = disk * cut;
  float hueW = diskLit + ring;
  // The ring takes the hot end flat rather than the ramp: it is light that has orbited the
  // mass and come back out, so it is the disk's own material seen at its most beamed.
  vec3 hue = emberRGB * diskLit + emberHot * ring;
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

  // Grain multiplies rather than adds. Added, it survived the mask and laid a faint dither
  // across every pixel of the buffer — which is exactly the rectangle that was showing up
  // against the page. Multiplied, zero stays zero and the plate has no visible extent.
  // It also stays out of the highlights: grain is a shadow-and-midtone texture, and on the
  // blazing inner disk it read as sand on the gas.
  ink *= 1.0 + (hash(gl_FragCoord.xy) - 0.5) * 0.13 * (1.0 - smoothstep(0.15, 0.6, ink));

  // The plate in its page ink and greys, in straight alpha, because the context was asked
  // for straight alpha.
  float baseA = clamp(ink, 0.0, 1.0) * uOpacity;
  // The faint haze sits a few 8-bit steps above nothing, so the grain above is smaller than one
  // step there and the haze printed in flat terraces. A triangular dither of one step breaks
  // them up, and it fades in over the first three steps so empty sky stays exactly zero.
  float dither = hash(gl_FragCoord.xy) + hash(gl_FragCoord.yx + 19.19) - 1.0;
  baseA = clamp(baseA + dither / 255.0 * smoothstep(0.0, 3.0 / 255.0, baseA), 0.0, 1.0);
  fragColor = vec4(baseInk, baseA);
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
   * slide are gone on purpose. The plate answers the strike and, hovered, shows the colours
   * its objects really have; it never performs for the cursor.
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
    const uInk = gl.getUniformLocation(program, 'uInk')
    const uPulse = gl.getUniformLocation(program, 'uPulse')
    const uOpacity = gl.getUniformLocation(program, 'uOpacity')
    const uColour = gl.getUniformLocation(program, 'uColour')
    const uShadow = gl.getUniformLocation(program, 'uShadow')
    const uCam = gl.getUniformLocation(program, 'uCam')
    const uField = gl.getUniformLocation(program, 'uField')
    const uRs = gl.getUniformLocation(program, 'uRs')
    const uKepler = gl.getUniformLocation(program, 'uKepler')
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

    // Whether the pointer is over the plate, and how much of the objects' own colour shows:
    // it eases in over about half a second rather than snapping on with the cursor.
    let hoverTarget = 0
    let colour = 0

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

      gl.uniform2f(uSize, width, height)
      gl.uniform1f(uTime, time)
      gl.uniform1f(uField, 1)
      gl.uniform1f(uRs, PLATE_RS)
      gl.uniform1f(uKepler, KEPLER)
      gl.uniform2f(uSeat, PLATE_SEAT_X, PLATE_SEAT_Y)
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
      gl.uniform1f(uColour, colour)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    function loop(now: number) {
      elapsed = (now - start) / 1000
      colour += (hoverTarget - colour) * 0.06
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

    /** Whether the pointer is over the plate: hovered, the objects take their own colours. */
    function onPointerMove(event: PointerEvent) {
      if (!visible || reduceMotion.matches) return
      const at = toPlateSpace(event)
      if (!at) return
      hoverTarget = at.x >= 0 && at.x <= 1 && at.y >= 0 && at.y <= 1 ? 1 : 0
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
    <div
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
            collapses the subject's translateZ back onto the plate. */}
        <motion.canvas
          ref={canvasRef}
          aria-hidden
          className={`absolute inset-0 h-full w-full ${supported ? '' : 'hidden'}`}
          style={prefersReducedMotion ? undefined : { y: parallax, opacity: fade }}
        />

        {/* The Endurance in orbit about the hole, on its own canvas laid over this one and
            moved by the same parallax and fade. It takes no pointer, so the plate keeps its
            hover and its cursor. */}
        {supported && (
          <EnduranceOrbit y={prefersReducedMotion ? undefined : parallax} opacity={prefersReducedMotion ? undefined : fade} />
        )}

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
