/**
 * A wide-tracked label sitting on a horizon: a hairline runs in from each side and fades
 * out before it reaches the label, so nothing is boxed and the rule reads as depth rather
 * than as a border.
 *
 * Centred, because the whole page is built on one vertical axis and a section marker
 * hanging off the left edge is the fastest way to break it. Every section uses this, which
 * is what lets the content beneath vary as much as it does — a ruled list, a catalogue, a
 * contribution grid — and still read as one document. Extracted rather than duplicated so
 * the horizon line cannot drift.
 *
 * Capped at the reading column, not the page: the head and the rows under it end at the
 * same x, which is the only thing making the pair read as one block rather than as a wide
 * rule that happens to have a list beneath it.
 */
export function SectionHead({
  label,
  note,
}: {
  readonly label: string
  readonly note?: string
}) {
  return (
    <div className="measure-column flex items-center gap-[clamp(0.875rem,2.5vw,2rem)]">
      <span aria-hidden className="rule-fade-r h-px flex-1" />

      <h2 className="field-label flex items-baseline gap-2.5 whitespace-nowrap tracking-[0.26em] text-muted-foreground">
        {label}
        {note && (
          <>
            <span aria-hidden className="h-2 w-px shrink-0 self-center bg-border" />
            <span className="text-foreground">{note}</span>
          </>
        )}
      </h2>

      <span aria-hidden className="rule-fade-l h-px flex-1" />
    </div>
  )
}
