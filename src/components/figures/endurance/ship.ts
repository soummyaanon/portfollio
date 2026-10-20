import * as THREE from 'three'

/**
 * The Endurance, after the ship in Interstellar: twelve modules in a ring around a central
 * command hub, the ring spinning about its axis for gravity, a Ranger docked at the hub.
 *
 * Built in the ship's own frame with the ring in the x–y plane and its axis along +z, the ring
 * radius at 1. The hub is joined to the ring by a single tunnel from one module's inner face,
 * as the film's ship is, rather than by a wheel of spokes. The modules come in three kinds, four of each, alternating round the ring:
 * crew habitats with windows on the outer face, equipment modules with radiator fins on top,
 * and service modules with a dark band and a thruster block. Everything repeated is one
 * instanced mesh, so the whole ship is a couple of dozen draw calls.
 *
 * The whole ship turns together, hub and docked Ranger included, as it does in the film.
 *
 * Greys at rest. `setColour(k)` blends in the colours the film's ship has: the gold of its
 * insulation foil on the panels that carry it.
 */

export interface Ship {
  readonly group: THREE.Group
  /** Everything that spins about the ring's axis: the whole ship. */
  readonly ring: THREE.Group
  setColour(amount: number): void
  dispose(): void
}

const MODULES = 12
const RING = 1
const MODULE = { tangential: 0.42, radial: 0.22, axial: 0.2 }

