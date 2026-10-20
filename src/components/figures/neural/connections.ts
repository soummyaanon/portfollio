import * as THREE from 'three'

import { connectionMetal } from './materials'
import type { Topology } from './topology'

/**
 * Every drawn connection as one instanced, open-ended tube. A tube runs from its lane's first
 * point to its second along the tube's local +y, which is how the shader reads `aSignal`.
 */

export interface Connections {
  readonly mesh: THREE.InstancedMesh
  /**
   * `tone` and `light` are per edge. `head` is the progress of the signal shown on each edge
   * (0 … 1 from its first point) and `strength` its brightness, negative when it runs backwards.
   */
  update(tone: Float32Array, light: Float32Array, head: Float32Array, strength: Float32Array): void
  dispose(): void
}

export function createConnections(topology: Topology, options: { small: boolean }): Connections {
  const { edges } = topology
  const geometry = new THREE.CylinderGeometry(1, 1, 1, options.small ? 6 : 8, 1, true)
  const signal = new THREE.InstancedBufferAttribute(new Float32Array(edges.length * 3), 3)
  signal.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('aSignal', signal)
  const material = connectionMetal()
  const mesh = new THREE.InstancedMesh(geometry, material, edges.length)
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(edges.length * 3), 3)
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage)

  const matrix = new THREE.Matrix4()
  const quaternion = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const values = signal.array as Float32Array
  edges.forEach((edge, i) => {
    from.set(...edge.from)
    to.set(...edge.to)
    quaternion.setFromUnitVectors(up, to.clone().sub(from).normalize())
    mesh.setMatrixAt(i, matrix.compose(from.clone().add(to).multiplyScalar(0.5), quaternion, new THREE.Vector3(edge.radius, edge.length, edge.radius)))
    values[3 * i + 2] = edge.length
  })
  mesh.computeBoundingSphere()

  return {
    mesh,
    update(tone, light, head, strength) {
      const colours = mesh.instanceColor!.array as Float32Array
      for (let i = 0; i < edges.length; i++) {
        colours[3 * i] = tone[i]!
        colours[3 * i + 1] = light[i]!
        values[3 * i] = head[i]!
        values[3 * i + 1] = strength[i]!
      }
      mesh.instanceColor!.needsUpdate = true
      signal.needsUpdate = true
    },
    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}
