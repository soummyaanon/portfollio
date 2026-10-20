import * as THREE from 'three'

import { createCameraRig } from './camera'
import { createConnections } from './connections'
import { createCore } from './core'
import { createLighting } from './lighting'
import { createNodes } from './nodes'
import { createParticles } from './particles'
import { createSignals } from './signals'
import { across, buildTopology } from './topology'

/**
 * The whole sculpture: builds every part once, owns the one animation step, and turns pointer
 * input into emphasis. Hovering a node lifts it, its connections and its neighbours while the
 * rest of the network dims a little; clicking pins that and fires the node; clicking the core
 * sends a wave out through everything.
 */

export interface NeuralScene {
  readonly canvas: HTMLCanvasElement
  resize(width: number, height: number): void
  /** Moves the pointer, in normalised device coordinates, or clears it with null. */
  point(at: { x: number; y: number } | null): 'node' | 'core' | null
  /** A click at the last pointed position: fires a node, starts a wave or clears the pin. */
  press(): void
  wave(): void
  /** Lets go of a pinned node. */
  clear(): void
  /**
   * Advances by `dt` seconds (0 when paused) and renders if anything changed. Returns false when
   * the scene is completely at rest, so the caller can stop asking for frames.
   */
  frame(dt: number): boolean
  dispose(): void
}

