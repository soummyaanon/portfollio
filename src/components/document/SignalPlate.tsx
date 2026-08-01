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

/**
 * The one moving thing on the page.
 *
 * A grey contour field — an interference plot, the kind of thing an instrument draws —
 * radiating from the portrait at the centre of the plate and bending around the pointer.
 * It is drawn on a raw WebGL2 canvas rather than through a scene graph: this is a single
 * full-quad fragment shader, so Three.js would have bought a camera, a renderer, and
 * ~170 kB of gzip for a mesh that never moves. The whole effect is the eighty lines of
 * GLSL below.
 *
 * It is decoration with an argument behind it: the page's thesis is that a person is a
 * document, and this one is a readout. The lines come out of the portrait because that is
 * where the record's subject is. No hue — the ink is the page's own mid-grey, which is
 * also why it survives a theme flip without a second palette.
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
uniform vec3  uInk;      // resolved mid-grey, 0..1
uniform float uOpacity;
uniform float uShadow;   // 1 when the ink is darker than the paper, 0 when it is lighter

out vec4 fragColor;

/**
 * One light, one direction, for the whole plate: down and to the right. The cast shadow
 * between the sheets and the contact shadow under the portrait both use it, which is the
 * only reason the two read as the same physical scene rather than two separate tricks.
 */
const vec2 SHADOW_OFFSET = vec2(0.030, -0.038);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

/**
 * Coverage of the nearest contour of a scalar field, antialiased. "soft" widens the band:
 * it is the only focus control a line drawing has, and it is what puts the distant sheets
 * out of focus. The final factor fades a family out entirely once its lines pack closer
 * than they can be resolved, which stops dense zones turning into a flat moiré wash.
 */
float contour(float f, float soft) {
  float w = fwidth(f) * soft;
  float d = abs(fract(f) - 0.5);
  return (1.0 - smoothstep(0.0, clamp(w, 0.0008, 0.42), d)) * smoothstep(0.45, 0.16, w);
}

/** Slow, non-repeating domain wobble — what turns concentric rings into engraving. */
vec2 wobble(vec2 q, float t) {
  return q + 0.062 * vec2(
    sin(q.y * 2.7 + t * 0.21) + 0.6 * sin(q.y * 5.1 - t * 0.13),
    sin(q.x * 2.3 - t * 0.17) + 0.6 * sin(q.x * 4.4 + t * 0.11)
  );
}

/**
 * One sheet of the stack: two elliptical families with perpendicular anisotropy, crossing
 * at a shallow angle so they read as woven engraving rather than as a target.
 */
