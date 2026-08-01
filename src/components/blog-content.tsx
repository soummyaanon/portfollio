'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import mermaid from 'mermaid'
import { attachZoom } from '@/lib/mermaid-zoom'

interface BlogContentProps {
  htmlContent: string
}

/**
 * Renders blog HTML and upgrades ```mermaid code blocks into live, theme-aware
 * SVG diagrams. The diagrams are transparent (no card chrome), inherit the
 * site's design tokens, and re-render when the color theme changes.
 */
export function BlogContent({ htmlContent }: BlogContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const hasAnimatedRef = useRef(false)
  const renderSeqRef = useRef(0)
  const zoomCleanupsRef = useRef<Array<() => void>>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false

    // Mermaid's color engine (khroma) can't parse oklch(), which is what this
    // project's CSS variables use. Paint each token onto a 1px canvas and read
    // the pixel back as an rgb() string mermaid understands. Falls back to a
    // hand-tuned palette if a browser can't parse the value.
    const resolveTokens = () => {
      const rootStyle = getComputedStyle(document.documentElement)
      const isDark = document.documentElement.classList.contains('dark')
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      const resolve = (name: string, fallback: string) => {
        const raw = rootStyle.getPropertyValue(name).trim()
        if (!ctx || !raw) return fallback
        try {
          ctx.fillStyle = '#000000'
          ctx.fillStyle = raw
          ctx.fillRect(0, 0, 1, 1)
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
          return `rgb(${r}, ${g}, ${b})`
        } catch {
          return fallback
        }
      }

      return {
        background: resolve('--background', isDark ? 'rgb(24, 23, 28)' : 'rgb(255, 255, 255)'),
        foreground: resolve('--foreground', isDark ? 'rgb(206, 206, 206)' : 'rgb(33, 33, 38)'),
        muted: resolve('--muted', isDark ? 'rgb(40, 40, 40)' : 'rgb(243, 243, 245)'),
        mutedForeground: resolve('--muted-foreground', isDark ? 'rgb(150, 150, 150)' : 'rgb(110, 110, 120)'),
        border: resolve('--border', isDark ? 'rgb(56, 56, 56)' : 'rgb(232, 232, 235)'),
      }
    }

    const renderDiagrams = async () => {
      // Promote raw mermaid code blocks into <figure>s that keep their source,
      // so we can re-render them later (theme change) without losing the code.
      container
        .querySelectorAll<HTMLElement>('pre > code.language-mermaid')
        .forEach((code) => {
          const pre = code.parentElement
          if (!pre) return
          const figure = document.createElement('figure')
          figure.className = 'mermaid-figure'
          figure.dataset.src = code.textContent || ''
          pre.replaceWith(figure)
        })

      const figures = Array.from(
        container.querySelectorAll<HTMLElement>('figure.mermaid-figure[data-src]')
      )
      if (figures.length === 0) return

      const t = resolveTokens()

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'base',
        // Must match what globals.css paints diagram labels in, or mermaid lays the text
        // out in one face and the browser renders it in another — boxes sized for the
        // wrong string. Chakra Petch was named here long after it stopped being loaded.
        fontFamily: "'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
        themeVariables: {
          background: 'transparent',
          mainBkg: t.muted,
          primaryColor: t.muted,
          primaryBorderColor: t.border,
          primaryTextColor: t.foreground,
          secondaryColor: t.muted,
          tertiaryColor: 'transparent',
          nodeBorder: t.border,
          nodeTextColor: t.foreground,
          textColor: t.foreground,
          lineColor: t.mutedForeground,
          clusterBkg: 'transparent',
          clusterBorder: t.border,
          titleColor: t.mutedForeground,
          edgeLabelBackground: t.background,
          fontSize: '14px',
        },
        flowchart: {
          curve: 'basis',
          padding: 18,
          htmlLabels: true,
          useMaxWidth: false,
        },
      })

      const seq = renderSeqRef.current++
      for (let i = 0; i < figures.length; i++) {
        const figure = figures[i]
        const src = figure.dataset.src || ''
        if (!src.trim()) continue
        try {
          const { svg } = await mermaid.render(`mmd-${seq}-${i}`, src)
          if (cancelled) return
          figure.innerHTML = svg
          zoomCleanupsRef.current.push(attachZoom(figure))
        } catch (error) {
          // On failure, leave the prior rendering / source untouched.
          console.error('Mermaid render failed:', error)
        }
      }

      if (cancelled) return

      // Entrance plays exactly once. We strip the class afterwards so toggling
      // the theme swaps diagram colors instantly without replaying the reveal.
      if (hasAnimatedRef.current) {
        figures.forEach((f) => f.classList.remove('mermaid-figure--enter'))
      } else {
        figures.forEach((f) => f.classList.add('mermaid-figure--enter'))
        hasAnimatedRef.current = true
        setTimeout(() => {
          figures.forEach((f) => f.classList.remove('mermaid-figure--enter'))
        }, 1200)
      }
    }

    const timer = setTimeout(renderDiagrams, 80)
    return () => {
      cancelled = true
      clearTimeout(timer)
      zoomCleanupsRef.current.forEach((dispose) => dispose())
      zoomCleanupsRef.current = []
    }
  }, [htmlContent, resolvedTheme])

  return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: htmlContent }} />
}

export default BlogContent
