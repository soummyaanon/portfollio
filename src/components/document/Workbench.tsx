'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'


export interface WorkbenchSlide {
  readonly id: string
  readonly name: string
  readonly tagline: string
  readonly url: string
  readonly linkLabel: string
  /** The isometric figure, built on the server. */
  readonly figure: React.ReactNode
}

/**
 * The closing section: one drawn figure per project, shown one at a time on a plate between
 * the rails. Slides that are not showing stay mounted but hidden, so their loops stop (they
 * are out of view) and come back where they were.
 */
export function Workbench({ slides }: { readonly slides: readonly WorkbenchSlide[] }) {
  const [current, setCurrent] = useState(0)
  if (slides.length === 0) return null

  const many = slides.length > 1
  const go = (step: number) => setCurrent((at) => (at + step + slides.length) % slides.length)

  return (
    <section className="mt-[var(--space-section)]" aria-roledescription="carousel" aria-label="Figures">
      <div>
        <div
          className="iso workbench"
          onKeyDown={(event) => {
            if (!many) return
            if (event.key === 'ArrowLeft') go(-1)
            if (event.key === 'ArrowRight') go(1)
          }}
        >
          <div className="iso-plate">
            {slides.map((entry, at) => (
              <div key={entry.id} hidden={at !== current} aria-roledescription="slide" aria-label={`${at + 1} of ${slides.length}: ${entry.name}`}>
                {entry.figure}
              </div>
            ))}
          </div>
        </div>

        {many && (
          <div className="mt-[var(--space-tight)] flex justify-end gap-1">
            <button type="button" className="workbench-step" aria-label="Previous figure" onClick={() => go(-1)}>
              <ArrowLeft aria-hidden className="size-3.5" />
            </button>
            <button type="button" className="workbench-step" aria-label="Next figure" onClick={() => go(1)}>
              <ArrowRight aria-hidden className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
