/**
 * The network's shape, as plain numbers: no Three.js here, so the layout can be tested and the
 * signal model can run without a renderer.
 *
 * The flow runs along +x. Each layer is a ring of nodes standing in a plane across that axis,
 * like the stages of an accelerator: 24 inputs on the widest ring at the far left, two
 * processing stages (an outer ring and a smaller inner ring of larger nodes) on each side of the
 * core, and 6 outputs on a narrow ring at the far right. Every connection stays inside its own
 * angular sector, so no two connections cross in space. The two inner rings reach the core
 * through 6 ports each; inside the glass, a signal runs port → centre → port.
 */

export type Vec3 = readonly [number, number, number]

export type Layer = 'input' | 'outer' | 'inner' | 'output'

export interface NetNode {
  readonly id: number
  readonly layer: Layer
  /** Encoder side (-1), decoder side (+1). Inputs are -1 and outputs +1. */
  readonly side: -1 | 1
  /** Position along the flow, 0 (input) … 8 (output). The core's centre is 4. */
  readonly rank: number
  readonly position: Vec3
  /** Size of the drawn node, in world units. */
  readonly radius: number
  /** Resting grey of the node, 0 black … 1 white: more important layers are lighter. */
  readonly tone: number
}

/** A point a signal can travel to: every node, plus the 12 core ports and the core's centre. */
export interface Point {
  readonly position: Vec3
  readonly rank: number
  /** Index into `nodes`, or -1 for a port or the centre. */
  readonly node: number
}

export interface Lane {
  readonly id: number
  readonly a: number
  readonly b: number
  /** Index into `edges` when this lane is drawn as a tube, or -1 inside the core. */
  readonly edge: number
  /** True when both ends sit in the same ring. */
  readonly lateral: boolean
  readonly length: number
}

export interface Edge {
  readonly id: number
  readonly lane: number
  readonly from: Vec3
  readonly to: Vec3
  readonly radius: number
  readonly length: number
}

export interface Topology {
  readonly nodes: readonly NetNode[]
  readonly points: readonly Point[]
  readonly lanes: readonly Lane[]
  readonly edges: readonly Edge[]
  /** Index of the core's centre in `points`. */
  readonly centre: number
  /** Indices in `points` of the 12 ports, encoder side first. */
  readonly ports: readonly number[]
  /** Lanes leaving each point, by point index. */
  readonly lanesAt: readonly (readonly number[])[]
}

/** The core's nested parts, from the inside out. Ports sit just outside the glass. */
export const CORE = {
  sphere: 0.26,
  octahedron: 0.55,
  /** Inside the glass's inscribed sphere (0.795 of 1.0), so the two never touch as they turn. */
  dodecahedron: 0.74,
  shell: 1.0,
  /** Distance of each port from the centre, and its angle off the flow axis. */
  port: { distance: 1.16, offAxis: (43 * Math.PI) / 180 },
  rings: [
    { radius: 1.68, tilt: 0.36 },
    { radius: 1.92, tilt: 0.42 },
    { radius: 2.16, tilt: 0.3 },
  ],
} as const

/** Each layer's ring radius and its distance from the core along the flow axis. */
export const RING = { input: 3.1, outer: 2.35, inner: 1.1, output: 1.75 } as const
export const X = { input: 7.2, outer: 4.0, inner: 2.9, output: 7.0 } as const
const deg = Math.PI / 180

const around = (x: number, radius: number, angle: number): Vec3 => [x, radius * Math.sin(angle), radius * Math.cos(angle)]

export const distance = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

