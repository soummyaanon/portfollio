'use client'

import { useId, useState } from 'react'

/**
 * A row that shows only its essentials until asked.
 *
 * Serves minimalism and interactivity with one mechanism: at rest the page is a clean index
 * of names and dates, and the prose only exists once you want it. That is cheaper visually
 * than showing everything and dimming most of it.
 *
 * The open/close animation interpolates `grid-template-rows` between 0fr and 1fr rather than
 * animating height, so the content can size itself and there is no measured pixel value to go
 * stale on resize or font load.
 */
export function Disclosure({
  summary,
  children,
  className,
}: {
  /** Always-visible content. Receives the open state so it can render its own affordance. */
  readonly summary: (open: boolean) => React.ReactNode
  readonly children: React.ReactNode
  readonly className?: string
}) {
  const [open, setOpen] = useState(false)
  const contentId = useId()

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={contentId}
        className="group w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
      >
        {summary(open)}
      </button>

      <div
        id={contentId}
        className="grid transition-[grid-template-rows] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        {/* The inner wrapper is what actually clips; the grid row is what animates. */}
        <div className="overflow-hidden">
          <div
            className={`transition-opacity duration-300 motion-reduce:transition-none ${
              open ? 'opacity-100 delay-100' : 'opacity-0'
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The open/closed affordance: a plus that becomes a minus. Two rules, not an icon font, and
 * it rotates rather than swapping glyphs so the state change is continuous.
 */
export function DisclosureMark({ open }: { readonly open: boolean }) {
  return (
    <span
      aria-hidden
      className="relative mt-[0.6em] block size-2.5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-signal"
    >
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
      <span
        className={`absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          open ? 'rotate-90' : ''
        }`}
      />
    </span>
  )
}
