import * as THREE from 'three'

import { chrome, instancedMetal } from './materials'
import type { Layer, Topology } from './topology'

/**
 * The nodes, one instanced mesh per kind so each layer reads by its shape: inputs are small
 * graphite spheres, processing nodes are faceted icosahedra (the inner ring's are larger),
 * outputs are pale spheres held in chrome collars that face along the flow.
 */

export interface Nodes {
  readonly group: THREE.Group
  /** The node under a ray, or -1. */
  pick(ray: THREE.Raycaster): number
  /** Writes each node's grey, light and scale into the instances. */
  update(tone: Float32Array, light: Float32Array, scale: Float32Array): void
  dispose(): void
}

export function createNodes(topology: Topology, options: { small: boolean }): Nodes {
  const detail = options.small ? 2 : 3
  const shapes: Record<Layer, THREE.BufferGeometry> = {
    input: new THREE.IcosahedronGeometry(1, detail),
    outer: new THREE.IcosahedronGeometry(1, 0),
    inner: new THREE.IcosahedronGeometry(1, 1),
    output: new THREE.IcosahedronGeometry(1, detail),
  }
  const smooth = instancedMetal({ roughness: 0.3, metalness: 0.8 })
  const faceted = instancedMetal({ roughness: 0.26, metalness: 0.85, flat: true })
  const pale = instancedMetal({ roughness: 0.4, metalness: 0.35 })
  const materials: Record<Layer, THREE.Material> = { input: smooth, outer: faceted, inner: faceted, output: pale }

  const group = new THREE.Group()
  const meshes = new Map<Layer, { mesh: THREE.InstancedMesh; ids: number[] }>()
  for (const layer of ['input', 'outer', 'inner', 'output'] as const) {
    const ids = topology.nodes.filter((node) => node.layer === layer).map((node) => node.id)
    const mesh = new THREE.InstancedMesh(shapes[layer], materials[layer], ids.length)
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(ids.length * 3), 3)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage)
    mesh.userData.ids = ids
    group.add(mesh)
    meshes.set(layer, { mesh, ids })
  }

  // Each output sits in a chrome collar whose ring faces along the flow.
  const outputs = meshes.get('output')!.ids
  const metal = chrome()
  const collars = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.09, 8, options.small ? 24 : 40), metal, outputs.length)
  const facing = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0))
  const matrix = new THREE.Matrix4()
  const position = new THREE.Vector3()
  const size = new THREE.Vector3()
  outputs.forEach((id, i) => {
    const node = topology.nodes[id]!
    collars.setMatrixAt(i, matrix.compose(position.set(...node.position), facing, size.setScalar(node.radius * 1.6)))
  })
  group.add(collars)

  // A fixed, varied orientation per node, so neighbouring facets catch the light differently.
  const orientation = topology.nodes.map((node) => new THREE.Quaternion().setFromEuler(new THREE.Euler(node.id * 0.7, node.id * 1.3, node.id * 0.4)))
  const pickable = [...meshes.values()].map(({ mesh }) => mesh)

  const nodes: Nodes = {
    group,
    pick(ray) {
      const hit = ray.intersectObjects(pickable, false)[0]
      if (!hit || hit.instanceId === undefined) return -1
      return (hit.object.userData.ids as number[])[hit.instanceId]!
    },
    update(tone, light, scale) {
      for (const { mesh, ids } of meshes.values()) {
        const colours = mesh.instanceColor!.array as Float32Array
        ids.forEach((id, i) => {
          const node = topology.nodes[id]!
          mesh.setMatrixAt(i, matrix.compose(position.set(...node.position), orientation[id]!, size.setScalar(node.radius * scale[id]!)))
          colours[3 * i] = tone[id]!
          colours[3 * i + 1] = light[id]!
        })
        mesh.instanceMatrix.needsUpdate = true
        mesh.instanceColor!.needsUpdate = true
      }
    },
    dispose() {
      for (const geometry of Object.values(shapes)) geometry.dispose()
      collars.geometry.dispose()
      for (const material of [smooth, faceted, pale, metal]) material.dispose()
    },
  }

  // Place every instance once, then fix the bounds the culling and picking use, with room for
  // a hovered node to grow.
  const count = topology.nodes.length
  nodes.update(Float32Array.from(topology.nodes, (node) => node.tone), new Float32Array(count), new Float32Array(count).fill(1))
  for (const mesh of pickable) {
    mesh.computeBoundingSphere()
    mesh.boundingSphere!.radius += 0.3
  }
  return nodes
}
