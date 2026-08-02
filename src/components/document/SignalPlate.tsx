'use client'

import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'

import { AudioToggle } from './AudioToggle'

/**
 * The one moving thing on the page.
 *
 * A star chart with two masses crossing it. A faint graticule, three magnitude classes of
 * stars parallaxed against each other, an asterism, a dust lane, and a broken circle ringing
 * the portrait the way an atlas rings the object its plate is about. Click it and a ranging
 * circle opens from the point of contact, lifting the magnitude of every star it crosses.
 *
 * The black hole is built from its physics rather than drawn: the sky behind it is sampled
 * through the point-mass lens equation, so stars and graticule lines arc around it and a
 * second inverted image appears inside the Einstein radius without being asked for. The dark
 * disc is the photon capture radius at 2.598 rs, not the horizon, which is why it is larger
 * than the horizon would be. Time bends too — the Schwarzschild factor slows the scintillation
 * of stars seen near the mass, and the Shapiro delay leaves the sky beside it running a fixed
 * interval behind the sky around it. The wormhole beside it inverts its interior radially,
 * which is the standard mapping for the far side of a throat.
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
 * portrait — hand-placed rather than generated, because a random graph of lines looks like
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
 * A wormhole throat, as the same kind of transform.
 *
 * Inside the rim the radial coordinate is inverted — r becomes R²/r — which is the standard
 * mapping for "the other side": the centre of the disc samples the far sky, and the further
 * in you look the further out you are seeing. The interior is also spun, slowly and in the
 * opposite sense to the drift, so the patch inside the rim is visibly not the patch around
 * it. Clamped, because an unclamped inversion samples coordinates large enough to break the
 * hash and fill the throat with aliasing.
 */
vec2 throat(vec2 s, vec2 c, float radius, float spin) {
  vec2 d = s - c;
  float r = length(d);
  if (r >= radius) return s;
  float inv = min(radius * radius / max(r, 0.004), 9.0);
  float a = spin;
  mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
  return c + rot * (d / max(r, 1e-4)) * inv;
}

/**
 * An incursion: a region where another sky is pressing through this one.
 *
 * Two gaussians on long, mutually prime drift periods, each breathing right down through zero
 * so the anomaly arrives, holds and is gone. It shears the coordinate rather than tinting the
 * picture — the graticule buckles and the stars behind it swim, which is a far stranger effect
 * than anything a colour could have done, and it costs the plate no second ink.
 */
