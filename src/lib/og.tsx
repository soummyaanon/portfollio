import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { person } from '@/data/profile'

/**
 * The pieces every link-preview card shares — the homepage card, each post's and each
 * project's — so they read as one set: the graphite ground, the bench rails with their
 * rulers, the rail-to-rail line, and the byline under it. Drawn by `next/og` at build time.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const

export const INK = '#fafafa'
export const MUTED = '#8c8c8c'
export const BORDER = '#27272a'
/** The page's own ground, and the black hole plate's: a frame of it sits on this seamlessly. */
export const GROUND = '#0b0d0e'
export const RAIL = 28

const asset = (file: string) => readFile(join(process.cwd(), 'src', 'assets', 'og', file))

export async function ogFonts() {
  const [light, bold, mono] = await Promise.all([
    asset('Figtree-Light.ttf'),
    asset('Figtree-Bold.ttf'),
    asset('SpaceMono-Regular.ttf'),
  ])
  return [
    { name: 'Figtree', data: light, weight: 300 as const, style: 'normal' as const },
    { name: 'Figtree', data: bold, weight: 700 as const, style: 'normal' as const },
    { name: 'Space Mono', data: mono, weight: 400 as const, style: 'normal' as const },
  ]
}

/** An image from `src/assets/og`, as a data URL `<img>` can take inside ImageResponse. */
export async function ogImage(file: string, mime: 'image/jpeg' | 'image/png'): Promise<string> {
  return `data:${mime};base64,${(await asset(file)).toString('base64')}`
}

/** One rail: a bordered strip with a ruler on its inner edge, a tick every 8px, long every 64px. */
export function Rail({ side }: { readonly side: 'left' | 'right' }) {
  const ticks = Array.from({ length: Math.ceil(OG_SIZE.height / 8) }, (_, i) => i)
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [side]: 0,
        width: RAIL,
        display: 'flex',
        background: GROUND,
        borderLeft: `1px solid ${BORDER}`,
        borderRight: `1px solid ${BORDER}`,
      }}
    >
      {ticks.map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: i * 8,
            [side === 'left' ? 'right' : 'left']: 0,
            width: i % 8 === 0 ? 8 : 4,
            height: 1,
            background: 'rgba(255,255,255,0.32)',
          }}
        />
      ))}
    </div>
  )
}

/** The bench line, rail to rail, with a + where it meets each rail, and the byline beneath. */
export function BenchFooter({ left = person.name }: { readonly left?: string }) {
  return (
    // One box over the whole card rather than a fragment: next/og lays a fragment's children
    // out as siblings of its parent's flow, which drops the line and runs the byline together.
    <div style={{ position: 'absolute', top: 0, left: 0, width: OG_SIZE.width, height: OG_SIZE.height, display: 'flex' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 92, height: 1, background: BORDER, display: 'flex' }} />
      <div style={{ position: 'absolute', left: RAIL, bottom: 88, width: 1, height: 9, background: 'rgba(255,255,255,0.55)', display: 'flex' }} />
      <div style={{ position: 'absolute', right: RAIL, bottom: 88, width: 1, height: 9, background: 'rgba(255,255,255,0.55)', display: 'flex' }} />
      <div
        style={{
          position: 'absolute',
          left: 96,
          right: 96,
          bottom: 36,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'Space Mono',
          fontSize: 16,
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}
      >
        <span style={{ color: INK }}>{left}</span>
        <span style={{ color: MUTED }}>{new URL(person.site).host}</span>
      </div>
    </div>
  )
}

/** Trims to `max` characters on a word boundary, with an ellipsis, for a fixed-size card. */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 3).replace(/\s+\S*$/, '').replace(/[\s.,;:—–-]+$/, '')}…`
}
