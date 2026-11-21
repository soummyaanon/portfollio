import { ImageResponse } from 'next/og'

import { person } from '@/data/profile'
import { dictionary } from '@/i18n/dictionaries'
import { BenchFooter, GROUND, INK, MUTED, OG_SIZE, ogFonts, ogImage, Rail } from '@/lib/og'

/**
 * The site's link preview: the name and the one-line pitch beside the hero's black hole.
 *
 * The frame is a still of the live SignalPlate (with the Endurance on its orbit), captured
 * from the page at 2.5× and cropped around the hole — the shader cannot run inside
 * `next/og`. The plate's ground is the card's ground, so the still has no visible edge. If
 * the hero changes, recapture `src/assets/og/gargantua.jpg` (1000×960) the same way.
 *
 * Every word on the card comes from the profile and the dictionary, so the card cannot drift
 * from the page the way the old hand-made PNG did. A route rather than a file in public/ for
 * that reason; it exports as `/og.png`.
 */

export const dynamic = 'force-static'

/** The still is 1000×960; drawn at 0.6 the hole sits level with the name. */
const FRAME = { width: 600, height: 576, left: 584, top: -16 }

export async function GET() {
  const frame = await ogImage('gargantua.jpg', 'image/jpeg')
  const pitch = dictionary('en').meta.homeDescription
  const [first, ...rest] = person.name.split(' ')

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: GROUND, color: INK, fontFamily: 'Figtree' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img> */}
        <img src={frame} alt="" width={FRAME.width} height={FRAME.height} style={{ position: 'absolute', left: FRAME.left, top: FRAME.top }} />
        {/* Fades the still's left edge into the ground, so stars never sit under the name. */}
        <div
          style={{
            position: 'absolute',
            left: FRAME.left,
            top: 0,
            width: 160,
            height: OG_SIZE.height,
            display: 'flex',
            backgroundImage: `linear-gradient(to right, ${GROUND}, rgba(11,13,14,0))`,
          }}
        />

        <Rail side="left" />
        <Rail side="right" />

        <div style={{ position: 'absolute', left: 96, top: 84, width: 520, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontFamily: 'Space Mono', fontSize: 17, letterSpacing: 4, color: MUTED, textTransform: 'uppercase' }}>
            {person.title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 30, fontSize: 84, fontWeight: 700, lineHeight: 0.98, letterSpacing: -2 }}>
            <span>{first}</span>
            <span>{rest.join(' ')}</span>
          </div>
          <div style={{ display: 'flex', marginTop: 32, fontSize: 26, fontWeight: 300, lineHeight: 1.45, color: 'rgba(250,250,250,0.7)' }}>
            {pitch}
          </div>
        </div>

        <BenchFooter />
      </div>
    ),
    { ...OG_SIZE, fonts: await ogFonts() },
  )
}
