import * as THREE from 'three'

import { CAPTURE_RATIO, PLATE_RS, PLATE_SEAT_X, PLATE_SEAT_Y } from '@/components/document/plate-geometry'

import { createOrbit } from './orbit'
import { createShip } from './ship'

/**
 * The Endurance in orbit about the plate's black hole, on its own transparent canvas laid
 * exactly over the plate's. The camera is orthographic and framed in the plate's own units
 * (height −1 … 1, y up), so the hole here is the hole there to the pixel.
 *
 * The orbit is integrated in the hole's Schwarzschild geometry (orbit.ts): an ellipse just
 * outside the accretion disk, swept faster near the hole than far out, its long axis turning
 * further round on every pass. Its plane is seen nearly edge-on like the disk's, so the ship
 * crosses in front of the hole along the lower arc and behind it along the upper one.
 * Behind, it is hidden where the shadow is, by a disc that writes depth and no colour at the
 * hole's exact radius, so the ship goes behind the event horizon rather than over a painting
 * of one. Behind the hole the ship is also further off than the disk's far side, whose light
 * is bent up into the bright arc over the shadow, so near that arc the ship fades under it.
 * It is lit from the hole by the disk's light, and the whole ship turns about its axis as it
 * goes.
 */

export interface OrbitScene {
  readonly canvas: HTMLCanvasElement
  resize(width: number, height: number): void
  /**
   * Advances by `dt` seconds (0 holds it) with `colour` 0 … 1, how much of the film's colour
   * shows, and renders.
   */
  frame(dt: number, colour: number): void
  dispose(): void
}

export const ORBIT = {
  /** The ellipse, in plate units: periapsis 0.74 just outside the disk, apoapsis 1.16. */
  a: 0.95,
  e: 0.22,
  /** Where the first periapsis falls round the orbit, radians: to the front right. */
  periapsisAt: 0.35,
  /** How far the orbit plane opens from edge-on, as the vertical squash of the ellipse. */
  open: 0.2,
  /** Seconds per orbit (for the Newtonian orbit of the same size), and per turn of the ship. */
  period: 120,
  spin: 30,
  /**
   * The ship's ring radius on screen, in plate units: about a quarter of the shadow's width,
   * so the hole plainly dwarfs it. True scale is out of reach — a 64 m ship beside a horizon two
   * astronomical units across would be a ten-billionth of the shadow — so this is the smallest
   * the ring can be and still read as the ring.
   */
  size: 0.045,
} as const

const HOLE_R = CAPTURE_RATIO * PLATE_RS

export function createOrbitScene(container: HTMLElement, options: { small: boolean }): OrbitScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.small ? 1.5 : 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.setClearColor(0x000000, 0)
  renderer.domElement.className = 'endurance-canvas'
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20)
  camera.position.set(0, 0, 10)
  camera.lookAt(0, 0, 0)

  // The shadow: depth and no colour, drawn first, so whatever lies behind it is not drawn.
  const occluderGeometry = new THREE.CircleGeometry(HOLE_R * 0.98, 96)
  const occluderMaterial = new THREE.MeshBasicMaterial({ colorWrite: false })
  const occluder = new THREE.Mesh(occluderGeometry, occluderMaterial)
  occluder.position.set(PLATE_SEAT_X, PLATE_SEAT_Y, 0)
  occluder.renderOrder = -1
  scene.add(occluder)

  const ship = createShip()
  // The ring's axis leans toward the viewer and up, so the ring reads as an open ellipse.
  const attitude = new THREE.Group()
  attitude.rotation.set(-1.0, 0.45, 0.15)
  attitude.add(ship.group)
  const carrier = new THREE.Group()
  carrier.add(attitude)
  scene.add(carrier)

  // Light: the disk, from the hole; a dim fill for the side turned away; starlight from above.
  const diskLight = new THREE.PointLight(0xffffff, 3.2, 0, 0)
  diskLight.position.set(PLATE_SEAT_X, PLATE_SEAT_Y, 0)
  const fill = new THREE.AmbientLight(0xffffff, 0.22)
  const starlight = new THREE.DirectionalLight(0xffffff, 0.55)
  starlight.position.set(-1, 2, 3)
  scene.add(diskLight, fill, starlight)
  const white = new THREE.Color(0xffffff)
  const ember = new THREE.Color(0xffc98a)

  const path = createOrbit({ rs: PLATE_RS, a: ORBIT.a, e: ORBIT.e, period: ORBIT.period })
  const reach = ORBIT.a * (1 + ORBIT.e)
  let spin = 0

  return {
    canvas: renderer.domElement,
    resize(width, height) {
      const aspect = width / Math.max(height, 1)
      camera.left = -aspect
      camera.right = aspect
      camera.top = 1
      camera.bottom = -1
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    },
    frame(dt, colour) {
      path.step(dt)
      spin += (dt / ORBIT.spin) * Math.PI * 2
      const { r, phi } = path.state
      const angle = phi + ORBIT.periapsisAt
      const across = r * Math.sin(angle)
      // Lower arc in front (z > 0), upper arc behind.
      const z = across * Math.sqrt(1 - ORBIT.open * ORBIT.open)
      carrier.position.set(PLATE_SEAT_X + r * Math.cos(angle), PLATE_SEAT_Y - across * ORBIT.open, z)
      // A touch of perspective in an orthographic frame: nearer reads a little larger.
      carrier.scale.setScalar(ORBIT.size * (1 + 0.14 * (z / reach)))
      // Behind the hole and close to the arc of the disk's far side, the arc's light lies
      // between the ship and the eye: the ship fades under it, and back as it comes out.
      const behind = THREE.MathUtils.smoothstep(-z, 0, r * 0.45)
      const offset = Math.hypot(carrier.position.x - PLATE_SEAT_X, carrier.position.y - PLATE_SEAT_Y)
      const nearArc = 1 - THREE.MathUtils.smoothstep(offset, HOLE_R * 1.4, HOLE_R * 3.2)
      renderer.domElement.style.opacity = (1 - 0.85 * behind * nearArc).toFixed(3)
      ship.ring.rotation.z = spin
      ship.setColour(colour)
      diskLight.color.lerpColors(white, ember, colour)
      renderer.render(scene, camera)
    },
    dispose() {
      ship.dispose()
      occluderGeometry.dispose()
      occluderMaterial.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