export function createNeuralScene(container: HTMLElement, options: { small: boolean }): NeuralScene {
  const { small } = options
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  const pixelRatio = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75)
  renderer.setPixelRatio(pixelRatio)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
    renderer.setClearColor(0x000000, 0)
  renderer.domElement.className = 'nn-canvas'
  container.prepend(renderer.domElement)

  const scene = new THREE.Scene()
  const topology = buildTopology()
  const signals = createSignals(topology)
  const lighting = createLighting(scene, renderer)
  const core = createCore(topology, { small })
  const nodes = createNodes(topology, { small })
  const connections = createConnections(topology, { small })
  const particles = createParticles(topology)
  // The network is laid out along +x; the sculpture stands it upright, inputs at the top and
  // outputs at the bottom, so it turns about its own flow axis.
  const sculpture = new THREE.Group()
  sculpture.rotation.z = -Math.PI / 2
  sculpture.add(core.group, nodes.group, connections.mesh, particles.group)
  sculpture.updateMatrixWorld(true)
  scene.add(lighting.group, sculpture)

  // Frame the sculpture by its nodes, including their size, where it actually stands.
  const bounds = topology.nodes.flatMap((node) => {
    const at = new THREE.Vector3(...node.position).applyMatrix4(sculpture.matrixWorld)
    return [-1, 1].flatMap((s) => [at.clone().addScalar(s * node.radius * 1.6), at.clone().subScalar(s * node.radius * 1.6)])
  })
  const rig = createCameraRig(renderer.domElement, bounds)

  // ── Emphasis ─────────────────────────────────────────────────────────────────────
  const nodeCount = topology.nodes.length
  const edgeCount = topology.edges.length
  const neighbours = topology.nodes.map((node) =>
    topology.lanesAt[node.id]!.map((id) => topology.lanes[id]!).filter((lane) => lane.edge >= 0),
  )
  const nodeEmphasis = new Float32Array(nodeCount)
  const nodeEmphasisTarget = new Float32Array(nodeCount)
  const edgeEmphasis = new Float32Array(edgeCount)
  const edgeEmphasisTarget = new Float32Array(edgeCount)
  let dim = 0
  let coreHover = 0
  let hovered = -1
  let pinned = -1
  let overCore = false

  const focus = () => {
    nodeEmphasisTarget.fill(0)
    edgeEmphasisTarget.fill(0)
    const at = pinned >= 0 ? pinned : hovered
    if (at < 0) return
    nodeEmphasisTarget[at] = 1
    for (const lane of neighbours[at]!) {
      edgeEmphasisTarget[lane.edge] = 1
      const other = topology.points[across(lane, at)]!.node
      if (other >= 0) nodeEmphasisTarget[other] = Math.max(nodeEmphasisTarget[other]!, 0.5)
    }
  }

  // ── Picking ──────────────────────────────────────────────────────────────────────
  const ray = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let pointerSet = false
  let pickDirty = false
  const pick = () => {
    pickDirty = false
    if (!pointerSet) {
      hovered = -1
      overCore = false
      return
    }
    ray.setFromCamera(pointer, rig.camera)
    const node = nodes.pick(ray)
    hovered = node
    overCore = node < 0 && ray.intersectObject(core.hit, false).length > 0
  }

  // ── Per-frame buffers ────────────────────────────────────────────────────────────
  const tone = new Float32Array(nodeCount)
  const light = new Float32Array(nodeCount)
  const glow = new Float32Array(nodeCount)
  const scale = new Float32Array(nodeCount)
  const edgeTone = new Float32Array(edgeCount)
  const edgeLight = new Float32Array(edgeCount)
  const head = new Float32Array(edgeCount)
  const strength = new Float32Array(edgeCount)
  const state = signals.state

  let time = 0
  let rendered = false
  let resting = 0

  return {
    canvas: renderer.domElement,
    resize(width, height) {
      rig.resize(width, height)
      renderer.setSize(width, height, false)
      rendered = false
    },
    point(at) {
      pointerSet = at !== null
      if (at) pointer.set(at.x, at.y)
      pick()
      focus()
      return hovered >= 0 ? 'node' : overCore ? 'core' : null
    },
    press() {
      if (pickDirty) pick()
      if (hovered >= 0) {
        pinned = pinned === hovered ? -1 : hovered
        if (pinned >= 0) signals.fire(pinned)
      } else if (overCore) {
        signals.wave()
      } else {
        pinned = -1
      }
      focus()
      rendered = false
    },
    wave() {
      signals.wave()
    },
    clear() {
      pinned = -1
      focus()
    },
    frame(dt) {
      const viewMoved = rig.update(dt)
      // The camera moving under a still pointer changes what it is over.
      if (viewMoved && pointerSet) pickDirty = true
      if (pickDirty) {
        pick()
        focus()
      }
      if (dt > 0) {
        time += dt
        signals.step(dt)
      }

      // Ease the emphasis whether or not time runs, so hover still answers while paused.
      const k = 1 - Math.exp(-Math.max(dt, 1 / 60) / 0.12)
      let easing = false
      const dimTarget = pinned >= 0 ? 1 : hovered >= 0 ? 0.6 : 0
      dim += (dimTarget - dim) * k
      coreHover += ((overCore ? 1 : 0) - coreHover) * k
      easing ||= Math.abs(dimTarget - dim) > 1e-3 || Math.abs((overCore ? 1 : 0) - coreHover) > 1e-3
      for (let i = 0; i < nodeCount; i++) {
        nodeEmphasis[i]! += (nodeEmphasisTarget[i]! - nodeEmphasis[i]!) * k
        easing ||= Math.abs(nodeEmphasisTarget[i]! - nodeEmphasis[i]!) > 1e-3
      }
      for (let i = 0; i < edgeCount; i++) {
        edgeEmphasis[i]! += (edgeEmphasisTarget[i]! - edgeEmphasis[i]!) * k
        easing ||= Math.abs(edgeEmphasisTarget[i]! - edgeEmphasis[i]!) > 1e-3
      }

      if (dt === 0 && !viewMoved && !easing && rendered) {
        resting++
        return resting < 2
      }
      resting = 0

      for (let i = 0; i < nodeCount; i++) {
        const node = topology.nodes[i]!
        const lit = Math.max(Math.min(state.nodeGlow[i]!, 1), state.nodeWave[i]!)
        const emphasis = nodeEmphasis[i]!
        tone[i] = node.tone * (1 - 0.7 * dim * (1 - Math.min(1, emphasis * 2))) + 0.35 * emphasis
        const fade = 1 - 0.5 * dim * (1 - Math.min(1, emphasis * 2))
        light[i] = (0.22 * lit + 0.25 * emphasis) * fade
        glow[i] = (0.75 * lit + 0.35 * emphasis) * fade
        scale[i] = 1 + 0.18 * lit + 0.3 * (emphasis > 0.75 ? emphasis : emphasis * 0.4)
      }
      for (let i = 0; i < edgeCount; i++) {
        const edge = topology.edges[i]!
        const lane = topology.lanes[edge.lane]!
        const base = lane.lateral ? 0.18 : 0.28
        const emphasis = edgeEmphasis[i]!
        edgeTone[i] = base * (1 - 0.72 * dim * (1 - emphasis)) + 0.4 * emphasis
        edgeLight[i] = 0.4 * state.edgeGlow[i]! * (1 - 0.6 * dim * (1 - emphasis)) + 0.32 * emphasis
        strength[i] = 0
      }
      // The wave lights each edge as its front passes the edge's middle.
      if (state.front >= 0) {
        for (let i = 0; i < edgeCount; i++) {
          const edge = topology.edges[i]!
          const middle = Math.hypot((edge.from[0] + edge.to[0]) / 2, (edge.from[1] + edge.to[1]) / 2, (edge.from[2] + edge.to[2]) / 2)
          const off = (middle - state.front) / 1.1
          edgeLight[i]! += 0.3 * Math.exp(-off * off)
        }
      }
      // Each tube shows the brightest signal on it as a running head with a trail.
      for (const particle of state.particles) {
        const lane = topology.lanes[particle.lane]!
        if (lane.edge < 0 || particle.strength < Math.abs(strength[lane.edge]!)) continue
        const forward = particle.from === lane.a
        head[lane.edge] = forward ? particle.t : 1 - particle.t
        strength[lane.edge] = (forward ? 1 : -1) * particle.strength
      }

      nodes.update(tone, light, scale)
      connections.update(edgeTone, edgeLight, head, strength)
      particles.setScale(rig.pixelsPerUnit() * pixelRatio)
      particles.update(state.particles, glow)
      core.update(time, { warmth: state.core, flash: state.flash, hover: coreHover })
      renderer.render(scene, rig.camera)
      rendered = true
      return true
    },
    dispose() {
      rig.dispose()
      core.dispose()
      nodes.dispose()
      connections.dispose()
      particles.dispose()
      lighting.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
