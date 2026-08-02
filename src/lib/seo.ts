/**
 * JSON-LD builders, all derived from `src/data/profile.ts`.
 *
 * Entities are given stable `@id` values and reference each other by `@id` rather than
 * repeating themselves, so a crawler resolves one graph instead of several disconnected
 * copies of the same person. Only the homepage emits `Person` and `WebSite`; other routes
 * reference them.
 */

import { education, person, projects, roles, skills } from '@/data/profile'

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

function unique(values: readonly string[]): string[] {
  return values.filter((value, index, all) => all.indexOf(value) === index)
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * Employers and schools get their own `@id` so every reference to them across the graph
 * resolves to one node. An answer engine asked "where does he work" should find a single
 * organisation with a name, not three inline copies it has to guess are the same company.
 */
export function organisationId(name: string): string {
  return `${SITE_URL}/#org-${slug(name)}`
}

/** The roles whose employer is actually named, which are the only ones the graph can link. */
function named(all: typeof roles): typeof roles {
  return all.filter((role) => !role.withheld)
}

export function organisationSchemas(): JsonLd[] {
  // A withheld employer gets no node. The alternative is asserting an Organization called
  // "Undisclosed" into the graph, which is a claim about a company that does not exist —
  // structured data is read by machines that cannot tell a placeholder from a name.
  const employers = unique(named(roles).map((role) => role.org)).map((name) => ({
    '@type': 'Organization',
    '@id': organisationId(name),
    name,
  }))

  const schools = education.map((entry) => ({
    '@type': 'EducationalOrganization',
    '@id': organisationId(entry.institution),
    name: entry.institution,
  }))

  return [...employers, ...schools]
}

/**
 * Employment history as `OrganizationRole` nodes, which is the only shape in schema.org
 * that carries a role *and* its dates. Plain `worksFor: Organization` loses the timeline,
 * and the timeline is most of what anyone — person or model — wants from a CV.
 */
function employmentSchema(): JsonLd[] {
  return roles.map((role) => ({
    '@type': 'OrganizationRole',
    roleName: role.title,
    startDate: role.from,
    ...(role.until ? { endDate: role.until } : {}),
    ...(role.summary ? { description: role.summary } : {}),
    // The role, its dates and its description still stand; only the employer link drops. The
    // timeline is the part anyone actually wants from a CV, and it survives intact.
    ...(role.withheld ? {} : { worksFor: { '@id': organisationId(role.org) } }),
  }))
}

export function personSchema(description: string): JsonLd {
  const current = named(roles).filter((role) => role.until === null)

  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: person.name,
    givenName: person.givenName,
    familyName: person.familyName,
    jobTitle: person.title,
    // The same sentence the page leads with. Answer engines quote `description` verbatim
    // far more often than they synthesise one, so it is worth it being the good sentence.
    description,
    url: absoluteUrl('/'),
    mainEntityOfPage: { '@id': PROFILE_PAGE_ID },
    // Not absoluteUrl(): that appends the trailing slash every *page* URL here needs, and a
    // file is not a page — it would emit /avatar.jpg/ and resolve to nothing.
    image: `${SITE_URL}${person.avatar}`,
    sameAs: person.links.map((link) => link.url),
    address: {
      '@type': 'PostalAddress',
      addressCountry: person.location,
    },
    hasOccupation: {
      '@type': 'Occupation',
      name: person.title,
      // O*NET-SOC code for Software Developers — a stable identifier for the job itself,
      // rather than a job title string that every site spells differently.
      occupationalCategory: '15-1252.00',
      skills: unique(skills.flatMap((group) => [...group.items])),
    },
    knowsAbout: unique([
      ...person.focus,
      ...person.interests,
      ...skills.flatMap((group) => [...group.items]),
      ...roles.flatMap((role) => [...(role.stack ?? [])]),
    ]),
    hasCredential: education.map((entry) => ({
      '@type': 'EducationalOccupationalCredential',
      name: `${entry.credential}, ${entry.field}`,
      credentialCategory: 'degree',
      recognizedBy: { '@id': organisationId(entry.institution) },
    })),
    ...(current.length
      ? { worksFor: current.map((role) => ({ '@id': organisationId(role.org) })) }
      : {}),
    hasOccupationalExperience: employmentSchema(),
    alumniOf: education.map((entry) => ({ '@id': organisationId(entry.institution) })),
  }
}

export const PROFILE_PAGE_ID = `${SITE_URL}/#profilepage`

/**
 * The homepage is a profile page, and saying so explicitly is the single clearest signal
 * available: `mainEntity` names exactly which entity on the page the page is *about*, so a
 * crawler never has to infer it from a graph of a person, a site, and eight projects.
 */
export function profilePageSchema({
  description,
  dateModified,
}: {
  readonly description: string
  readonly dateModified: string
}): JsonLd {
  return {
    '@type': 'ProfilePage',
    '@id': PROFILE_PAGE_ID,
    url: absoluteUrl('/'),
    name: `${person.name} — ${person.title}`,
    description,
    inLanguage: 'en',
    dateModified,
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: { '@id': PERSON_ID },
    about: { '@id': PERSON_ID },
  }
}

/**
 * An explicit inventory of what a page lists. Retrieval systems match a query like "his
 * open source projects" against a named list far more readily than against eight sibling
 * nodes that merely happen to share a page.
 */
export function itemListSchema(
  id: string,
  name: string,
  items: readonly { readonly name: string; readonly url: string }[],
): JsonLd {
  return {
    '@type': 'ItemList',
    '@id': id,
    name,
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  }
}

/** A page whose purpose is to list things — /blogs and /projects. */
export function collectionPageSchema({
  path,
  name,
  description,
  listId,
}: {
  readonly path: string
  readonly name: string
  readonly description: string
  readonly listId: string
}): JsonLd {
  return {
    '@type': 'CollectionPage',
    '@id': `${absoluteUrl(path)}#page`,
    url: absoluteUrl(path),
    name,
    description,
    inLanguage: 'en',
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': PERSON_ID },
    mainEntity: { '@id': listId },
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
  readonly wordCount?: number
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
    inLanguage: 'en',
    isAccessibleForFree: true,
    about: { '@id': PERSON_ID },
    ...(post.tags?.length ? { keywords: [...post.tags] } : {}),
    ...(post.wordCount ? { wordCount: post.wordCount } : {}),
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
