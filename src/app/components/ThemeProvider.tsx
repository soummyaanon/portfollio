'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'
import type { ReactNode } from 'react'

/**
 * Props for ThemeProvider component
 * Extends next-themes ThemeProviderProps for full compatibility
 */
interface Props extends Omit<ThemeProviderProps, 'children'> {
  readonly children: ReactNode
}

/**
 * Theme provider wrapper component
 * Provides theme context to the entire application
 * 
 * @example
 * ```tsx
 * <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children, ...props }: Props) {
  return (
    <NextThemesProvider {...props}>
      {children}
    </NextThemesProvider>
  )
}
