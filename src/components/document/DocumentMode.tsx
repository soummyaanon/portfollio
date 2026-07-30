'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type DocumentMode = 'human' | 'machine'

interface DocumentModeValue {
  readonly mode: DocumentMode
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
  const [mode, setMode] = useState<DocumentMode>('human')

  const toggle = useCallback(() => {
    setMode((current) => (current === 'human' ? 'machine' : 'human'))
  }, [])

  const value = useMemo(() => ({ mode, setMode, toggle }), [mode, toggle])

  return <DocumentModeContext.Provider value={value}>{children}</DocumentModeContext.Provider>
}

export function useDocumentMode(): DocumentModeValue {
  const value = useContext(DocumentModeContext)
  if (!value) {
    throw new Error('useDocumentMode must be used inside a DocumentModeProvider')
  }
  return value
}
