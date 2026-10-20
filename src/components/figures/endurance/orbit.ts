/**
 * The Endurance's orbit about the black hole, integrated rather than drawn: a test mass in the
 * Schwarzschild geometry, in the orbit's own plane.
 *
 *   r̈ = −GM/r² + L²/r³ − 3GM·L²/r⁴,    φ̇ = L/r²
 *
 * The first two terms are Newton's: they make the orbit an ellipse, swept faster near the hole
 * and slower far out, equal areas in equal times. The third is general relativity's, and what
 * it does is turn the ellipse a little further round on every pass, the periapsis precession
 * that showed up in Mercury's orbit. Here the hole is close and heavy enough that the turn is
 * tens of degrees an orbit, so over a few passes the path traces a rosette.
 *
 * Units are the plate's (lengths in plate units, c = 1, so GM = rs/2). Time is scaled once, so
 * a Newtonian orbit of the same size takes `period` seconds on screen; every ratio — the speed
 * at each point, the shape, the precession — is the physics' own.
 */

export interface OrbitSpec {
  /** Schwarzschild radius, plate units. */
  readonly rs: number
  /** Periapsis and apoapsis as a semi-major axis and an eccentricity: rₚ = a(1 − e), rₐ = a(1 + e). */
  readonly a: number
  readonly e: number
  /** On-screen seconds per orbit, for the Newtonian orbit of the same size. */
  readonly period: number
}

export interface OrbitState {
  r: number
  vr: number
  phi: number
}

export interface Orbit {
  readonly state: Readonly<OrbitState>
  /** Advances by `seconds` of screen time. */
  step(seconds: number): void
}

export function createOrbit(spec: OrbitSpec): Orbit {
  const gm = spec.rs / 2
  const { rs } = spec
  // The angular momentum that turns the orbit at exactly these two radii, taken from the
  // Schwarzschild effective potential V(r) = (1 − rs/r)(1 + L²/r²) being equal at both.
  // Newton's L is too small this close in: the relativistic term pulls harder, and an orbit
  // started with it is held far inside the apoapsis it was meant to reach.
  const periapsis = spec.a * (1 - spec.e)
  const apoapsis = spec.a * (1 + spec.e)
  const L = Math.sqrt(
    (rs * (1 / periapsis - 1 / apoapsis)) /
      ((1 - rs / periapsis) / (periapsis * periapsis) - (1 - rs / apoapsis) / (apoapsis * apoapsis)),
  )
  const state: OrbitState = { r: periapsis, vr: 0, phi: 0 }
  // Plate time per screen second: a Newtonian orbit of this size lasts 2π√(a³/GM).
  const scale = (2 * Math.PI * Math.sqrt(spec.a ** 3 / gm)) / spec.period

  const accel = (r: number) => -gm / (r * r) + (L * L) / (r * r * r) - (3 * gm * L * L) / (r * r * r * r)

  return {
    state,
    step(seconds) {
      // Velocity Verlet in r, with φ advanced at the midpoint radius. Small fixed steps keep
      // the orbit closed to well under a pixel over many passes.
      let remaining = seconds * scale
      const h = (2 * Math.PI * Math.sqrt(spec.a ** 3 / gm)) / 2400
      while (remaining > 0) {
        const dt = Math.min(h, remaining)
        remaining -= dt
        const r0 = state.r
        const a0 = accel(r0)
        const r1 = r0 + state.vr * dt + 0.5 * a0 * dt * dt
        state.vr += 0.5 * (a0 + accel(r1)) * dt
        const mid = 0.5 * (r0 + r1)
        state.phi += (L / (mid * mid)) * dt
        state.r = r1
      }
    },
  }
}