export function buildTopology(): Topology {
  const nodes: NetNode[] = []
  const add = (layer: Layer, side: -1 | 1, rank: number, position: Vec3, radius: number, tone: number) => {
    nodes.push({ id: nodes.length, layer, side, rank, position, radius, tone })
    return nodes.length - 1
  }

  const inputs = Array.from({ length: 24 }, (_, k) => add('input', -1, 0, around(-X.input, RING.input, (7.5 + 15 * k) * deg), 0.1, 0.2))
  const stage = (side: -1 | 1) => {
    const outer = Array.from({ length: 12 }, (_, j) =>
      add('outer', side, side < 0 ? 1 : 7, around(side * X.outer, RING.outer, (15 + 30 * j) * deg), 0.16, 0.3),
    )
    const inner = Array.from({ length: 6 }, (_, m) =>
      add('inner', side, side < 0 ? 2 : 6, around(side * X.inner, RING.inner, (30 + 60 * m) * deg), 0.25, 0.38),
    )
    return { outer, inner }
  }
  const encoder = stage(-1)
  const decoder = stage(1)
  const outputs = Array.from({ length: 6 }, (_, m) => add('output', 1, 8, around(X.output, RING.output, (30 + 60 * m) * deg), 0.19, 0.55))

  const points: Point[] = nodes.map((node) => ({ position: node.position, rank: node.rank, node: node.id }))
  const portAt = (side: -1 | 1, m: number): Vec3 => {
    const { distance: d, offAxis } = CORE.port
    return around(side * d * Math.cos(offAxis), d * Math.sin(offAxis), (30 + 60 * m) * deg)
  }
  const ports = [-1, 1].flatMap((side) =>
    Array.from({ length: 6 }, (_, m) => points.push({ position: portAt(side as -1 | 1, m), rank: side < 0 ? 3 : 5, node: -1 }) - 1),
  )
  const centre = points.push({ position: [0, 0, 0], rank: 4, node: -1 }) - 1

  const lanes: Lane[] = []
  const edges: Edge[] = []
  const connect = (a: number, b: number, drawn = true) => {
    const from = points[a]!.position
    const to = points[b]!.position
    const length = distance(from, to)
    const lane = lanes.length
    let edge = -1
    if (drawn) {
      edge = edges.length
      edges.push({ id: edge, lane, from, to, length, radius: points[a]!.rank === points[b]!.rank ? 0.014 : 0.019 })
    }
    lanes.push({ id: lane, a, b, edge, lateral: points[a]!.rank === points[b]!.rank, length })
  }
  const ring = (ids: readonly number[]) => ids.forEach((id, k) => connect(id, ids[(k + 1) % ids.length]!))

  // Encoder: two inputs feed each outer node, two outer nodes each inner node, and each inner
  // node one port.
  inputs.forEach((id, k) => connect(id, encoder.outer[Math.floor(k / 2)]!))
  ring(encoder.outer)
  encoder.outer.forEach((id, j) => connect(id, encoder.inner[Math.floor(j / 2)]!))
  ring(encoder.inner)
  encoder.inner.forEach((id, m) => connect(id, ports[m]!))
  // Through the glass: every port reaches the centre.
  ports.forEach((port) => connect(port, centre, false))
  // Decoder, the mirror image, narrowing to six outputs.
  decoder.inner.forEach((id, m) => connect(ports[6 + m]!, id))
  ring(decoder.inner)
  decoder.inner.forEach((id, m) => {
    connect(id, decoder.outer[2 * m]!)
    connect(id, decoder.outer[2 * m + 1]!)
  })
  ring(decoder.outer)
  decoder.outer.forEach((id, j) => connect(id, outputs[Math.floor(j / 2)]!))

  const lanesAt: number[][] = points.map(() => [])
  for (const lane of lanes) {
    lanesAt[lane.a]!.push(lane.id)
    lanesAt[lane.b]!.push(lane.id)
  }

  return { nodes, points, lanes, edges, centre, ports, lanesAt }
}

/** The point at the other end of a lane. */
export const across = (lane: Lane, from: number) => (lane.a === from ? lane.b : lane.a)

/** Shortest distance between segments p0–p1 and q0–q1. */
export function segmentDistance(p0: Vec3, p1: Vec3, q0: Vec3, q1: Vec3): number {
  const d1 = sub(p1, p0)
  const d2 = sub(q1, q0)
  const r = sub(p0, q0)
  const a = dot(d1, d1)
  const e = dot(d2, d2)
  const f = dot(d2, r)
  const c = dot(d1, r)
  const b = dot(d1, d2)
  const denom = a * e - b * b
  let s = denom > 1e-12 ? clamp01((b * f - c * e) / denom) : 0
  let t = e > 1e-12 ? (b * s + f) / e : 0
  if (e <= 1e-12) s = clamp01(-c / a)
  else if (t < 0) {
    t = 0
    s = clamp01(-c / a)
  } else if (t > 1) {
    t = 1
    s = clamp01((b - c) / a)
  }
  const pa: Vec3 = [p0[0] + d1[0] * s, p0[1] + d1[1] * s, p0[2] + d1[2] * s]
  const qb: Vec3 = [q0[0] + d2[0] * t, q0[1] + d2[1] * t, q0[2] + d2[2] * t]
  return distance(pa, qb)
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
