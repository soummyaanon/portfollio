/**
 * JSON-LD builders, all derived from `src/data/profile.ts`.
 *
 * Entities are given stable `@id` values and reference each other by `@id` rather than
 * repeating themselves, so a crawler resolves one graph instead of several disconnected
 * copies of the same person. Only the homepage emits `Person` and `WebSite`; other routes
 * reference them.
 */

import { education, person, projects, roles } from '@/data/profile'

export const SITE_URL = 'https://soumyapanda.me'

/** `trailingSlash: true` in next.config.ts, so internal URLs must end in a slash. */
export function absoluteUrl(path = '/'): string {
  const normalised = path.startsWith('/') ? path : `/${path}`
  const withSlash = normalised.endsWith('/') ? normalised : `${normalised}/`
  return `${SITE_URL}${withSlash === '//' ? '/' : withSlash}`
}

export const PERSON_ID = `${SITE_URL}/#person`
export const WEBSITE_ID = `${SITE_URL}/#website`

type JsonLd = Record<string, unknown>

export function personSchema(): JsonLd {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: person.name,
    givenName: person.givenName,
    familyName: person.familyName,
    jobTitle: person.title,
    url: absoluteUrl('/'),
    image: person.avatar,
    sameAs: person.links.map((link) => link.url),
    knowsAbout: [
      ...person.focus,
      ...roles.flatMap((role) => role.stack),
    ].filter((value, index, all) => all.indexOf(value) === index),
    worksFor: roles
      .filter((role) => role.until === null)
      .map((role) => ({ '@type': 'Organization', name: role.org })),
    alumniOf: education.map((entry) => ({
      '@type': 'EducationalOrganization',
      name: entry.institution,
    })),
  }
}

export function websiteSchema(description: string): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: absoluteUrl('/'),
    name: `${person.name} — ${person.title}`,
    description,
    inLanguage: 'en',
    publisher: { '@id': PERSON_ID },
  }
}

/** Projects are shipped web apps, so `WebApplication` rather than `CreativeWork`. */
export function projectSchema(project: (typeof projects)[number]): JsonLd {
  return {
    '@type': 'WebApplication',
    '@id': `${absoluteUrl('/projects/')}#${project.id}`,
    name: project.name,
    description: project.summary,
    url: project.url,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    featureList: [...project.capabilities],
    author: { '@id': PERSON_ID },
    ...(project.image ? { image: `${SITE_URL}${project.image}` } : {}),
  }
}

export interface BlogPostingInput {
  readonly title: string
  readonly excerpt: string
  readonly date: string
  readonly slug: string
  readonly tags?: readonly string[]
}

export function blogPostingSchema(post: BlogPostingInput): JsonLd {
  const url = absoluteUrl(`/blogs/${post.slug}/`)

  return {
    '@type': 'BlogPosting',
    '@id': `${url}#post`,
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    url,
    mainEntityOfPage: url,
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
    isPartOf: { '@id': WEBSITE_ID },
    ...(post.tags?.length ? { keywords: [...post.tags] } : {}),
  }
}

export interface Crumb {
  readonly name: string
  readonly path: string
}

/**
 * Per-route breadcrumbs. Replaces the single hardcoded Home→Blog trail that was
 * previously emitted on every page including routes that are not under /blogs.
 */
export function breadcrumbSchema(crumbs: readonly Crumb[]): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }
}

/**
 * Wraps entities into one `@graph` document. One script tag per page, one graph,
 * cross-referenced by `@id`.
 */
export function graph(...entities: JsonLd[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': entities,
  })
}
