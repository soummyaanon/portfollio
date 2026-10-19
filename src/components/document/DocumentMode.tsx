'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type DocumentMode = 'human' | 'machine'

interface DocumentModeValue {
  readonly mode: DocumentMode
  /**
   * False until the mode first changes. Lets entry animations tell a swap apart from the
   * initial page load, which must paint with everything already visible.
   */
  readonly swapped: boolean
  readonly setMode: (mode: DocumentMode) => void
  readonly toggle: () => void
}

const DocumentModeContext = createContext<DocumentModeValue | null>(null)

/**
 * Holds which rendering of the document is on screen.
 *
 * Default is `human`, which matters beyond taste: the homepage is prerendered at build
 * time, so whichever mode is default is the one that lands in the static HTML that search
 * engines and LLM crawlers read.
 */
export function DocumentModeProvider({ children }: { readonly children: React.ReactNode }) {
  const [mode, setModeState] = useState<DocumentMode>('human')
  const [swapped, setSwapped] = useState(false)

  const setMode = useCallback((next: DocumentMode) => {
    setSwapped(true)
    setModeState(next)
  }, [])

  const toggle = useCallback(() => {
    setSwapped(true)
    setModeState((current) => (current === 'human' ? 'machine' : 'human'))
  }, [])

  const value = useMemo(
    () => ({ mode, swapped, setMode, toggle }),
    [mode, swapped, setMode, toggle],
  )

  return <DocumentModeContext.Provider value={value}>{children}</DocumentModeContext.Provider>
}

export function useDocumentMode(): DocumentModeValue {
  const value = useContext(DocumentModeContext)
  if (!value) {
    throw new Error('useDocumentMode must be used inside a DocumentModeProvider')
  }
  return value
}
