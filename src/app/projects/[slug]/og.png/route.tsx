import { ImageResponse } from 'next/og'

import { projects } from '@/data/profile'
import { BenchFooter, clip, GROUND, INK, MUTED, OG_SIZE, ogFonts, Rail } from '@/lib/og'

/**
 * Each project's link preview, in the same set as the posts' cards: the status and host in
 * the label voice, the name large, the tagline, and the summary. A shared project link now
 * unfurls as that project instead of as the portfolio.
 */

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.id }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = projects.find((candidate) => candidate.id === slug)
  if (!project) return new Response('Not found', { status: 404 })

  const label = `Project · ${project.status === 'live' ? 'Live' : 'In development'} · ${new URL(project.url).host}`
  const nameSize = project.name.length > 16 ? 76 : 96

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: GROUND, color: INK, fontFamily: 'Figtree' }}>
        <Rail side="left" />
        <Rail side="right" />

        <div style={{ position: 'absolute', left: 96, right: 96, top: 84, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontFamily: 'Space Mono', fontSize: 17, letterSpacing: 4, color: MUTED, textTransform: 'uppercase' }}>
            {label}
          </div>
          <div style={{ display: 'flex', marginTop: 28, fontSize: nameSize, fontWeight: 700, lineHeight: 1, letterSpacing: -2 }}>
            {project.name}
          </div>
          <div style={{ display: 'flex', marginTop: 18, fontSize: 32, fontWeight: 300, lineHeight: 1.25, color: INK }}>
            {project.tagline}
          </div>
          <div style={{ display: 'flex', marginTop: 26, width: 900, fontSize: 24, fontWeight: 300, lineHeight: 1.45, color: 'rgba(250,250,250,0.62)' }}>
            {clip(project.summary, 170)}
          </div>
        </div>

        <BenchFooter />
      </div>
    ),
    { ...OG_SIZE, fonts: await ogFonts() },
  )
}
