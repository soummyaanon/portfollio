import * as THREE from 'three'

/**
 * Every material in the scene, in greys only. Instanced parts carry their state in the instance
 * colour instead of a real colour: red is the resting grey (0 black … 1 white) and green is the
 * white light the part gives off. One patched standard material per kind of part, so lighting
 * and reflections stay physical while each instance brightens on its own.
 */

export const grey = (value: number) => new THREE.Color().setScalar(value)

const toneAndGlow = (shader: THREE.WebGLProgramParametersWithUniforms) => {
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <color_fragment>', '#ifdef USE_COLOR\n\tdiffuseColor.rgb *= vColor.r;\n#endif')
    .replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n\ttotalEmissiveRadiance += vec3( vColor.g );\n#endif',
    )
}

/** A metal whose instances take their grey and their light from the instance colour. */
export function instancedMetal(options: { roughness: number; metalness: number; flat?: boolean }) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: options.roughness,
    metalness: options.metalness,
    flatShading: options.flat ?? false,
  })
  material.onBeforeCompile = toneAndGlow
  material.customProgramCacheKey = () => 'mono-instanced'
  return material
}

/**
 * The connections' metal. Each instance also carries `aSignal` (progress along the tube,
 * strength signed by direction, tube length): a white head runs along the tube with a trail
 * fading behind it, measured in world units so every tube shows the same comet.
 */
export function connectionMetal() {
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.9 })
  material.onBeforeCompile = (shader) => {
    toneAndGlow(shader)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aSignal;\nvarying vec3 vSignal;\nvarying float vAlong;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvSignal = aSignal;\n\tvAlong = position.y + 0.5;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSignal;\nvarying float vAlong;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
	float behind = ( vSignal.x - vAlong ) * vSignal.z * sign( vSignal.y );
	float head = exp( -behind * behind * 28.0 );
	float trail = behind > 0.0 ? exp( -behind * 3.2 ) * ( 1.0 - exp( -behind * behind * 60.0 ) ) : 0.0;
	float ends = smoothstep( 0.0, 0.08, vAlong ) * smoothstep( 1.0, 0.92, vAlong );
	totalEmissiveRadiance += vec3( abs( vSignal.y ) * ends * ( head * 1.9 + trail * 0.5 ) );`,
      )
  }
  material.customProgramCacheKey = () => 'mono-connection'
  return material
}

export function chrome() {
  return new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.2, metalness: 1 })
}

export function graphite() {
  return new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.42, metalness: 0.85 })
}

/** Frosted glass: a faint body with a strong reflection, drawn without writing depth. */
export function frostedGlass() {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.22,
    metalness: 0.1,
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
    flatShading: true,
  })
}

/** The inner sphere: white, lit from inside. `emissiveIntensity` is the pulse. */
export function lightCore() {
  return new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1, roughness: 0.5 })
}

/** A soft radial falloff in a small canvas, white on transparent, reaching zero before its edge. */
export function radialTexture(size = 128, falloff = 4.5) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const context = canvas.getContext('2d')!
  const image = context.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2)
      const value = r >= 1 ? 0 : Math.exp(-r * r * falloff) * (1 - r * r) ** 2
      const at = (y * size + x) * 4
      image.data[at] = image.data[at + 1] = image.data[at + 2] = 255
      image.data[at + 3] = Math.round(value * 255)
    }
  }
  context.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.NoColorSpace
  return texture
}

/**
 * Soft white halos for nodes and signals: one point per halo, sized in world units, added onto
 * what is behind. Each halo fades to nothing before the edge of its square.
 */
export function haloMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aAlpha;
      uniform float uScale;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        gl_PointSize = aAlpha > 0.003 ? aSize * uScale : 0.0;
      }`,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        float r = length( gl_PointCoord - 0.5 ) * 2.0;
        float fall = exp( -r * r * 5.0 ) * pow( max( 1.0 - r * r, 0.0 ), 2.0 );
        float light = fall * vAlpha;
        gl_FragColor = vec4( vec3( 1.0 ), light );
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}
