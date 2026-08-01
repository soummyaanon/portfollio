'use client'

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

interface MermaidDiagramProps {
  chart: string
  className?: string
}

export function MermaidDiagram({ chart, className = '' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      // The page has no hue, so neither do the diagrams. Nodes were outlined in orange
      // (#f97316) against a black cluster fill, which is now the only place a saturated
      // colour would survive. Greys are literal hex rather than var() because mermaid
      // writes these straight into SVG attributes, where a custom property will not
      // resolve. They track the light palette; the .dark overrides live in globals.css.
      themeVariables: {
        primaryColor: '#f4f4f6',
        primaryTextColor: '#1c1c20',
        primaryBorderColor: '#c3c3c9',
        lineColor: '#8a8a92',
        secondaryColor: '#ececed',
        tertiaryColor: '#f9f9fa',
        background: 'transparent',
        mainBkg: '#f4f4f6',
        nodeBorder: '#c3c3c9',
        clusterBkg: 'transparent',
        clusterBorder: '#d5d5da',
        titleColor: '#1c1c20',
        edgeLabelBackground: '#f9f9fa',
        nodeTextColor: '#1c1c20',
      },
      flowchart: {
        curve: 'basis',
        padding: 20,
      },
    })

    const renderDiagram = async () => {
      if (!containerRef.current) return
      
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaid.render(id, chart)
        setSvg(svg)
        setError(null)
      } catch (err) {
        console.error('Mermaid rendering error:', err)
        setError('Failed to render diagram')
      }
    }

    renderDiagram()
  }, [chart])

  if (error) {
    return (
      <div className={`mermaid-error ${className}`}>
        <pre>{chart}</pre>
        <p className="text-red-500 text-sm mt-2">{error}</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`mermaid-diagram ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export default MermaidDiagram