float sheet(vec2 p, float t, float scale, float phase, float soft) {
  vec2 a = wobble(p * scale, t + phase);
  vec2 b = wobble(p * scale * 1.13, t * 0.78 + phase + 37.0);
  float f1 = length(a * vec2(0.54, 1.0)) * 6.0 - t * 0.17;
  float f2 = length(b * vec2(1.0, 0.62)) * 4.6 + t * 0.12;
  return max(contour(f1, soft), contour(f2, soft) * 0.34);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  // Origin at the portrait, isotropic: one unit is half the plate height on both axes.
  vec2 p = (uv - 0.5) * vec2(uSize.x / uSize.y, 1.0) * 2.0;

  // The pointer pinches the field toward itself, so the rings crowd under the cursor and
  // relax again behind it. Gaussian falloff, so there is no edge to the influence.
  vec2 toPointer = p - uPointer;
  p -= toPointer * uHover * 0.34 * exp(-dot(toPointer, toPointer) * 1.9);

  // Two surfaces and the shadow one throws on the other. Four cues carry the depth, none
  // of them a gradient or a blur filter:
  //
  //  · cast shadow — the near sheet, resampled displaced along a fixed light vector and
  //    thrown out of focus. That is all a shadow is, and it is the only cue here that
  //    survives a screenshot: parallax needs you to move, this does not.
  //  · occlusion — painted back to front with an over-composite, so a near line covers the
  //    far one instead of adding to it. Two crossing lines at equal tone read as one flat
  //    lattice; one clearly on top of the other reads as two surfaces.
  //  · focus and tone — the far sheet is fainter and its contour band is four times wider,
  //    so it sits behind by being softer and paler. Atmospheric perspective.
  //  · parallax — the sheets slide by different fractions of the pointer, so they move
  //    against each other under the cursor.
  vec2 slide = uPointer * uHover * 0.18;

  // A cast shadow only works when ink is darker than paper. Inverted — light lines on a
  // dark ground — the same layer paints a bright smudge, which reads as a glow, the exact
  // opposite cue. So the shadow terms are gated on polarity, and the dark theme buys its
  // depth by widening the tonal gap instead: the far sheet drops further back rather than
  // the near one casting forward.
  float far = sheet(p + slide * 0.16, uTime, 0.74, 0.0, 4.2) * mix(0.12, 0.20, uShadow);
  float castShadow = sheet(p + slide - SHADOW_OFFSET, uTime, 1.26, 23.0, 3.4) * 0.30 * uShadow;
  float near = sheet(p + slide, uTime, 1.26, 23.0, 1.0);

  float ink = far;
  ink = castShadow + ink * (1.0 - castShadow);
  ink = near + ink * (1.0 - near);

  // Clear halo, so the portrait sits on unruled paper rather than in a thicket of lines.
  ink *= smoothstep(mix(0.44, 0.38, uShadow), 0.76, length(p));

  // Contact shadow. The portrait is an object resting on the stack, so it occludes a soft
  // ellipse just beneath itself — offset the same way the light throws everything else.
  // The only mark on the plate that is tone rather than line, and the cue that makes the
  // portrait sit *above* the field instead of being a hole punched in it.
  float contact = smoothstep(0.70, 0.16, length((p - vec2(0.02, -0.09)) * vec2(1.0, 1.35)));
  ink = max(ink, contact * 0.14 * uShadow);

  // One mask, applied last, covering lines and tone alike — so nothing reaches the edge of
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
 * Resolve a CSS colour of any syntax — the palette is authored in oklch — to RGB, by
 * letting a 1×1 2D canvas do the parsing the browser already knows how to do.
 */
function readColour(probe: HTMLElement): [number, number, number] {
  const fallback: [number, number, number] = [0.52, 0.52, 0.54]
  const colour = getComputedStyle(probe).color
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return fallback

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
   */
  const tiltTargetX = useMotionValue(0)
  const tiltTargetY = useMotionValue(0)
  const springConfig = { stiffness: 140, damping: 18, mass: 0.35 }
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

    function resize() {
      if (!gl) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const next = Math.max(1, Math.round(canvas!.clientWidth * dpr))
      const nextHeight = Math.max(1, Math.round(canvas!.clientHeight * dpr))
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
      // Both probes are read every frame rather than cached, which is what lets a theme
      // flip take effect without any wiring between the toggle and this canvas.
      const ink = readColour(probe!)
      const paper = readColour(paperProbe!)
      const inkIsDarker = luminance(ink) < luminance(paper)

      gl.uniform3fv(uInk, ink)
      gl.uniform1f(uShadow, inkIsDarker ? 1 : 0)
      // Held under full strength, and lifted on a dark ground: the same mid-grey that is
      // plainly visible on near-white sits much closer to near-black, so the light theme
      // needs holding back and the dark theme needs help.
      gl.uniform1f(uOpacity, inkIsDarker ? 0.72 : 0.82)
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

    function onPointerMove(event: PointerEvent) {
      if (!visible || reduceMotion.matches) return
      const rect = canvas!.getBoundingClientRect()
      if (rect.height === 0) return
      const x = (event.clientX - rect.left) / rect.width
      const y = 1 - (event.clientY - rect.top) / rect.height
      pointer.targetX = (x - 0.5) * (rect.width / rect.height) * 2
      pointer.targetY = (y - 0.5) * 2
      // Influence is gated on being roughly over the plate, so scrolling far below it does
      // not leave a phantom dent in the engraving.
      const near = x > -0.35 && x < 1.35 && y > -1.1 && y < 2.1
      pointer.targetHover = near ? 1 : 0

      // Tilt is clamped rather than scaled, so the plate reaches its limit while the cursor
      // is still over it and does not keep rolling as you travel across the page.
      const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value))
      tiltTargetX.set(near ? clamp((y - 0.5) * 2 * 5.5, 5.5) : 0)
      tiltTargetY.set(near ? clamp((x - 0.5) * 2 * 7, 7) : 0)
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

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerleave', onPointerLeave)
    reduceMotion.addEventListener('change', onMotionPreferenceChange)

    resize()
    draw(0)
    if (!reduceMotion.matches) play()

    return () => {
      pause()
      observer.disconnect()
      resizeObserver.disconnect()
      themeObserver.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
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
    <div className="relative isolate mx-auto grid h-[clamp(11rem,19vw,15rem)] w-full max-w-[var(--measure-column)] place-items-center [perspective:1100px]">
      {/* Colour probe. The shader reads the mid-grey off this element's resolved `color`,
          which costs nothing and keeps the palette in one place instead of duplicated in
          GLSL — including across a light/dark flip, where this simply resolves differently. */}
      <span
        ref={probeRef}
        aria-hidden
        className="pointer-events-none absolute text-muted-foreground opacity-0"
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

        {/* Where WebGL2 is unavailable the plate still has a ruled ground, just a static one. */}
        {!supported && (
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(closest-side,transparent_22%,black_46%,transparent_92%)]"
            style={{
              backgroundImage:
                'repeating-radial-gradient(circle at 50% 50%, transparent 0 7px, var(--border) 7px 8px)',
            }}
          />
        )}

        {/* Pushed toward the viewer, so the tilt moves it across the field by more than it
            moves the field itself. That difference is the parallax — actual geometry, not
            two layers being animated at different rates and hoping it reads. */}
        <div className="relative [transform:translateZ(52px)]">{children}</div>
      </motion.div>
    </div>
  )
}
