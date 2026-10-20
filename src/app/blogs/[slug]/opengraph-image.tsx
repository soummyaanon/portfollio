import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ImageResponse } from 'next/og'

import { person } from '@/data/profile'
import { getAllBlogSlugs, getBlogPostBySlug } from '@/lib/blogs'

/**
 * Each post's link preview, drawn at build time in the site's own look: the graphite ground,
 * the bench rails with their rulers, the date in the label voice, the title in Figtree, a
 * two-line excerpt and the byline under a rail-to-rail line. Shared links to different posts
 * now look different, instead of every one carrying the homepage card.
 */

export const alt = 'Article preview'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const dynamic = 'force-static'

export async function generateStaticParams() {
  return (await getAllBlogSlugs()).map((slug) => ({ slug }))
}

const INK = '#fafafa'
const MUTED = '#8c8c8c'
const BORDER = '#27272a'
const GROUND = '#0b0d0e'
const RAIL = 28

const font = (file: string) => readFile(join(process.cwd(), 'src', 'assets', 'og', file))

/** One rail: a bordered strip with a ruler on its inner edge, a tick every 8px, long every 64px. */
function Rail({ side }: { readonly side: 'left' | 'right' }) {
  const ticks = Array.from({ length: Math.ceil(size.height / 8) }, (_, i) => i)
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [side]: 0,
        width: RAIL,
        display: 'flex',
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

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)
  const [light, bold, mono] = await Promise.all([font('Figtree-Light.ttf'), font('Figtree-Bold.ttf'), font('SpaceMono-Regular.ttf')])

  const date = new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  // Long titles step down a size so they still sit in three lines.
  const titleSize = post.title.length > 70 ? 54 : post.title.length > 45 ? 62 : 72
  const excerpt = post.excerpt.length > 150 ? `${post.excerpt.slice(0, 147).replace(/[\s.,;:—–-]+$/, '')}…` : post.excerpt

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: GROUND, color: INK, fontFamily: 'Figtree' }}>
        <Rail side="left" />
        <Rail side="right" />

        <div style={{ position: 'absolute', left: 96, right: 96, top: 84, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontFamily: 'Space Mono', fontSize: 17, letterSpacing: 4, color: MUTED, textTransform: 'uppercase' }}>
            {`Writing · ${date}`}
          </div>
          <div style={{ display: 'flex', marginTop: 30, fontSize: titleSize, fontWeight: 700, lineHeight: 1.04, letterSpacing: -1.5 }}>
            {post.title}
          </div>
          <div style={{ display: 'flex', marginTop: 28, width: 860, fontSize: 26, fontWeight: 300, lineHeight: 1.45, color: 'rgba(250,250,250,0.7)' }}>
            {excerpt}
          </div>
        </div>

        {/* The bench line, rail to rail, with a + where it meets each rail. */}
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
          <span style={{ color: INK }}>{person.name}</span>
          <span style={{ color: MUTED }}>soumyapanda.dev</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Figtree', data: light, weight: 300, style: 'normal' },
        { name: 'Figtree', data: bold, weight: 700, style: 'normal' },
        { name: 'Space Mono', data: mono, weight: 400, style: 'normal' },
      ],
    },
  )
}
