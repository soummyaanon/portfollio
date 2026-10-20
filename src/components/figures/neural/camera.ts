import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * An orthographic camera locked to one pose: level with the sculpture's core, looking a few
 * degrees down. It only turns round the upright axis: on its own, slowly, so the front of the
 * sculpture moves to the right, and by dragging sideways. Tilt, pan and zoom are off, so the
 * figure always reads the same way, and a plain scroll over it still scrolls the page.
 */

export interface CameraRig {
  readonly camera: THREE.OrthographicCamera
  readonly controls: OrbitControls
  /** Fits the frame to a new canvas size. */
  resize(width: number, height: number): void
  /** Pixels per world unit, at the current zoom. */
  pixelsPerUnit(): number
  /**
   * Where the view should settle: the height on the sculpture's upright axis it looks at, and
   * the zoom. It eases there; `instant` jumps, for reduced motion.
   */
  setView(height: number, zoom: number, instant?: boolean): void
  /**
   * Turns the camera on by `dt` seconds of its own rotation (0 holds it still) and advances
   * the drag's damping; true while the view is still moving.
   */
  update(dt: number): boolean
  dispose(): void
}

/** About 7° above level: the rings read as thin ellipses, as in the reference view. */
const POLAR = Math.PI / 2 - 0.12
const AZIMUTH = 0.6
const DISTANCE = 40
/** Degrees per second it turns on its own: one turn in four minutes, a drift, not a spin. */
const TURN = 1.5

export function createCameraRig(element: HTMLElement, bounds: readonly THREE.Vector3[]): CameraRig {
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 120)
  camera.position.setFromSphericalCoords(DISTANCE, POLAR, AZIMUTH)
  camera.lookAt(0, 0, 0)

  const controls = new OrbitControls(camera, element)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.rotateSpeed = 0.55
  controls.enablePan = false
  controls.enableZoom = false
  controls.minPolarAngle = controls.maxPolarAngle = POLAR
  // OrbitControls turns at 2π / 60 per 60 s of `autoRotateSpeed`, so this is `TURN` °/s. A
  // positive speed swings the camera to its left, which turns the sculpture's front to the right.
  controls.autoRotateSpeed = TURN / 6
  controls.update()
  // Sideways drags turn the figure; vertical swipes on a phone still scroll the page.
  element.style.touchAction = 'pan-y'

  // The frame holds the sculpture at every angle of its turn, so nothing reframes as it spins.
  const fit = (aspect: number) => {
    const right = new THREE.Vector3()
    const up = new THREE.Vector3()
    const direction = new THREE.Vector3()
    let wide = 0
    let tall = 0
    for (let k = 0; k < 24; k++) {
      direction.setFromSphericalCoords(1, POLAR, (k / 24) * Math.PI * 2)
      right.crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize()
      up.crossVectors(direction, right).normalize()
      for (const point of bounds) {
        wide = Math.max(wide, Math.abs(point.dot(right)))
        tall = Math.max(tall, Math.abs(point.dot(up)))
      }
    }
    return 1.06 * Math.max(tall, wide / aspect)
  }

  let height = 1
  // The view eases toward these. Moving the target and the camera by the same step keeps the
  // orbit's angle, so the turn carries on undisturbed while the view travels.
  const view = { height: 0, zoom: 1, instant: false }
  let lookHeight = 0

  return {
    camera,
    controls,
    resize(width, h) {
      height = h
      const aspect = width / Math.max(h, 1)
      const half = fit(aspect)
      camera.left = -half * aspect
      camera.right = half * aspect
      camera.top = half
      camera.bottom = -half
      camera.updateProjectionMatrix()
    },
    pixelsPerUnit() {
      return (height / (camera.top - camera.bottom)) * camera.zoom
    },
    setView(h, zoom, instant = false) {
      view.height = h
      view.zoom = zoom
      view.instant = instant
    },
    update(dt) {
      controls.autoRotate = dt > 0
      const k = view.instant ? 1 : 1 - Math.exp(-(1 / 60) / 0.32)
      const step = (view.height - lookHeight) * k
      const travelling = Math.abs(view.height - lookHeight) > 1e-3 || Math.abs(view.zoom - camera.zoom) > 1e-3
      if (travelling) {
        lookHeight += step
        controls.target.y += step
        camera.position.y += step
        camera.zoom += (view.zoom - camera.zoom) * k
        camera.updateProjectionMatrix()
      }
      return controls.update(dt) || travelling
    },
    dispose() {
      controls.dispose()
    },
  }
}
