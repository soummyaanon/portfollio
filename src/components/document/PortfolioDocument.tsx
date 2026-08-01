'use client'

import { useEffect } from 'react'
import { LayoutGroup } from 'framer-motion'

import { DocumentModeProvider, useDocumentMode } from './DocumentMode'
import { HumanView } from './HumanView'
import { SpecimenSheet } from './SpecimenSheet'
import { ModeToggle } from './ModeToggle'
import type { PostSummary } from './types'

interface DocumentProps {
  readonly posts: readonly PostSummary[]
  readonly contributions?: React.ReactNode
}

function Surface({ posts, contributions }: DocumentProps) {
  const { mode, toggle } = useDocumentMode()

  // `m` flips the rendering. Guarded so it cannot fire while a field or a contenteditable
  // has focus, or alongside a modifier that means something else to the browser.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'm' && event.key !== 'M') return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      if (target?.isContentEditable) return
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

      event.preventDefault()
      toggle()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggle])

  /**
   * No AnimatePresence around the two views, and that is load-bearing. AnimatePresence keeps
   * the outgoing tree mounted while it exits, which would put two live elements on the same
   * `layoutId` and leave Framer with no single element to animate. Swapping outright means
   * the old facts unmount and the new ones mount in one commit, which is exactly the
   * condition shared-layout animation needs to move each value from where it was to where it
   * now belongs.
   */
  return (
    <LayoutGroup>
      <ModeToggle />
      {mode === 'human' ? (
        <HumanView posts={posts} contributions={contributions} />
      ) : (
        <SpecimenSheet posts={posts} />
      )}
    </LayoutGroup>
  )
}

export function PortfolioDocument(props: DocumentProps) {
  return (
    <DocumentModeProvider>
      <Surface {...props} />
    </DocumentModeProvider>
  )
}
