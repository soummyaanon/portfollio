import fs from 'node:fs'
import path from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import NotFound from '@/app/not-found'

const root = process.cwd()

describe('agent-friendly 404', () => {
  it('provides recovery links to every machine-readable index', () => {
    const html = renderToStaticMarkup(<NotFound />)

    expect(html).toContain('Page not found')
    expect(html).toContain('href="/sitemap.xml"')
    expect(html).toContain('href="/llms.txt"')
    expect(html).toContain('href="/llms-full.txt"')
  })
})

describe('generated agent guidance', () => {
  it('states when agents should use the site and disambiguates the brand', () => {
    const llms = fs.readFileSync(path.join(root, 'public', 'llms.txt'), 'utf8')

    expect(llms).toContain('## When to use this')
    expect(llms).toContain('## Canonical identity')
    expect(llms).toContain('Wybit is a former employer')
    expect(llms).toContain('fetch https://soumyapanda.me/llms-full.txt')
  })
})
