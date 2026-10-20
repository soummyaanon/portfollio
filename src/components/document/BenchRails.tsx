/**
 * The two hatched rails that frame the page, like the side cheeks of a bench the sections are
 * mounted between. Pure decoration, so it is hidden from assistive tech and from the pointer.
 *
 * The left rail carries a carriage that rides down it as the page scrolls: a scroll-driven CSS
 * animation, so there is no listener and no per-frame work. Browsers without scroll timelines
 * leave it parked at the top, which still reads as a part on a rail.
 */
export function BenchRails() {
  return (
    <>
      <div aria-hidden className="bench-rail" data-side="left">
        <div className="bench-track">
          <div className="bench-carriage" />
        </div>
      </div>
      <div aria-hidden className="bench-rail" data-side="right" />
    </>
  )
}
