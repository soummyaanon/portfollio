// Zoom + pan for rendered mermaid diagrams.
//
// The diagrams are vanilla SVG injected via innerHTML (not React components),
// so the blog renderer wires this up imperatively after each render. Returns a
// cleanup function that detaches the document/window listeners.

const MIN_SCALE = 1
const MAX_SCALE = 5
const STEP = 1.4

const ICONS = {
  zoomIn:
    '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/>',
  zoomOut:
    '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><line x1="8" x2="14" y1="11" y2="11"/>',
  reset:
    '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  expand:
    '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  shrink:
    '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
}

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => void
}
type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => void
  webkitFullscreenElement?: Element | null
}

function svgIcon(paths: string): string {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export function attachZoom(figure: HTMLElement): () => void {
  const svg = figure.querySelector('svg')
  if (!svg) return () => {}

  // Restructure: figure > [viewport > stage > svg, controls]
  const viewport = document.createElement('div')
  viewport.className = 'mermaid-viewport'
  const stage = document.createElement('div')
  stage.className = 'mermaid-stage'
  stage.appendChild(svg)
  viewport.appendChild(stage)

  const controls = document.createElement('div')
  controls.className = 'mermaid-controls'
  const makeButton = (label: string, paths: string) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'mermaid-control'
    button.setAttribute('aria-label', label)
    button.innerHTML = svgIcon(paths)
    controls.appendChild(button)
    return button
  }
  const outButton = makeButton('Zoom out', ICONS.zoomOut)
  const resetButton = makeButton('Reset zoom', ICONS.reset)
  const inButton = makeButton('Zoom in', ICONS.zoomIn)

  const doc = document as FullscreenDocument
  const fsSupported =
    !!figure.requestFullscreen ||
    !!(figure as FullscreenElement).webkitRequestFullscreen
  const fsButton = fsSupported
    ? makeButton('Fullscreen', ICONS.expand)
    : null

  figure.replaceChildren(viewport, controls)

  const state = { scale: 1, tx: 0, ty: 0 }
  let applied = 1 // scale currently reflected in the DOM transform
  let dragging = false
  let lastX = 0
  let lastY = 0

  const baseSize = () => {
    const rect = svg.getBoundingClientRect()
    return { w: rect.width / applied, h: rect.height / applied }
  }

  const apply = () => {
    const { w, h } = baseSize()
    const vw = viewport.clientWidth
    const vh = viewport.clientHeight
    const cw = w * state.scale
    const ch = h * state.scale

    state.tx = cw <= vw ? (vw - cw) / 2 : clamp(state.tx, vw - cw, 0)
    state.ty = ch <= vh ? (vh - ch) / 2 : clamp(state.ty, vh - ch, 0)

    stage.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`
    applied = state.scale

    const zoomed = state.scale > 1.001
    viewport.style.cursor = zoomed ? (dragging ? 'grabbing' : 'grab') : 'default'
    viewport.style.touchAction = zoomed ? 'none' : 'auto'
    resetButton.disabled = !zoomed
    outButton.disabled = state.scale <= MIN_SCALE + 0.001
    inButton.disabled = state.scale >= MAX_SCALE - 0.001
  }

  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const rect = viewport.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top
    const next = clamp(state.scale * factor, MIN_SCALE, MAX_SCALE)
    const ratio = next / state.scale
    state.tx = px - (px - state.tx) * ratio
    state.ty = py - (py - state.ty) * ratio
    state.scale = next
    apply()
  }

  const zoomFromCenter = (factor: number) => {
    const rect = viewport.getBoundingClientRect()
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor)
  }

  const reset = () => {
    state.scale = 1
    state.tx = 0
    state.ty = 0
    apply()
  }

  inButton.addEventListener('click', () => zoomFromCenter(STEP))
  outButton.addEventListener('click', () => zoomFromCenter(1 / STEP))
  resetButton.addEventListener('click', reset)

  const onWheel = (event: WheelEvent) => {
    // Only hijack the wheel for an explicit zoom gesture (trackpad pinch sends
    // ctrlKey); otherwise let the page scroll normally.
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.1 : 1 / 1.1)
  }
  viewport.addEventListener('wheel', onWheel, { passive: false })

  const onPointerDown = (event: PointerEvent) => {
    if (state.scale <= 1.001) return
    dragging = true
    lastX = event.clientX
    lastY = event.clientY
    stage.classList.add('is-panning')
    try {
      viewport.setPointerCapture(event.pointerId)
    } catch {
      /* capture is best-effort */
    }
    apply()
  }
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return
    state.tx += event.clientX - lastX
    state.ty += event.clientY - lastY
    lastX = event.clientX
    lastY = event.clientY
    apply()
  }
  const onPointerUp = (event: PointerEvent) => {
    if (!dragging) return
    dragging = false
    stage.classList.remove('is-panning')
    try {
      viewport.releasePointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }
    apply()
  }
  viewport.addEventListener('pointerdown', onPointerDown)
  viewport.addEventListener('pointermove', onPointerMove)
  viewport.addEventListener('pointerup', onPointerUp)
  viewport.addEventListener('pointercancel', onPointerUp)

  const onDblClick = (event: MouseEvent) => {
    event.preventDefault()
    if (state.scale > 1.001) reset()
    else zoomAt(event.clientX, event.clientY, 2)
  }
  viewport.addEventListener('dblclick', onDblClick)

  const onFullscreenChange = () => {
    const active =
      (doc.fullscreenElement ?? doc.webkitFullscreenElement) === figure
    figure.classList.toggle('is-fullscreen', active)
    if (fsButton) {
      fsButton.innerHTML = svgIcon(active ? ICONS.shrink : ICONS.expand)
      fsButton.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Fullscreen')
    }
    reset()
    requestAnimationFrame(apply)
  }
  if (fsButton) {
    fsButton.addEventListener('click', () => {
      const active =
        (doc.fullscreenElement ?? doc.webkitFullscreenElement) === figure
      if (active) {
        ;(doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc)
      } else {
        const el = figure as FullscreenElement
        ;(el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el)
      }
    })
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('webkitfullscreenchange', onFullscreenChange)
  }

  const onResize = () => apply()
  window.addEventListener('resize', onResize)

  // Skip the transition on the very first placement so it doesn't slide in.
  stage.style.transition = 'none'
  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(() => {
      stage.style.transition = ''
    })
  })

  return () => {
    window.removeEventListener('resize', onResize)
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
  }
}
