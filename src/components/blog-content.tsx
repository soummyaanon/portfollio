'use client'

import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

interface BlogContentProps {
  htmlContent: string
}

export function BlogContent({ htmlContent }: BlogContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize mermaid with black/white/orange theme
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#9b9494ff',
        primaryTextColor: '#000000',
        primaryBorderColor: '#f97316',
        lineColor: '#666666',
        secondaryColor: '#afa9a9ff',
        tertiaryColor: '#000000',
        background: '#000000',
        mainBkg: '#968f8fff',
        nodeBorder: '#f97316',
        clusterBkg: '#1a1a1a',
        clusterBorder: '#f97316',
        titleColor: '#afa7a7ff',
        edgeLabelBackground: '#000000',
        nodeTextColor: '#000000',
      },
      flowchart: {
        curve: 'basis',
        padding: 20,
      },
    })

    // Find all mermaid code blocks and render them
    const renderMermaidBlocks = async () => {
      const codeBlocks = containerRef.current?.querySelectorAll('pre code.language-mermaid, pre code.hljs.language-mermaid')
      
      if (!codeBlocks || codeBlocks.length === 0) return

      for (let i = 0; i < codeBlocks.length; i++) {
        const codeBlock = codeBlocks[i]
        const preElement = codeBlock.parentElement
        
        if (!preElement) continue

        const mermaidCode = codeBlock.textContent || ''
        
        try {
          const id = `mermaid-diagram-${i}-${Date.now()}`
          const { svg } = await mermaid.render(id, mermaidCode)
          
          // Create a container for the rendered diagram
          const diagramContainer = document.createElement('div')
          diagramContainer.className = 'mermaid-diagram my-8 p-6 rounded-lg bg-black border border-orange-500/50 overflow-x-auto'
          diagramContainer.innerHTML = svg
          
          // Replace the pre element with the diagram
          preElement.replaceWith(diagramContainer)
        } catch (error) {
          console.error('Failed to render mermaid diagram:', error)
          // Keep the original code block if rendering fails
        }
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(renderMermaidBlocks, 100)
    return () => clearTimeout(timer)
  }, [htmlContent])

  return (
    <div
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}

export default BlogContent
