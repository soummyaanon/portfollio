import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/**
 * White light only, kept low so the sculpture sits in the page's black: a key from high
 * front-left, a rim from behind to draw the silhouettes, a faint sky fill, and a dim neutral
 * studio environment for the chrome to reflect.
 */

export interface Lighting {
  readonly group: THREE.Group
  dispose(): void
}

export function createLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer): Lighting {
  const group = new THREE.Group()

  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, 0.04).texture
  scene.environment = environment
  scene.environmentIntensity = 0.22
  room.dispose()
  pmrem.dispose()

  const key = new THREE.DirectionalLight(0xffffff, 1.7)
  key.position.set(-6, 12, 8)
  const rim = new THREE.DirectionalLight(0xffffff, 0.9)
  rim.position.set(7, 5, -9)
  const fill = new THREE.HemisphereLight(0xffffff, 0x000000, 0.12)
  group.add(key, key.target, rim, fill)

  return {
    group,
    dispose() {
      environment.dispose()
    },
  }
}
