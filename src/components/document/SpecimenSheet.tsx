'use client'

import { useCallback, useState } from 'react'
import { Check, Copy } from 'lucide-react'

import { education, person, projects, roles, skills, now } from '@/data/profile'
import { Connective, Fact } from './Fact'
import type { PostSummary } from './types'

/**
 * The machine rendering: the same facts as a catalogue card rather than a terminal.
 *
 * Explicitly not a hacker aesthetic. No green, no scanlines, no glitch — it uses the exact
 * palette the human view uses, because the claim is that these are one document, and two
 * different colour schemes would undercut that. Monospace appears here and nowhere else on
 * the site, since here the content genuinely is tabular.
 */

function FieldRow({
  name,
  children,
}: {
  readonly name: string
  readonly children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-x-4 py-[0.2rem] sm:grid-cols-[8.5rem_minmax(0,1fr)]">
      <dt className="font-mono text-caption text-signal-ink/80">{name}</dt>
      <dd className="font-mono text-fine leading-[1.6] text-foreground/90 break-words">
        {children}
      </dd>
    </div>
  )
}

function RecordBlock({
  kind,
  id,
  children,
}: {
  readonly kind: string
  readonly id: string
  readonly children: React.ReactNode
}) {
  return (
    <section className="border-t border-border py-[var(--space-group)]">
      <header className="mb-[var(--space-tight)] flex items-baseline justify-between gap-4">
        <h3 className="font-mono text-caption uppercase tracking-[0.18em] text-foreground">
          {kind}
        </h3>
        <span className="font-mono text-caption text-muted-foreground/70">{id}</span>
      </header>
      <dl>{children}</dl>
    </section>
  )
}

/** Machine encoding for a list value — a JSON array, since that is what a machine expects. */
function arrayLiteral(items: readonly string[]): string {
  return `[${items.map((item) => `"${item}"`).join(', ')}]`
}

function serialise(posts: readonly PostSummary[]): string {
  const lines: string[] = []

  lines.push('# PERSON')
  lines.push(`name      ${person.name}`)
  lines.push(`title     ${person.title}`)
  lines.push(`location  ${person.location}`)
  lines.push(`timezone  ${person.timezone}`)
  lines.push(`site      ${person.site}`)
  lines.push(`focus     ${arrayLiteral(person.focus)}`)
  lines.push(`building  ${now.building.name}`)
  lines.push(`learning  ${now.learning.language}`)
  for (const link of person.links) lines.push(`${link.label.toLowerCase().padEnd(9)} ${link.url}`)

  roles.forEach((role, index) => {
    lines.push('', `# ROLE.${String(index + 1).padStart(3, '0')} (${role.id})`)
    lines.push(`org       ${role.org}`)
    lines.push(`title     ${role.title}`)
    lines.push(`from      ${role.from}`)
    lines.push(`until     ${role.until ?? 'null'}`)
    if (role.location) lines.push(`location  ${role.location}`)
    if (role.remote !== undefined) lines.push(`remote    ${role.remote}`)
    if (role.summary) lines.push(`summary   ${role.summary}`)
    if (role.stack) lines.push(`stack     ${arrayLiteral(role.stack)}`)
  })

  education.forEach((entry, index) => {
    lines.push('', `# EDUCATION.${String(index + 1).padStart(3, '0')} (${entry.id})`)
    lines.push(`institution ${entry.institution}`)
    lines.push(`credential  ${entry.credential}`)
    lines.push(`field       ${entry.field}`)
    lines.push(`from        ${entry.from}`)
    lines.push(`until       ${entry.until}`)
  })

  projects.forEach((project, index) => {
    lines.push('', `# PROJECT.${String(index + 1).padStart(3, '0')} (${project.id})`)
    lines.push(`name      ${project.name}`)
    lines.push(`tagline   ${project.tagline}`)
    lines.push(`status    ${project.status}`)
    lines.push(`url       ${project.url}`)
    lines.push(`summary   ${project.summary}`)
    lines.push(`features  ${arrayLiteral(project.capabilities)}`)
  })

  lines.push('', '# SKILLS')
  for (const group of skills) {
    lines.push(`${group.id.padEnd(9)} ${arrayLiteral(group.items)}`)
  }

  if (posts.length > 0) {
    lines.push('', '# WRITING')
    for (const post of posts) {
      lines.push(`${post.date}  ${person.site}/blogs/${post.slug}/  ${post.title}`)
    }
  }

  return lines.join('\n')
}