export function createShip(): Ship {
  const disposables: { dispose(): void }[] = []
  const keep = <T extends { dispose(): void }>(thing: T) => (disposables.push(thing), thing)

  const white = keep(new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.55, metalness: 0.1 }))
  const grey = keep(new THREE.MeshStandardMaterial({ color: 0x8c8c8c, roughness: 0.6, metalness: 0.2 }))
  const dark = keep(new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.7, metalness: 0.3 }))
  const metal = keep(new THREE.MeshStandardMaterial({ color: 0xb8b8b8, roughness: 0.3, metalness: 0.85 }))
  const glass = keep(new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.12, metalness: 0.6 }))
  // Insulation foil: grey at rest, the film's gold when the colours come in.
  const foil = keep(new THREE.MeshStandardMaterial({ color: 0xa8a8a8, roughness: 0.35, metalness: 0.75 }))
  const foilGrey = new THREE.Color(0xa8a8a8)
  const foilGold = new THREE.Color(0xc9a04a)

  const group = new THREE.Group()
  const ring = new THREE.Group()
  group.add(ring)

  const matrix = new THREE.Matrix4()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3(1, 1, 1)
  const position = new THREE.Vector3()
  const zAxis = new THREE.Vector3(0, 0, 1)

  /** A frame on the ring at angle `a`: x tangential, y radial (outward), z along the axis. */
  const onRing = (a: number, radial: number, axial: number, local: THREE.Vector3 = new THREE.Vector3()) => {
    const outward = new THREE.Vector3(Math.cos(a), Math.sin(a), 0)
    const along = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0)
    position.copy(outward).multiplyScalar(RING + radial).addScaledVector(along, local.x).addScaledVector(outward, local.y).addScaledVector(zAxis, axial + local.z)
    quaternion.setFromAxisAngle(zAxis, a - Math.PI / 2)
    return position
  }

  const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, count: number) => {
    keep(geometry)
    const mesh = new THREE.InstancedMesh(geometry, material, count)
    ring.add(mesh)
    return mesh
  }

  // ── The modules ────────────────────────────────────────────────────────────────────
  const angle = (k: number) => (k / MODULES) * Math.PI * 2
  const kinds = Array.from({ length: MODULES }, (_, k) => k % 3)
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)

  const whiteBodies = instanced(box(MODULE.tangential, MODULE.radial, MODULE.axial), white, 8)
  const greyBodies = instanced(box(MODULE.tangential, MODULE.radial, MODULE.axial), grey, 4)
  // Raised panels on both axial faces of every module, foil on the equipment modules.
  const panels = instanced(box(MODULE.tangential * 0.38, MODULE.radial * 0.7, 0.012), white, MODULES * 4)
  const foilPanels = instanced(box(MODULE.tangential * 0.8, MODULE.radial * 0.62, 0.014), foil, 4 * 2)
  // End frames where each module meets its tunnel.
  const frames = instanced(box(0.02, MODULE.radial * 1.04, MODULE.axial * 1.04), metal, MODULES * 2)
  const windows = instanced(box(0.05, 0.012, 0.06), glass, 4 * 3)
  const fins = instanced(box(0.006, 0.07, 0.11), grey, 4 * 9)
  const bands = instanced(box(MODULE.tangential * 0.18, MODULE.radial * 1.02, MODULE.axial * 1.02), dark, 4)
  const thrusters = instanced(new THREE.CylinderGeometry(0.012, 0.022, 0.04, 10), metal, 4 * 4)

  let w = 0
  let g = 0
  let pi = 0
  let fi = 0
  let wi = 0
  let ni = 0
  let bi = 0
  let ti = 0
  kinds.forEach((kind, k) => {
    const a = angle(k)
    onRing(a, 0, 0)
    matrix.compose(position, quaternion, scale)
    if (kind === 1) greyBodies.setMatrixAt(g++, matrix)
    else whiteBodies.setMatrixAt(w++, matrix)

    for (const side of [-1, 1]) {
      // Two panels per face, either side of the module's middle.
      for (const along of [-1, 1]) {
        onRing(a, 0, side * (MODULE.axial / 2 + 0.006), new THREE.Vector3(along * MODULE.tangential * 0.22, 0, 0))
        panels.setMatrixAt(pi++, matrix.compose(position, quaternion, scale))
      }
      onRing(a, 0, 0, new THREE.Vector3(side * (MODULE.tangential / 2 + 0.01), 0, 0))
      frames.setMatrixAt(k * 2 + (side > 0 ? 1 : 0), matrix.compose(position, quaternion, scale))
    }

    if (kind === 0) {
      // Crew habitat: a row of three windows on the outer face.
      for (let i = -1; i <= 1; i++) {
        onRing(a, MODULE.radial / 2 + 0.006, 0, new THREE.Vector3(i * 0.1, 0, 0))
        windows.setMatrixAt(wi++, matrix.compose(position, quaternion, scale))
      }
    } else if (kind === 1) {
      // Equipment: foil over both axial faces and a radiator of fins along the outer face.
      for (const side of [-1, 1]) {
        onRing(a, 0, side * (MODULE.axial / 2 + 0.008))
        foilPanels.setMatrixAt(fi++, matrix.compose(position, quaternion, scale))
      }
      for (let i = 0; i < 9; i++) {
        onRing(a, MODULE.radial / 2 + 0.035, 0, new THREE.Vector3((i - 4) * 0.04, 0, 0))
        fins.setMatrixAt(ni++, matrix.compose(position, quaternion, scale))
      }
    } else {
      // Service: a dark band round the middle and a four-nozzle thruster block outside.
      onRing(a, 0, 0)
      bands.setMatrixAt(bi++, matrix.compose(position, quaternion, scale))
      for (let i = 0; i < 4; i++) {
        const local = new THREE.Vector3((i % 2 ? 1 : -1) * 0.035, 0, (i < 2 ? 1 : -1) * 0.035)
        onRing(a, MODULE.radial / 2 + 0.02, 0, local)
        thrusters.setMatrixAt(ti++, matrix.compose(position, quaternion, scale))
      }
    }
  })

  // ── Tunnels between neighbouring modules ───────────────────────────────────────────
  const chord = 2 * RING * Math.sin(Math.PI / MODULES)
  const tunnelLength = chord - MODULE.tangential - 0.02
  const tunnels = instanced(new THREE.CylinderGeometry(0.05, 0.05, tunnelLength, 16), grey, MODULES)
  const collars = instanced(new THREE.TorusGeometry(0.056, 0.008, 6, 20), metal, MODULES * 2)
  for (let k = 0; k < MODULES; k++) {
    const a = angle(k + 0.5)
    // Tunnels lie along the ring's tangent; a cylinder's own axis is y, so turn it onto x.
    const tangent = new THREE.Quaternion().setFromAxisAngle(zAxis, a)
    position.set(Math.cos(a), Math.sin(a), 0).multiplyScalar(RING * Math.cos(Math.PI / MODULES))
    tunnels.setMatrixAt(k, matrix.compose(position, tangent, scale))
    const along = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0)
    const facing = new THREE.Quaternion().setFromUnitVectors(zAxis, along)
    for (const side of [-1, 1]) {
      const at = position.clone().addScaledVector(along, (side * tunnelLength) / 2.2)
      collars.setMatrixAt(k * 2 + (side > 0 ? 1 : 0), matrix.compose(at, facing, scale))
    }
  }

  // ── The hub's tunnel, the hub and the docked Ranger ────────────────────────────────
  // One tunnel, from the inner face of module 0 (a crew habitat) to the hub's rim, with a collar
  // at each end where it meets them.
  const spanStart = 0.3
  const spanEnd = RING - MODULE.radial / 2
  const spine = instanced(new THREE.CylinderGeometry(0.05, 0.05, spanEnd - spanStart, 16), grey, 1)
  position.set((spanStart + spanEnd) / 2, 0, 0)
  quaternion.setFromAxisAngle(zAxis, -Math.PI / 2)
  spine.setMatrixAt(0, matrix.compose(position, quaternion, scale))
  const spineCollars = instanced(new THREE.TorusGeometry(0.056, 0.008, 6, 20), metal, 2)
  const outward = new THREE.Quaternion().setFromUnitVectors(zAxis, new THREE.Vector3(1, 0, 0))
  spineCollars.setMatrixAt(0, matrix.compose(new THREE.Vector3(spanStart + 0.02, 0, 0), outward, scale))
  spineCollars.setMatrixAt(1, matrix.compose(new THREE.Vector3(spanEnd - 0.02, 0, 0), outward, scale))

  const hub = new THREE.Group()
  ring.add(hub)
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, setup?: (mesh: THREE.Mesh) => void) => {
    keep(geometry)
    const mesh = new THREE.Mesh(geometry, material)
    setup?.(mesh)
    hub.add(mesh)
    return mesh
  }
  const alongZ = (mesh: THREE.Mesh) => mesh.rotation.set(Math.PI / 2, 0, 0)
  add(new THREE.CylinderGeometry(0.3, 0.3, 0.26, 40), white, alongZ)
  add(new THREE.CylinderGeometry(0.305, 0.305, 0.05, 40), dark, alongZ)
  add(new THREE.TorusGeometry(0.3, 0.012, 8, 48), metal, (m) => (m.position.z = 0.13))
  add(new THREE.TorusGeometry(0.3, 0.012, 8, 48), metal, (m) => (m.position.z = -0.13))
  // The docking collar on the front face, where the Ranger sits.
  add(new THREE.CylinderGeometry(0.13, 0.15, 0.08, 32), grey, (m) => {
    alongZ(m)
    m.position.z = 0.17
  })
  add(new THREE.TorusGeometry(0.13, 0.016, 8, 32), metal, (m) => (m.position.z = 0.21))
  // The high-gain dish on the back face, on a short mast.
  add(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 8), metal, (m) => {
    alongZ(m)
    m.position.z = -0.21
  })
  // The dish is a shell seen from both sides, so it has its own two-sided material.
  const dish = keep(new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide }))
  add(new THREE.SphereGeometry(0.16, 32, 12, 0, Math.PI * 2, 0, 0.55), dish, (m) => {
    m.rotation.x = -Math.PI / 2
    m.position.z = -0.22
  })

  // The Ranger: a flattened delta, nose out along +z from the collar.
  const plan = new THREE.Shape()
  plan.moveTo(0, 0.34)
  plan.lineTo(0.17, -0.12)
  plan.lineTo(0.15, -0.22)
  plan.lineTo(-0.15, -0.22)
  plan.lineTo(-0.17, -0.12)
  plan.closePath()
  add(
    new THREE.ExtrudeGeometry(plan, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 }),
    white,
    (m) => {
      // The plan lies in x–y with the nose at +y; stand it on the hub's axis, nose outward.
      m.rotation.set(Math.PI / 2, 0, 0)
      m.position.set(0, 0.025, 0.47)
    },
  )
  add(new THREE.BoxGeometry(0.1, 0.03, 0.08), glass, (m) => m.position.set(0, 0.06, 0.66))
  for (const side of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.022, 0.03, 0.05, 12), metal, (m) => {
      alongZ(m)
      m.position.set(side * 0.07, 0, 0.23)
    })
  }

  return {
    group,
    ring,
    setColour(amount) {
      foil.color.lerpColors(foilGrey, foilGold, amount)
    },
    dispose() {
      for (const thing of disposables) thing.dispose()
    },
  }
}
