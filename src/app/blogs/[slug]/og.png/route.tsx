import { ImageResponse } from 'next/og'

import { getAllBlogSlugs, getBlogPostBySlug } from '@/lib/blogs'
import { BenchFooter, clip, GROUND, INK, MUTED, OG_SIZE, ogFonts, Rail } from '@/lib/og'

/**
 * Each post's link preview, drawn at build time in the site's own look: the graphite ground,
 * the bench rails with their rulers, the date in the label voice, the title in Figtree, a
 * two-line excerpt and the byline under a rail-to-rail line. Shared links to different posts
 * now look different, instead of every one carrying the homepage card.
 *
 * A route rather than the opengraph-image convention, so the exported file is `og.png`: with
 * an extension it skips the trailing-slash redirect and is served as image/png, which social
 * cards insist on.
 */

export const dynamic = 'force-static'

export async function generateStaticParams() {
  return (await getAllBlogSlugs()).map((slug) => ({ slug }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  const date = new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  // Long titles step down a size so they still sit in three lines.
  const titleSize = post.title.length > 70 ? 54 : post.title.length > 45 ? 62 : 72

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
            {clip(post.excerpt, 150)}
          </div>
        </div>

        <BenchFooter />
      </div>
    ),
    { ...OG_SIZE, fonts: await ogFonts() },
  )
}
