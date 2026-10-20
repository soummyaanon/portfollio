'use client'

import * as React from 'react'

/**
 * A neural network as a monochrome sculpture in real 3D. Three.js and the scene load only when
 * the figure comes within a screen of the viewport, and there is no visible interface: the
 * canvas takes every pointer and key itself.
 *
 * The sculpture stands upright and turns slowly to the right on its own; drag sideways to spin
 * it (plain scrolling still scrolls the page). Hover a node to trace its connections, click it
 * to pin them and fire it, click the core to send a wave through the network. P or Space
 * pauses, Enter sends a wave, Esc lets go of a pinned node.
 */
export function NeuralNetwork() {
  const host = React.useRef<HTMLDivElement>(null)
  const [failed, setFailed] = React.useState(false)

  // One effect for the scene's whole life: wait until it is near, load, mount, and tear it all
  // down on unmount. Nothing it does re-renders React.
  React.useEffect(() => {
    const node = host.current
    if (!node) return
    let cancelled = false
    let cleanup: (() => void) | null = null

    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        near.disconnect()
        import('./scene')
          .then(({ createNeuralScene }) => {
            if (!cancelled) cleanup = mount(createNeuralScene, node)
          })
          .catch((error) => {
            console.warn('3D network unavailable:', error)
            if (!cancelled) setFailed(true)
          })
      },
      { rootMargin: '100% 0px' },
    )
    near.observe(node)

    function mount(createNeuralScene: typeof import('./scene').createNeuralScene, container: HTMLDivElement) {
      const small = container.clientWidth < 640
      const view = createNeuralScene(container, { small })
      const canvas = view.canvas
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
      let paused = reduced.matches

      const resizer = new ResizeObserver(() => {
        view.resize(container.clientWidth, container.clientHeight)
        wake()
      })
      resizer.observe(container)

      const toDevice = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect()
        return { x: ((event.clientX - rect.left) / rect.width) * 2 - 1, y: -((event.clientY - rect.top) / rect.height) * 2 + 1 }
      }
      let dragging = false
      const move = (event: PointerEvent) => {
        if (event.pointerType === 'touch' && dragging) return wake()
        const over = view.point(toDevice(event))
        canvas.style.cursor = dragging ? 'grabbing' : over ? 'pointer' : 'grab'
        wake()
      }
      const leave = () => {
        view.point(null)
        canvas.style.cursor = 'grab'
        wake()
      }
      let down: { x: number; y: number; t: number } | null = null
      const press = (event: PointerEvent) => {
        down = { x: event.clientX, y: event.clientY, t: performance.now() }
        dragging = true
        view.point(toDevice(event))
        wake()
      }
      const release = (event: PointerEvent) => {
        dragging = false
        if (!down) return
        const still = Math.hypot(event.clientX - down.x, event.clientY - down.y) < 5 && performance.now() - down.t < 450
        down = null
        if (!still) return
        view.point(toDevice(event))
        view.press()
        if (event.pointerType === 'touch') view.point(null)
        wake()
      }
      canvas.addEventListener('pointermove', move)
      canvas.addEventListener('pointerleave', leave)
      canvas.addEventListener('pointerdown', press)
      window.addEventListener('pointerup', release)

      const key = (event: KeyboardEvent) => {
        const k = event.key.toLowerCase()
        if (k === 'escape') view.clear()
        else if (k === 'p' || k === ' ') paused = !paused
        else if (k === 'enter') view.wave()
        else return
        event.preventDefault()
        wake()
      }
      container.addEventListener('keydown', key)
      const motion = () => {
        paused = reduced.matches
        wake()
      }
      reduced.addEventListener('change', motion)

      // ── The one loop: runs while the figure is on screen and something is moving ──────
      let visible = true
      const watcher = new IntersectionObserver((entries) => {
        visible = Boolean(entries.at(-1)?.isIntersecting)
        if (visible) wake()
      })
      watcher.observe(container)
      let frame = 0
      let last = 0
      const tick = (now: number) => {
        const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60
        last = now
        const active = view.frame(paused ? 0 : dt)
        frame = visible && (active || !paused) ? requestAnimationFrame(tick) : 0
        if (!frame) last = 0
      }
      function wake() {
        if (!frame && visible) frame = requestAnimationFrame(tick)
      }
      view.resize(container.clientWidth, container.clientHeight)
      wake()

      const lost = (event: Event) => event.preventDefault()
      canvas.addEventListener('webglcontextlost', lost)

      return () => {
        cancelAnimationFrame(frame)
        frame = 0
        watcher.disconnect()
        resizer.disconnect()
        reduced.removeEventListener('change', motion)
        container.removeEventListener('keydown', key)
        canvas.removeEventListener('pointermove', move)
        canvas.removeEventListener('pointerleave', leave)
        canvas.removeEventListener('pointerdown', press)
        window.removeEventListener('pointerup', release)
        canvas.removeEventListener('webglcontextlost', lost)
        view.dispose()
      }
    }

    return () => {
      cancelled = true
      near.disconnect()
      cleanup?.()
    }
  }, [])

  return (
    <div
      ref={host}
      className="nn-host"
      tabIndex={0}
      role="application"
      aria-roledescription="3D scene"
      aria-label="A neural network as a monochrome sculpture in 3D: inputs on a wide ring, two processing stages, a glass core with orbital rings, and outputs on a narrow ring. Signals run through it continuously. It turns slowly on its own; drag sideways to spin it. Hover a node to trace its connections, click it to pin them, click the core to send a wave. P pauses, Enter sends a wave, Escape lets go of a pinned node."
    >
      {failed ? <p className="nn-note">This figure needs WebGL, which this browser has turned off.</p> : null}
    </div>
  )
}
