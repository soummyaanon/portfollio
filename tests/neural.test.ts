import { describe, expect, it } from 'vitest'

import { createSignals } from '@/components/figures/neural/signals'
import { buildTopology, CORE, distance, segmentDistance, type Vec3 } from '@/components/figures/neural/topology'

const topology = buildTopology()

/** A deterministic random source, so the signal tests replay exactly. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

describe('neural network layout', () => {
  it('has 40 to 70 nodes in four kinds of ring', () => {
    expect(topology.nodes.length).toBeGreaterThanOrEqual(40)
    expect(topology.nodes.length).toBeLessThanOrEqual(70)
    expect(new Set(topology.nodes.map((node) => node.layer))).toEqual(new Set(['input', 'outer', 'inner', 'output']))
  })

  it('never lets two connections pass through each other', () => {
    const { edges, lanes } = topology
    let closest = Infinity
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const p = lanes[edges[i]!.lane]!
        const q = lanes[edges[j]!.lane]!
        if (p.a === q.a || p.a === q.b || p.b === q.a || p.b === q.b) continue
        closest = Math.min(closest, segmentDistance(edges[i]!.from, edges[i]!.to, edges[j]!.from, edges[j]!.to))
      }
    }
    expect(closest).toBeGreaterThan(0.2)
  })

  it('keeps every connection clear of the turning rings at every angle', () => {
    let closest = Infinity
    for (const ring of CORE.rings) {
      for (let precession = 0; precession < 2 * Math.PI; precession += Math.PI / 24) {
        const normal: Vec3 = [Math.cos(ring.tilt), Math.sin(ring.tilt) * Math.cos(precession), Math.sin(ring.tilt) * Math.sin(precession)]
        // Two unit vectors across the normal span the ring's plane.
        const u = normalise(cross(normal, [0, 1, 0.3]))
        const v = cross(normal, u)
        for (let k = 0; k < 64; k++) {
          const a = (k / 64) * 2 * Math.PI
          const p: Vec3 = [0, 1, 2].map((i) => ring.radius * (Math.cos(a) * u[i]! + Math.sin(a) * v[i]!)) as unknown as Vec3
          for (const edge of topology.edges) closest = Math.min(closest, segmentDistance(edge.from, edge.to, p, p))
        }
      }
    }
    expect(closest).toBeGreaterThan(0.35)
  })

  it('puts the ports outside the glass and its turning frame', () => {
    for (const port of topology.ports) expect(distance(topology.points[port]!.position, [0, 0, 0])).toBeGreaterThan(CORE.shell + 0.1)
  })
})

describe('neural signals', () => {
  it('carries ambient signals from inputs through the core to the outputs', () => {
    const signals = createSignals(topology, seeded(7))
    for (let i = 0; i < 60 * 20; i++) signals.step(1 / 60)
    const outputs = topology.nodes.filter((node) => node.layer === 'output')
    expect(outputs.some((node) => signals.state.nodeGlow[node.id]! > 0.05)).toBe(true)
    expect(signals.state.core).toBeGreaterThan(0.05)
    expect(signals.state.particles.length).toBeLessThan(80)
  })

  it('sends a wave out through every node and then rests', () => {
    const signals = createSignals(topology, seeded(3))
    signals.wave()
    const peak = new Float32Array(topology.nodes.length)
    for (let i = 0; i < 60 * 4; i++) {
      signals.step(1 / 60)
      signals.state.nodeWave.forEach((value, n) => (peak[n] = Math.max(peak[n]!, value)))
    }
    expect(Math.min(...peak)).toBeGreaterThan(0.9)
    expect(signals.state.front).toBe(-1)
  })
})

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const normalise = (a: Vec3): Vec3 => {
  const length = Math.hypot(...a)
  return [a[0] / length, a[1] / length, a[2] / length]
}
