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
      themeVariables: {
        primaryColor: '#ffffff',
        primaryTextColor: '#000000',
        primaryBorderColor: '#f97316',
        lineColor: '#666666',
        secondaryColor: '#f5f5f5',
        tertiaryColor: '#000000',
        background: '#000000',
        mainBkg: '#ffffff',
        nodeBorder: '#f97316',
        clusterBkg: '#1a1a1a',
        clusterBorder: '#f97316',
        titleColor: '#ffffff',
        edgeLabelBackground: '#000000',
        nodeTextColor: '#000000',
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
