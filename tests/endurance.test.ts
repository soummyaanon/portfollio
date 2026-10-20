import { describe, expect, it } from 'vitest'

import { createOrbit } from '@/components/figures/endurance/orbit'

const spec = { rs: 0.075, a: 0.95, e: 0.22, period: 120 }

/** Runs the orbit for `seconds` of screen time, recording radius, angle and speed. */
function trace(seconds: number, step = 1 / 60) {
  const orbit = createOrbit(spec)
  const samples: { r: number; phi: number }[] = []
  for (let t = 0; t < seconds; t += step) {
    orbit.step(step)
    samples.push({ r: orbit.state.r, phi: orbit.state.phi })
  }
  return samples
}

describe('the Endurance orbit', () => {
  it('stays between the ellipse\'s periapsis and apoapsis', () => {
    const samples = trace(360)
    const rs = samples.map((s) => s.r)
    expect(Math.min(...rs)).toBeGreaterThan(spec.a * (1 - spec.e) * 0.98)
    expect(Math.max(...rs)).toBeLessThan(spec.a * (1 + spec.e) * 1.05)
  })

  it('moves faster near the hole, as Kepler\'s second law says', () => {
    const samples = trace(150)
    const rate = samples.slice(1).map((s, i) => ({ r: s.r, w: s.phi - samples[i]!.phi }))
    const near = rate.reduce((a, b) => (b.r < a.r ? b : a))
    const far = rate.reduce((a, b) => (b.r > a.r ? b : a))
    // Angular rate goes as 1/r², so the ratio is the square of the radius ratio.
    expect(near.w / far.w).toBeCloseTo((far.r / near.r) ** 2, 1)
    expect(near.w / far.w).toBeGreaterThan(2)
  })

  it('precesses by general relativity\'s amount, 6πGM/(c²p) per orbit', () => {
    const samples = trace(400)
    // Periapsis passages: local minima of r after the start.
    const peri = samples.filter((s, i) => i > 0 && i < samples.length - 1 && s.r < samples[i - 1]!.r && s.r <= samples[i + 1]!.r)
    expect(peri.length).toBeGreaterThanOrEqual(2)
    const advance = peri[1]!.phi - peri[0]!.phi - 2 * Math.PI
    const p = spec.a * (1 - spec.e * spec.e)
    const predicted = (6 * Math.PI * (spec.rs / 2)) / p
    expect(advance).toBeGreaterThan(predicted * 0.8)
    expect(advance).toBeLessThan(predicted * 1.35)
  })
})

describe('one clock for the disk and the ship', () => {
  it('turns the disk at Kepler\'s rate on the ship\'s clock', async () => {
    const { KEPLER, PLATE_RS, ENDURANCE_ORBIT } = await import('@/components/document/plate-geometry')
    const lap = (r: number) => (2 * Math.PI) / (KEPLER / r ** 1.5)
    // The ship's own semi-major axis comes round in the orbit's period, by construction.
    expect(lap(ENDURANCE_ORBIT.a)).toBeCloseTo(ENDURANCE_ORBIT.period, 6)
    // The disk runs from the innermost stable orbit at 3 rs to 9 rs.
    expect(lap(3 * PLATE_RS)).toBeGreaterThan(12)
    expect(lap(3 * PLATE_RS)).toBeLessThan(16)
    expect(lap(9 * PLATE_RS)).toBeGreaterThan(65)
    expect(lap(9 * PLATE_RS)).toBeLessThan(80)
  })
})