float incursion(vec2 p, float t) {
  vec2 c1 = vec2(sin(t * 0.061) * 1.30, cos(t * 0.043) * 0.50);
  vec2 c2 = vec2(cos(t * 0.037) * 1.05, sin(t * 0.029) * 0.58);
  float g1 = exp(-dot(p - c1, p - c1) * 4.60) * smoothstep(0.30, 0.95, sin(t * 0.047) * 0.5 + 0.5);
  float g2 = exp(-dot(p - c2, p - c2) * 6.20) * smoothstep(0.38, 0.98, cos(t * 0.031) * 0.5 + 0.5);
  return clamp(g1 + g2 * 0.7, 0.0, 1.0);
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
  // Origin at the portrait, isotropic: one unit is half the plate height on both axes.
  vec2 p = (uv - 0.5) * vec2(uSize.x / uSize.y, 1.0) * 2.0;

  // One device pixel, in plate units — used only as a floor on how thin a line may get. Sizes
  // here are otherwise in plate units, so the drawing is the same size on the page at 1× and
  // at 2×. Sized off px instead, everything halved on a retina screen: hairlines came out at
  // a third of a CSS pixel and the whole plate rendered as a faint dusting of specks.
  float px = 2.0 / uSize.y;
  float hair = max(0.0060, px);

  // The pointer slides the sky rather than deforming it. The plate this replaced pinched
  // space toward the cursor, which on a chart is an error: a chart's promise is that the
  // positions on it are true, and the only thing allowed to bend them here is mass.
  vec2 slide = uPointer * uHover * 0.09;

  // The two masses travel. They do not orbit a point and they do not merely wander — they pan
  // across the plate with the sky they are embedded in and wrap, so in the ten seconds anyone
  // actually spends looking at this, the hole has visibly moved. The span is one plate width
  // plus a margin, so the wrap always happens off the edge and neither object is ever gone.
  float span = (uSize.x / uSize.y) * 2.0 + 1.4;
  float holeX = mod(uTime * 0.075 + span * 0.5, span) - span * 0.5;
  float boreX = mod(uTime * 0.075 + span * 0.94, span) - span * 0.5;
  vec2 holeAt = vec2(holeX, 0.30 + 0.11 * sin(uTime * 0.13));
  vec2 boreAt = vec2(boreX, -0.30 + 0.09 * cos(uTime * 0.11));

  // One free parameter, the Schwarzschild radius; everything else about the hole follows from
  // it the way it does in the real object. The dark disc is not the horizon — it is the photon
  // capture cross-section at √27/2 · rs ≈ 2.598 rs, which is what an observer actually sees and
  // is why a black hole always looks larger than its own horizon. The Einstein radius is the
  // one genuinely free choice here, since it depends on distances this scene does not have.
  float rs = 0.058;
  float holeR = 2.598 * rs;
  float einstein = 0.29;
  float boreR = 0.26;

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
  float anomaly = incursion(p, uTime);
  vec2 sky = p + slide;
  sky = lens(sky, holeAt, einstein);
  sky = throat(sky, boreAt, boreR, uTime * 0.09);
  // The incursion shears rather than displaces: the buckle has no single direction, so the
  // grid inside it folds instead of sliding sideways as one piece.
  sky += anomaly * 0.085 * vec2(sin(sky.y * 5.3 + uTime * 0.31), cos(sky.x * 4.1 - uTime * 0.27));

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
  float stars = max(near, max(mid, deep));

  // The asterism rides the middle layer, wrapping on the same span as the masses, so it leaves
  // at one edge and returns at the other where the mask has already faded it to nothing.
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

  // The sky, in the order a plate is printed: paper, dust, the lines drawn on it, the objects.
  // The sweep lifts the magnitude of every star it crosses, which is the whole point of it —
  // it is not a ring travelling over the chart, it is the chart being read.
  float field = max(graticule, max(dust, asterism));
  field = max(field, max(stars, nodes) * (1.0 + sweep * 1.8 + anomaly * 0.35));
  field = max(field, sweep * 0.30);

  // Inside the capture radius there is nothing to draw — not dark ink, *no* ink, so the disc
  // is the colour of whatever the plate is sitting on. On paper that is a hole punched in the
  // chart; on a dark ground it is the thing itself. One rule, and the theme decides what it
  // means. The edge is nearly hard, because the photon sphere is: a ray one hair inside it
  // does not come back.
  float holeD = holeDist;
  field *= smoothstep(holeR * 0.90, holeR * 1.02, holeD);

  // The photon ring, sitting on the capture radius itself. The brightest mark on the plate and
  // the only one allowed to be: it is where light has gone all the way around the mass, more
  // than once, and come back out to the eye.
  float ring = smoothstep(hair * 1.5 + px, hair * 1.5 - px, abs(holeD - holeR * 1.03)) * 0.52;
  // A breath of light outside the ring, where the lensed sky piles up. Nearly switched off
  // on paper: the identical mark that reads as light on a dark ground reads as a thumbprint
  // on a white one.
  ring += smoothstep(holeR * 1.10, holeR * 2.4, holeD) * smoothstep(holeR * 3.2, holeR * 1.3, holeD) * mix(0.05, 0.018, uShadow);

  // The throat's rim: two hairlines, the outer one fainter, so the mouth reads as an aperture
  // with a thickness rather than as a circle drawn on the sky.
  float boreD = length(p - boreAt);
  float rim = smoothstep(hair * 1.3 + px, hair * 1.3 - px, abs(boreD - boreR)) * 0.28;
  rim = max(rim, smoothstep(hair + px, hair - px, abs(boreD - boreR * 1.16)) * 0.12);

  float ink = max(field, max(ring, rim));

  // Clear halo, so the portrait sits on unruled paper rather than in a thicket of stars.
  ink *= smoothstep(mix(0.46, 0.40, uShadow), 0.78, length(p));

  // The subject marker: a broken circle around the portrait, the way an atlas rings the one
  // object on the plate that the plate is actually about. Drawn after the halo, because it
  // belongs to the clear space rather than to the field the halo is clearing.
  float dash = step(0.42, fract(atan(p.y, p.x) * 1.9 + uTime * 0.012));
  float reticle = smoothstep(hair + px, hair - px, abs(length(p) - 0.54)) * dash * 0.13;
  ink = max(ink, reticle);

  // One mask, applied last, covering lines and objects alike — so nothing reaches the edge of
  // the drawing buffer and the plate has no boundary of its own.
  float mask = smoothstep(2.0, 0.35, length(p * vec2(0.62, 1.0)));
  mask *= smoothstep(0.0, 0.30, uv.x) * smoothstep(1.0, 0.70, uv.x);
  mask *= smoothstep(0.0, 0.30, uv.y) * smoothstep(1.0, 0.70, uv.y);
  ink *= mask;

  // Grain multiplies rather than adds. Added, it survived the mask and laid a faint dither
  // across every pixel of the buffer — which is exactly the rectangle that was showing up
  // against the page. Multiplied, zero stays zero and the plate has no visible extent.
  ink *= 1.0 + (hash(gl_FragCoord.xy) - 0.5) * 0.13;

  fragColor = vec4(uInk, clamp(ink, 0.0, 1.0) * uOpacity);
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
   * Scroll parallax, applied to the field but not the portrait: the sheets fall behind the
   * page and dissolve while the portrait travels with it. Same depth argument as the
   * pointer parallax inside the shader, at a scale you feel rather than see. Driven by a
   * motion value, so scrolling never re-renders React.
   */
  const prefersReducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const parallax = useTransform(scrollY, [0, 420], [0, 64])
  const fade = useTransform(scrollY, [0, 380], [1, 0])

  /**
   * Pointer tilt. The whole plate rotates a few degrees toward the cursor on a real
   * perspective, with the portrait pushed forward on the Z axis — so the separation between
   * the portrait and the field is geometric rather than simulated, and the thing reads as a
   * physical surface you are leaning rather than a picture of one.
   *
   * Spring-damped rather than linearly eased: a spring overshoots very slightly and settles,
   * which is what makes a tilt feel like it has mass instead of like a slider being dragged.
   *
   * Softer than it was, on both counts. The travel is down to a little over half (see the
   * clamps in the pointer handler) and the spring is heavier and more damped, so the plate
   * leans rather than snaps. A surface with mass does not keep up with a cursor.
   */
  const tiltTargetX = useMotionValue(0)
  const tiltTargetY = useMotionValue(0)
  const springConfig = { stiffness: 96, damping: 24, mass: 0.55 }
  const rotateX = useSpring(tiltTargetX, springConfig)
  const rotateY = useSpring(tiltTargetY, springConfig)

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

    // Targets are set by input; the rendered values chase them, so a fast pointer drags the
    // field rather than teleporting it.
    const pointer = { x: 0, y: -3, targetX: 0, targetY: -3, hover: 0, targetHover: 0 }

    // Where the plate was last struck, and when. `at` starts far enough in the past that the
    // strike term is already dead on the first frame — an unclicked plate has never been
    // clicked, rather than having been clicked at the origin at time zero.
    const pulse = { x: 0, y: 0, at: -1000 }

    // The canvas's geometry, cached. Everything that needs the plate's position or size reads
    // it from here rather than from the element, because both `clientWidth` and
    // `getBoundingClientRect()` force the browser to flush pending layout — and the two places
    // that wanted them are the hottest paths in the component: one runs every animation frame,
    // the other on every pointermove across the whole window. The ResizeObserver and a scroll
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
      // Chase the pointer fast enough to feel connected to it. At 0.06 the hover ramp took
      // most of a second to reach full strength, which reads as no response at all.
      pointer.x += (pointer.targetX - pointer.x) * 0.15
      pointer.y += (pointer.targetY - pointer.y) * 0.15
      pointer.hover += (pointer.targetHover - pointer.hover) * 0.11
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

    /** Viewport pixels to plate space — the shader's coordinates, y up, origin at the portrait. */
    function toPlateSpace(event: PointerEvent) {
      if (box.height === 0) return null
      const x = (event.clientX - box.left) / box.width
      const y = 1 - (event.clientY - box.top) / box.height
      return { x, y, px: (x - 0.5) * (box.width / box.height) * 2, py: (y - 0.5) * 2 }
    }

    function onPointerMove(event: PointerEvent) {
      if (!visible || reduceMotion.matches) return
      const at = toPlateSpace(event)
      if (!at) return
      pointer.targetX = at.px
      pointer.targetY = at.py
      // Influence is gated on being roughly over the plate, so scrolling far below it does
      // not leave a phantom dent in the engraving.
      const near = at.x > -0.35 && at.x < 1.35 && at.y > -1.1 && at.y < 2.1
      pointer.targetHover = near ? 1 : 0

      // Tilt is clamped rather than scaled, so the plate reaches its limit while the cursor
      // is still over it and does not keep rolling as you travel across the page. Both limits
      // are down by about half: at 5.5° and 7° the plate was swinging far enough that the
      // portrait's translateZ read as the thing being animated.
      const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value))
      tiltTargetX.set(near ? clamp((at.y - 0.5) * 2 * 3.0, 3.0) : 0)
      tiltTargetY.set(near ? clamp((at.x - 0.5) * 2 * 3.8, 3.8) : 0)
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

    function onPointerLeave() {
      pointer.targetHover = 0
      tiltTargetX.set(0)
      tiltTargetY.set(0)
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
        pointer.hover = 0
        draw(0)
      } else if (visible) {
        play()
      }
    }

    // Scrolling changes where the plate is without changing its size, which no ResizeObserver
    // reports. One passive read per scroll event is still enormously cheaper than one per
    // pointermove, and it is the only other thing that can invalidate the cached box.
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    canvas.addEventListener('pointerdown', onPointerDown, { passive: true })
    document.addEventListener('pointerleave', onPointerLeave)
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
      document.removeEventListener('pointerleave', onPointerLeave)
      reduceMotion.removeEventListener('change', onMotionPreferenceChange)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      gl.deleteBuffer(buffer)
    }
  }, [tiltTargetX, tiltTargetY])

  return (
    // The perspective lives on the outer box and the 3D children on the tilting one, which
    // is the only arrangement where translateZ on the portrait actually reads as depth
    // rather than as a scale.
    <div className="relative isolate mx-auto grid h-[clamp(15rem,27vw,21rem)] w-full max-w-[var(--measure-column)] place-items-center [perspective:1100px]">
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

      <motion.div
        className="absolute inset-0 grid place-items-center [transform-style:preserve-3d]"
        style={prefersReducedMotion ? undefined : { rotateX, rotateY }}
      >
        {/* Scroll parallax rides on the canvas itself rather than a wrapper: an `opacity`
            on an ancestor creates a stacking context, which flattens the 3D subtree and
            collapses the portrait's translateZ back onto the plate. */}
        <motion.canvas
          ref={canvasRef}
          aria-hidden
          className={`absolute inset-0 h-full w-full ${supported ? '' : 'hidden'}`}
          style={prefersReducedMotion ? undefined : { y: parallax, opacity: fade }}
        />

        {/* Where WebGL2 is unavailable the portrait still sits on a field of points — a
            printed plate rather than a photographed sky, which is the honest downgrade. */}
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

        {/* Pushed toward the viewer, so the tilt moves it across the field by more than it
            moves the field itself. That difference is the parallax — actual geometry, not
            two layers being animated at different rates and hoping it reads. */}
        <div className="relative [transform:translateZ(52px)]">{children}</div>
      </motion.div>

      {/* Outside the tilting box on purpose: a control that leans away when you reach for it
          is a worse control, and this one must also not inherit the canvas's scroll fade. */}
      <AudioToggle />
    </div>
  )
}