function CopyRecord({ posts }: { readonly posts: readonly PostSummary[] }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(serialise(posts))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard is unavailable outside a secure context or without permission. The
      // record is reachable at /llms-full.txt either way, which the header links to.
      setCopied(false)
    }
  }, [posts])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 font-mono text-caption text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
      {copied ? 'Copied' : 'Copy record'}
    </button>
  )
}

export function SpecimenSheet({ posts }: { readonly posts: readonly PostSummary[] }) {
  return (
    <div className="mx-auto w-full max-w-[62rem] px-[clamp(1.25rem,4vw,4rem)] pb-[var(--space-section)] pt-[clamp(4.75rem,6vw,6rem)]">
      <header className="pb-[var(--space-group)]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="font-mono text-caption uppercase tracking-[0.2em] text-foreground">
            Specimen record
          </h2>
          <span className="font-mono text-caption tabular-nums text-muted-foreground">
            {roles.length} roles · {projects.length} projects · {posts.length} pieces
          </span>
        </div>

        <p className="mt-[var(--space-group)] max-w-[68ch] font-mono text-fine leading-[1.7] text-muted-foreground">
          The same document as the reading view, encoded as fields. Dates are unformatted, lists
          are arrays, and an open-ended value is <span className="text-foreground">null</span>.
        </p>

        <div className="mt-[var(--space-tight)] flex flex-wrap items-center gap-x-5 gap-y-2">
          <CopyRecord posts={posts} />
          <a
            href="/llms.txt"
            className="font-mono text-caption text-muted-foreground underline decoration-border decoration-1 underline-offset-4 transition-colors hover:text-foreground hover:decoration-signal"
          >
            /llms.txt
          </a>
          <a
            href="/llms-full.txt"
            className="font-mono text-caption text-muted-foreground underline decoration-border decoration-1 underline-offset-4 transition-colors hover:text-foreground hover:decoration-signal"
          >
            /llms-full.txt
          </a>
        </div>
      </header>

      <RecordBlock kind="Person" id="person">
        <FieldRow name="name">
          <Fact id="person.given">{person.givenName}</Fact>
          <Connective>{' '}</Connective>
          <Fact id="person.family">{person.familyName}</Fact>
        </FieldRow>
        <FieldRow name="title">
          <Fact id="person.title">{person.title}</Fact>
        </FieldRow>
        <FieldRow name="location">
          <Fact id="person.location">{person.location}</Fact>
        </FieldRow>
        <FieldRow name="timezone">
          <Fact id="person.timezone">{person.timezone}</Fact>
        </FieldRow>
        {/* The reading view shows the portrait; here the same fact is its URL. */}
        <FieldRow name="avatar">
          <a
            href={person.avatar}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-border decoration-1 underline-offset-4 transition-colors hover:decoration-signal"
          >
            {person.avatar}
          </a>
        </FieldRow>
        <FieldRow name="focus">
          <Connective>[&quot;</Connective>
          <Fact id="person.focus.0">{person.focus[0]}</Fact>
          <Connective>&quot;, &quot;</Connective>
          <Fact id="person.focus.1">{person.focus[1]}</Fact>
          <Connective>&quot;]</Connective>
        </FieldRow>
        <FieldRow name="interests">
          <Connective>[&quot;</Connective>
          <Fact id="person.interest.0">{person.interests[0]}</Fact>
          <Connective>&quot;, &quot;</Connective>
          <Fact id="person.interest.1">{person.interests[1]}</Fact>
          <Connective>&quot;]</Connective>
        </FieldRow>
        <FieldRow name="building">
          <Fact id="now.building">{now.building.name}</Fact>
        </FieldRow>
        <FieldRow name="learning">
          <Fact id="now.learning">{now.learning.language}</Fact>
        </FieldRow>
        {person.links.map((link) => (
          <FieldRow key={link.label} name={link.label.toLowerCase()}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-border decoration-1 underline-offset-4 transition-colors hover:decoration-signal"
            >
              {link.url}
            </a>
          </FieldRow>
        ))}
      </RecordBlock>

      {roles.map((role, index) => (
        <RecordBlock
          key={role.id}
          kind={`Role.${String(index + 1).padStart(3, '0')}`}
          id={role.id}
        >
          <FieldRow name="org">
            <Fact id={`role.${role.id}.org`}>{role.org}</Fact>
          </FieldRow>
          <FieldRow name="title">
            <Fact id={`role.${role.id}.title`}>{role.title}</Fact>
          </FieldRow>
          <FieldRow name="from">
            <Fact id={`role.${role.id}.from`}>{role.from}</Fact>
          </FieldRow>
          <FieldRow name="until">
            <Fact id={`role.${role.id}.until`}>
              {role.until ?? <span className="text-signal-ink">null</span>}
            </Fact>
          </FieldRow>
          {/* Absent fields get no row at all rather than a row reading "undefined" — the
              record should say nothing where it knows nothing. */}
          {role.location && <FieldRow name="location">{role.location}</FieldRow>}
          {role.remote !== undefined && (
            <FieldRow name="remote">{String(role.remote)}</FieldRow>
          )}
          {role.summary && <FieldRow name="summary">{role.summary}</FieldRow>}
          {role.stack && <FieldRow name="stack">{arrayLiteral(role.stack)}</FieldRow>}
        </RecordBlock>
      ))}

      {education.map((entry, index) => (
        <RecordBlock
          key={entry.id}
          kind={`Education.${String(index + 1).padStart(3, '0')}`}
          id={entry.id}
        >
          <FieldRow name="institution">
            <Fact id={`education.${entry.id}.institution`}>{entry.institution}</Fact>
          </FieldRow>
          <FieldRow name="credential">
            <Fact id={`education.${entry.id}.credential`}>{entry.credential}</Fact>
          </FieldRow>
          <FieldRow name="field">{entry.field}</FieldRow>
          <FieldRow name="from">{entry.from}</FieldRow>
          <FieldRow name="until">{entry.until}</FieldRow>
          <FieldRow name="focus">{arrayLiteral(entry.focus)}</FieldRow>
        </RecordBlock>
      ))}

      {projects.map((project, index) => (
        <RecordBlock
          key={project.id}
          kind={`Project.${String(index + 1).padStart(3, '0')}`}
          id={project.id}
        >
          <FieldRow name="name">
            <Fact id={`project.${project.id}.name`}>{project.name}</Fact>
          </FieldRow>
          <FieldRow name="tagline">
            <Fact id={`project.${project.id}.tagline`}>{project.tagline}</Fact>
          </FieldRow>
          <FieldRow name="status">
            <span className={project.status === 'in-development' ? 'text-signal-ink' : undefined}>
              {project.status}
            </span>
          </FieldRow>
          <FieldRow name="url">
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-border decoration-1 underline-offset-4 transition-colors hover:decoration-signal"
            >
              {project.url}
            </a>
          </FieldRow>
          <FieldRow name="summary">{project.summary}</FieldRow>
          <FieldRow name="features">{arrayLiteral(project.capabilities)}</FieldRow>
        </RecordBlock>
      ))}

      <RecordBlock kind="Skills" id="skills">
        {skills.map((group) => (
          <FieldRow key={group.id} name={group.id}>
            {arrayLiteral(group.items)}
          </FieldRow>
        ))}
      </RecordBlock>

      {posts.length > 0 && (
        <RecordBlock kind="Writing" id="writing">
          {posts.map((post) => (
            <FieldRow key={post.slug} name={post.date}>
              <a
                href={`/blogs/${post.slug}/`}
                className="underline decoration-border decoration-1 underline-offset-4 transition-colors hover:decoration-signal"
              >
                {post.title}
              </a>
            </FieldRow>
          ))}
        </RecordBlock>
      )}

      <p className="border-t border-border pt-[var(--space-group)] font-mono text-caption text-muted-foreground">
        End of record.
      </p>
    </div>
  )
}
