import * as THREE from 'three'

import { chrome, frostedGlass, graphite, lightCore, radialTexture } from './materials'
import { CORE, type Topology } from './topology'

/**
 * The core, from the inside out: a white sphere lit from within, a graphite octahedron frame, a
 * chrome dodecahedron frame, a frosted-glass icosahedron with chrome edges, twelve chrome ports
 * the connections plug into, and three orbital rings precessing round the flow axis. The frames
 * turn on different axes; the rings spin in their own planes while their axes circle the flow.
 */

export interface Core {
  readonly group: THREE.Group
  /** An invisible ball for picking the core. */
  readonly hit: THREE.Mesh
  update(time: number, state: { warmth: number; flash: number; hover: number }): void
  dispose(): void
}

const UP = new THREE.Vector3(0, 1, 0)

/** The edges of a polyhedron as instanced struts, with a ball at every vertex. */
function frame(geometry: THREE.BufferGeometry, strut: number, joint: number, material: THREE.Material, segments: number) {
  const edges = new THREE.EdgesGeometry(geometry, 1)
  const position = edges.getAttribute('position')
  const count = position.count / 2
  const struts = new THREE.InstancedMesh(new THREE.CylinderGeometry(strut, strut, 1, segments, 1, true), material, count)
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const matrix = new THREE.Matrix4()
  const quaternion = new THREE.Quaternion()
  const vertices = new Map<string, THREE.Vector3>()
  for (let i = 0; i < count; i++) {
    a.fromBufferAttribute(position, 2 * i)
    b.fromBufferAttribute(position, 2 * i + 1)
    for (const v of [a, b]) vertices.set(v.toArray().map((n) => n.toFixed(4)).join(), v.clone())
    quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize())
    matrix.compose(a.clone().add(b).multiplyScalar(0.5), quaternion, new THREE.Vector3(1, a.distanceTo(b), 1))
    struts.setMatrixAt(i, matrix)
  }
  const balls = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(joint, 2), material, vertices.size)
  ;[...vertices.values()].forEach((v, i) => balls.setMatrixAt(i, matrix.makeTranslation(v)))
  edges.dispose()
  const group = new THREE.Group()
  group.add(struts, balls)
  return group
}

