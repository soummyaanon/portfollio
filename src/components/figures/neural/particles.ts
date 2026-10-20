import * as THREE from 'three'

import { haloMaterial } from './materials'
import { SIGNAL, type Particle } from './signals'
import type { Topology } from './topology'

/**
 * What the connections' own light cannot show: the signals crossing the glass core as small
 * white beads (outside it, a signal is a pulse inside its tube), and soft halos, one per lit
 * node and a faint one round each signal. The beads are one instanced mesh and every halo is a
 * point in one buffer, so the whole layer is two draw calls however busy the network is.
 */

export interface Particles {
  readonly group: THREE.Group
  /** Pixels per world unit on screen, for sizing the halos. */
  setScale(pixels: number): void
  update(particles: readonly Particle[], nodeGlow: Float32Array): void
  dispose(): void
}

export function createParticles(topology: Topology): Particles {
  const { nodes, points, lanes } = topology
  const max = SIGNAL.maxParticles
  const beadGeometry = new THREE.IcosahedronGeometry(0.032, 1)
  const beadMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const beads = new THREE.InstancedMesh(beadGeometry, beadMaterial, max)
  beads.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  beads.frustumCulled = false
  beads.count = 0

  const total = nodes.length + max
  const positions = new Float32Array(total * 3)
  const sizes = new Float32Array(total)
  const alphas = new Float32Array(total)
  nodes.forEach((node, i) => {
    positions.set(node.position, 3 * i)
    sizes[i] = node.radius * 6
  })
  const haloGeometry = new THREE.BufferGeometry()
  const positionAttribute = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)
  const alphaAttribute = new THREE.BufferAttribute(alphas, 1).setUsage(THREE.DynamicDrawUsage)
  haloGeometry.setAttribute('position', positionAttribute)
  haloGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  haloGeometry.setAttribute('aAlpha', alphaAttribute)
  const material = haloMaterial()
  const halos = new THREE.Points(haloGeometry, material)
  halos.frustumCulled = false
  halos.renderOrder = 4

  const group = new THREE.Group()
  group.add(beads, halos)

  const matrix = new THREE.Matrix4()
  const at = (particle: Particle, out: number[]) => {
    const lane = lanes[particle.lane]!
    const a = points[particle.from]!.position
    const b = points[particle.from === lane.a ? lane.b : lane.a]!.position
    const t = particle.t
    out[0] = a[0] + (b[0] - a[0]) * t
    out[1] = a[1] + (b[1] - a[1]) * t
    out[2] = a[2] + (b[2] - a[2]) * t
  }
  const point = [0, 0, 0]

  return {
    group,
    setScale(pixels) {
      material.uniforms.uScale!.value = pixels
    },
    update(particles, nodeGlow) {
      for (let i = 0; i < nodes.length; i++) alphas[i] = Math.min(0.5, nodeGlow[i]! * 0.5)
      const count = Math.min(particles.length, max)
      let inside = 0
      for (let i = 0; i < count; i++) {
        const particle = particles[i]!
        at(particle, point)
        // Signals ease in and out at their lane's ends so arrivals never pop.
        const ends = Math.min(1, Math.min(particle.t, 1 - particle.t) * 6)
        const glass = lanes[particle.lane]!.edge < 0
        if (glass) {
          const size = (0.7 + 0.5 * particle.strength) * ends
          beads.setMatrixAt(inside++, matrix.makeScale(size, size, size).setPosition(point[0]!, point[1]!, point[2]!))
        }
        const slot = nodes.length + i
        positions[3 * slot] = point[0]!
        positions[3 * slot + 1] = point[1]!
        positions[3 * slot + 2] = point[2]!
        sizes[slot] = glass ? 0.4 : 0.42
        alphas[slot] = (glass ? 0.35 : 0.3) * particle.strength * ends
      }
      for (let i = count; i < max; i++) alphas[nodes.length + i] = 0
      beads.count = inside
      beads.instanceMatrix.needsUpdate = true
      positionAttribute.needsUpdate = true
      alphaAttribute.needsUpdate = true
      haloGeometry.getAttribute('aSize').needsUpdate = true
    },
    dispose() {
      beadGeometry.dispose()
      beadMaterial.dispose()
      haloGeometry.dispose()
      material.dispose()
    },
  }
}
