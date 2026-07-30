/**
 * A small wide-tracked label, a hairline to the end of the measure, and an optional count.
 *
 * Every section on the site uses this, which is what lets the content beneath vary as much
 * as it does — a ruled list, a catalogue, a contribution grid — and still read as one
 * document. Extracted rather than duplicated so the horizon line cannot drift.
 */
export function SectionHead({
  label,
  note,
}: {
  readonly label: string
  readonly note?: string
}) {
  return (
    <div className="flex items-baseline gap-4">
      <h2 className="text-caption uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
        {label}
      </h2>
      <span aria-hidden className="h-px flex-1 bg-border" />
      {note && (
        <span className="text-caption tabular-nums text-muted-foreground whitespace-nowrap">
          {note}
        </span>
      )}
    </div>
  )
}