export function createCore(topology: Topology, options: { small: boolean }): Core {
  const segments = options.small ? 6 : 10
  const group = new THREE.Group()
  const metal = chrome()
  const dark = graphite()
  const glass = frostedGlass()
  const glow = lightCore()
  const disposables: { dispose(): void }[] = [metal, dark, glass, glow]

  const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(CORE.sphere, 5), glow)
  group.add(sphere)

  const octahedron = frame(new THREE.OctahedronGeometry(CORE.octahedron), 0.016, 0.034, dark, segments)
  const dodecahedron = frame(new THREE.DodecahedronGeometry(CORE.dodecahedron), 0.009, 0.022, metal, segments)
  dodecahedron.rotation.set(0.4, 0.2, 0)
  const shellBody = new THREE.Mesh(new THREE.IcosahedronGeometry(CORE.shell, 0), glass)
  shellBody.renderOrder = 2
  const shell = new THREE.Group()
  shell.add(shellBody, frame(new THREE.IcosahedronGeometry(CORE.shell, 0), 0.012, 0.03, metal, segments))
  group.add(octahedron, dodecahedron, shell)

  // Halo round the inner sphere, added onto everything behind it.
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: radialTexture(128, 3.2), color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  )
  halo.renderOrder = 3
  group.add(halo)
  disposables.push(halo.material, halo.material.map!)

  // Ports: a short chrome collar where each connection meets the core, lined up with it.
  const portCollar = new THREE.CylinderGeometry(0.05, 0.05, 0.16, segments * 2, 1, true)
  const ports = new THREE.InstancedMesh(portCollar, metal, topology.ports.length)
  const rims = new THREE.InstancedMesh(new THREE.TorusGeometry(0.05, 0.012, 6, segments * 2), metal, topology.ports.length)
  const matrix = new THREE.Matrix4()
  const quaternion = new THREE.Quaternion()
  topology.ports.forEach((port, i) => {
    const lane = topology.lanes[topology.lanesAt[port]!.find((id) => topology.lanes[id]!.edge >= 0)!]!
    const at = new THREE.Vector3(...topology.points[port]!.position)
    const toward = new THREE.Vector3(...topology.points[lane.a === port ? lane.b : lane.a]!.position).sub(at).normalize()
    quaternion.setFromUnitVectors(UP, toward)
    ports.setMatrixAt(i, matrix.compose(at, quaternion, new THREE.Vector3(1, 1, 1)))
    // The rim faces along the collar: a torus lies across its own z axis.
    const rim = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), toward)
    rims.setMatrixAt(i, matrix.compose(at.clone().addScaledVector(toward, 0.08), rim, new THREE.Vector3(1, 1, 1)))
  })
  group.add(ports, rims)

  // Orbital rings. The middle one carries a fine scale of ticks; each carries chrome beads.
  const rings = CORE.rings.map((spec, index) => {
    const ring = new THREE.Group()
    const band = new THREE.Mesh(new THREE.TorusGeometry(spec.radius, index === 1 ? 0.016 : 0.011, 8, options.small ? 120 : 220), index === 1 ? dark : metal)
    ring.add(band)
    const beads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(index === 1 ? 0.05 : 0.038, 2), metal, 3)
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + index
      beads.setMatrixAt(k, matrix.makeTranslation(spec.radius * Math.cos(a), spec.radius * Math.sin(a), 0))
    }
    ring.add(beads)
    if (index === 1) {
      const count = 96
      const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.006, 1, 0.006), metal, count)
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2
        const long = k % 8 === 0 ? 0.11 : 0.05
        const r = spec.radius + 0.03 + long / 2
        ticks.setMatrixAt(k, matrix.compose(new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a - Math.PI / 2), new THREE.Vector3(1, long, 1)))
      }
      ring.add(ticks)
    }
    group.add(ring)
    return { ring, spec, direction: index % 2 === 0 ? 1 : -1, phase: index * 2.1 }
  })

  const hit = new THREE.Mesh(new THREE.SphereGeometry(CORE.shell * 1.05, 12, 8), new THREE.MeshBasicMaterial({ visible: false }))
  group.add(hit)

  const light = new THREE.PointLight(0xffffff, 3, 0, 1.6)
  group.add(light)

  const zAxis = new THREE.Vector3(0, 0, 1)
  const normal = new THREE.Vector3()
  const align = new THREE.Quaternion()
  const spin = new THREE.Quaternion()

  return {
    group,
    hit,
    update(time, { warmth, flash, hover }) {
      octahedron.rotation.set(time * 0.11, time * 0.27, 0)
      dodecahedron.rotation.set(0.4 - time * 0.09, 0.2, time * 0.14)
      shell.rotation.set(time * 0.05, -time * 0.07, 0)
      for (const { ring, spec, direction, phase } of rings) {
        const precession = phase + direction * time * 0.16
        normal.set(Math.cos(spec.tilt), Math.sin(spec.tilt) * Math.cos(precession), Math.sin(spec.tilt) * Math.sin(precession))
        align.setFromUnitVectors(zAxis, normal)
        spin.setFromAxisAngle(zAxis, direction * time * 0.22 + phase)
        ring.quaternion.multiplyQuaternions(align, spin)
      }
      const breath = 0.5 + 0.5 * Math.sin(time * 1.25)
      const pulse = 0.55 + 0.18 * breath + 0.35 * Math.min(warmth, 1.5) + 1.2 * flash + 0.25 * hover
      glow.emissiveIntensity = pulse
      sphere.scale.setScalar(1 + 0.035 * breath + 0.12 * flash)
      halo.scale.setScalar(1.4 + 0.15 * breath + 0.25 * Math.min(warmth, 1.5) + 1.8 * flash)
      halo.material.opacity = 0.2 + 0.06 * breath + 0.1 * Math.min(warmth, 1.5) + 0.35 * flash
      light.intensity = 1.2 + 0.5 * breath + 1.4 * Math.min(warmth, 1.5) + 5 * flash
      glass.opacity = 0.06 + 0.05 * hover
    },
    dispose() {
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose()
      })
      for (const item of disposables) item.dispose()
      hit.material.dispose()
    },
  }
}
