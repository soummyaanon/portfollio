import { across, distance, type Topology } from './topology'

/**
 * The signal model, independent of rendering. Signals enter at the inputs at a calm, steady
 * rate and run forward lane by lane at a constant speed: through the encoder, into the glass,
 * through the centre, out to the decoder and on to an output. Each arrival lights the node it
 * reaches; the core warms with every signal it passes. A wave starts at the centre and runs
 * outward through every lane at once.
 *
 * `step` is the only thing that advances time, so pausing is simply not calling it.
 */

export interface Particle {
  lane: number
  /** The point the particle left from. */
  from: number
  /** Progress along the lane, 0 … 1. */
  t: number
  /** Lanes per second: speed divided by lane length. */
  rate: number
  strength: number
  /** Wave and click signals stop at the end of their lane; ambient ones carry on. */
  terminal: boolean
  /** Ambient signals may take one sideways hop along a ring. */
  hopped: boolean
}

export interface SignalState {
  readonly particles: Particle[]
  /** Brightness each node has from arrivals, 0 … 1.2. */
  readonly nodeGlow: Float32Array
  /** Brightness each node has from the passing wave, 0 … 1. */
  readonly nodeWave: Float32Array
  /** Afterglow left on each drawn edge by the last signal through it, 0 … 1. */
  readonly edgeGlow: Float32Array
  /** The core's warmth from the signals it has passed, 0 … 1.5. */
  core: number
  /** The core's flash when a wave starts, 0 … 1. */
  flash: number
  clock: number
  /** Distance the current wave's front has travelled from the centre, or -1. */
  front: number
}

export const SIGNAL = {
  speed: 2.3,
  waveSpeed: 6.2,
  waveWidth: 0.9,
  /** Seconds between ambient signals entering the network. */
  every: 0.42,
  maxParticles: 256,
  nodeDecay: 0.55,
  edgeDecay: 0.8,
  coreDecay: 1.4,
} as const

export interface Signals {
  readonly state: SignalState
  step(dt: number): void
  /** Starts a wave from the core. */
  wave(): void
  /** Sends a signal down every lane that leaves a node, as if it fired. */
  fire(node: number): void
}

export function createSignals(topology: Topology, random: () => number = Math.random): Signals {
  const { points, lanes, nodes, lanesAt, centre } = topology
  const state: SignalState = {
    particles: [],
    nodeGlow: new Float32Array(nodes.length),
    nodeWave: new Float32Array(nodes.length),
    edgeGlow: new Float32Array(topology.edges.length),
    core: 0,
    flash: 0,
    clock: 0,
    front: -1,
  }
  const inputs = nodes.filter((node) => node.layer === 'input').map((node) => node.id)
  const reach = points.map((point) => distance(point.position, [0, 0, 0]))
  const farthest = Math.max(...reach)
  // Lanes ordered by their near end, so the wave can launch them as its front passes.
  const waveOrder = lanes
    .filter((lane) => !lane.lateral)
    .map((lane) => {
      const near = reach[lane.a]! <= reach[lane.b]! ? lane.a : lane.b
      return { lane: lane.id, from: near, at: reach[near]! }
    })
    .sort((p, q) => p.at - q.at)
  let waveNext = waveOrder.length
  let spawnIn = 0

  const launch = (lane: number, from: number, speed: number, strength: number, terminal: boolean, hopped = false) => {
    if (state.particles.length >= SIGNAL.maxParticles) return
    state.particles.push({ lane, from, t: 0, rate: speed / lanes[lane]!.length, strength, terminal, hopped })
  }

  const arrive = (particle: Particle) => {
    const lane = lanes[particle.lane]!
    const at = across(lane, particle.from)
    const point = points[at]!
    if (point.node >= 0) state.nodeGlow[point.node] = Math.min(1.2, state.nodeGlow[point.node]! + particle.strength)
    if (at === centre) state.core = Math.min(1.5, state.core + 0.22 * particle.strength)
    if (particle.terminal) return

    const onward = lanesAt[at]!.filter((id) => points[across(lanes[id]!, at)]!.rank > point.rank)
    const sideways = particle.hopped ? [] : lanesAt[at]!.filter((id) => lanes[id]!.lateral && id !== particle.lane)
    if (sideways.length > 0 && random() < 0.14) {
      const id = sideways[Math.floor(random() * sideways.length)]!
      launch(id, at, SIGNAL.speed, particle.strength, false, true)
      return
    }
    if (onward.length === 0) return
    launch(onward[Math.floor(random() * onward.length)]!, at, SIGNAL.speed, particle.strength, false, particle.hopped)
  }

  return {
    state,
    step(dt) {
      state.clock += dt
      const node = Math.exp(-dt / SIGNAL.nodeDecay)
      const edge = Math.exp(-dt / SIGNAL.edgeDecay)
      for (let i = 0; i < state.nodeGlow.length; i++) state.nodeGlow[i]! *= node
      for (let i = 0; i < state.edgeGlow.length; i++) state.edgeGlow[i]! *= edge
      state.core *= Math.exp(-dt / SIGNAL.coreDecay)
      state.flash *= Math.exp(-dt / 0.45)

      spawnIn -= dt
      while (spawnIn <= 0) {
        spawnIn += SIGNAL.every * (0.6 + 0.8 * random())
        const input = inputs[Math.floor(random() * inputs.length)]!
        launch(lanesAt[input]![0]!, input, SIGNAL.speed, 0.55 + 0.45 * random(), false)
      }

      if (state.front >= 0) {
        state.front += SIGNAL.waveSpeed * dt
        while (waveNext < waveOrder.length && waveOrder[waveNext]!.at <= state.front) {
          const { lane, from } = waveOrder[waveNext++]!
          launch(lane, from, SIGNAL.waveSpeed, 0.6, true)
        }
        for (const n of nodes) {
          const off = (reach[n.id]! - state.front) / SIGNAL.waveWidth
          state.nodeWave[n.id] = Math.exp(-off * off)
        }
        if (state.front > farthest + 3 * SIGNAL.waveWidth) {
          state.front = -1
          state.nodeWave.fill(0)
        }
      }

      const live = state.particles
      const count = live.length
      let kept = 0
      for (let i = 0; i < count; i++) {
        const particle = live[i]!
        particle.t += particle.rate * dt
        const lane = lanes[particle.lane]!
        if (lane.edge >= 0) state.edgeGlow[lane.edge] = Math.max(state.edgeGlow[lane.edge]!, 0.22 * particle.strength)
        if (particle.t >= 1) {
          arrive(particle)
          continue
        }
        live[kept++] = particle
      }
      // `arrive` appends continuing particles after the ones stepped here; move them down.
      for (let i = count; i < live.length; i++) live[kept++] = live[i]!
      live.length = kept
    },
    wave() {
      state.front = 0
      state.flash = 1
      state.core = Math.min(1.5, state.core + 0.6)
      waveNext = 0
    },
    fire(node) {
      state.nodeGlow[node] = 1.2
      for (const id of lanesAt[node]!) launch(id, node, SIGNAL.speed * 1.3, 1, true)
    },
  }
}
