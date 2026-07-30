'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import {
  education,
  formatMonth,
  formatPeriod,
  now,
  person,
  projects,
  roles,
  skills,
} from '@/data/profile'
import { Connective, Fact } from './Fact'
import { SectionHead } from './SectionHead'
import { Disclosure, DisclosureMark } from './Disclosure'
import type { PostSummary } from './types'

function Masthead({ commits }: { readonly commits: number }) {
  return (
    // Top padding clears the fixed mode toggle. On narrow screens the toggle and the
    // portrait both want the top-right corner, so the floor is high enough to avoid it.
    <header className="pt-[clamp(4.75rem,6vw,6rem)]">
      {/* Portrait sits opposite the display type rather than above it: the name only fills the
          left half of the measure, so the right half was dead space. A squared plate with a
          hairline, not a rounded avatar with a gradient ring. */}
      <div className="flex items-start justify-between gap-[clamp(1rem,3vw,3rem)]">
        <div className="min-w-0 flex-1">
          {/* The name is the only element allowed to reach display size, and it is set on two
              lines so the second can carry the rule outward instead of sitting in dead space. */}
          <h1 className="font-display text-display leading-[0.86] tracking-[-0.02em] text-foreground">
            <span className="block">
              <Fact id="person.given">{person.givenName}</Fact>
            </span>
            <span className="flex items-center gap-[clamp(0.75rem,2vw,2rem)]">
              <Fact id="person.family">{person.familyName}</Fact>
              <span aria-hidden className="h-px flex-1 bg-signal/60" />
            </span>
          </h1>

          <p className="mt-[var(--space-group)] text-caption uppercase tracking-[0.2em] text-muted-foreground">
            <Fact id="person.title">{person.title}</Fact>
            <Connective>{' · '}</Connective>
            <Fact id="person.location">{person.location}</Fact>
            <Connective>{' · '}</Connective>
            <Fact id="person.timezone">{person.timezone}</Fact>
          </p>
        </div>

        <div className="w-[clamp(3.75rem,8vw,7.5rem)] shrink-0 overflow-hidden rounded-sm border border-border bg-card">
          <Image
            src={person.avatar}
            alt={person.name}
            width={420}
            height={420}
            className="h-auto w-full"
            sizes="(max-width: 640px) 25vw, 8vw"
            priority
          />
        </div>
      </div>

      {/* Asymmetric: the lead runs wide on the left, the live signals sit in a narrow
          right-hand column. Not a two-up card grid — the columns are deliberately unequal.
          Spacing here is the group step, not the section step: the lead belongs to the
          masthead, and separating them by a full section break left a dead band. */}
      <div className="mt-[clamp(2rem,4vw,3.25rem)] grid gap-[clamp(2rem,4vw,3rem)] lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-[clamp(2rem,5vw,4.5rem)]">
        <p className="text-lead leading-[1.5] text-foreground/90 max-w-[54ch]">
          <Connective>I build </Connective>
          <Fact id="person.focus.0" className="font-display italic text-signal-ink">
            {person.focus[0]}
          </Fact>
          <Connective> that reduce human workload, currently focused on </Connective>
          <Fact id="person.focus.1" className="font-display italic text-signal-ink">
            {person.focus[1]}
          </Fact>
          <Connective>
            {' '}
            that streamlines physicians’ workflows. Away from the work I follow{' '}
          </Connective>
          <Fact id="person.interest.0">{person.interests[0]}</Fact>
          <Connective> and </Connective>
          <Fact id="person.interest.1">{person.interests[1]}</Fact>
          <Connective>.</Connective>
        </p>

        <div className="space-y-[var(--space-group)]">
          <div>
            <SectionHead label="Now" />
            <dl className="mt-[var(--space-tight)] space-y-[var(--space-hairline)] text-fine">
              <div className="flex items-baseline gap-3">
                <dt className="text-muted-foreground w-20 shrink-0">Building</dt>
                <dd className="flex items-center gap-2">
                  {/* A live indicator that is a dot and a word, not an animated glass pill. */}
                  <span aria-hidden className="size-1.5 rounded-full bg-signal" />
                  <a
                    href={now.building.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline decoration-border decoration-1 underline-offset-4 transition-colors hover:decoration-signal"
                  >
                    <Fact id="now.building">{now.building.name}</Fact>
                  </a>
                </dd>
              </div>
              <div className="flex items-baseline gap-3">
                <dt className="text-muted-foreground w-20 shrink-0">Learning</dt>
                <dd>
                  <a
                    href={now.learning.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline decoration-border decoration-1 underline-offset-4 transition-colors hover:decoration-signal"
                  >
                    <Fact id="now.learning">{now.learning.language}</Fact>
                  </a>
                  <span className="text-muted-foreground tabular-nums">
                    {' · '}
                    {commits} commits
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <SectionHead label="Elsewhere" />
            <ul className="mt-[var(--space-tight)] flex flex-wrap gap-x-5 gap-y-1 text-fine">
              {person.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline decoration-border decoration-1 underline-offset-4 transition-colors hover:decoration-signal"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </header>
  )
}

function Work() {
  return (
    <section className="mt-[var(--space-section)]">
      <SectionHead label="Work" note={`${roles.length} positions`} />

      <ol className="mt-[var(--space-group)]">
        {roles.map((role) => (
          <li key={role.id} className="border-b border-border first:border-t">
            {/* At rest: who, what, when. The description and the stack are one click away. */}
            <Disclosure
              className="py-[var(--space-group)]"
              summary={(open) => (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1">
                  <div className="flex items-start gap-3">
                    <DisclosureMark open={open} />
                    <span className="min-w-0">
                      <h3 className="font-display text-title leading-[1.1] text-foreground">
                        <Fact id={`role.${role.id}.org`}>{role.org}</Fact>
                      </h3>
                      <p className="mt-1 text-fine text-muted-foreground">
                        <Fact id={`role.${role.id}.title`}>{role.title}</Fact>
                      </p>
                    </span>
                  </div>

                  <p className="text-fine tabular-nums text-muted-foreground text-right">
                    <Fact id={`role.${role.id}.from`}>{formatMonth(role.from)}</Fact>
                    <Connective>{' — '}</Connective>
                    <Fact id={`role.${role.id}.until`}>
                      {role.until ? formatMonth(role.until) : 'Present'}
                    </Fact>
                  </p>
                </div>
              )}
            >
              <div className="pl-[calc(0.625rem+0.75rem)] pt-[var(--space-group)]">
                <p className="max-w-[62ch] text-body leading-[1.55] text-foreground/85">
                  {role.summary}
                </p>
                <p className="mt-[var(--space-tight)] text-caption text-muted-foreground">
                  {role.location}
                  {role.remote ? ' · Remote' : ''}
                </p>
                <p className="mt-[var(--space-hairline)] text-caption text-muted-foreground/70">
                  {role.stack.join(' · ')}
                </p>
              </div>
            </Disclosure>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Education() {
  return (
    <section className="mt-[var(--space-section)]">
      <SectionHead label="Education" />
      {education.map((entry) => (
        <div
          key={entry.id}
          className="mt-[var(--space-group)] grid gap-x-6 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto]"
        >
          <div className="min-w-0">
            <h3 className="font-display text-title leading-[1.1] text-foreground">
              <Fact id={`education.${entry.id}.institution`}>{entry.institution}</Fact>
            </h3>
            <p className="mt-1 text-fine text-muted-foreground">
              <Fact id={`education.${entry.id}.credential`}>{entry.credential}</Fact>
              <Connective>{`, ${entry.field}`}</Connective>
            </p>
            <p className="mt-[var(--space-tight)] text-caption text-muted-foreground/70">
              {entry.focus.join(' · ')}
            </p>
          </div>
          <p className="text-fine tabular-nums text-muted-foreground sm:text-right">
            {formatPeriod(entry.from, entry.until)}
          </p>
        </div>
      ))}
    </section>
  )
}

function ProjectStatus({ status }: { readonly status: 'live' | 'in-development' }) {
  if (status === 'live') return null
  return (
    <span className="text-caption uppercase tracking-[0.14em] text-signal-ink">
      In development
    </span>
  )
}

/**
 * The lead project gets a full block — image, summary, and its capability list. Everything
 * after it is an index entry. Giving every project an identical card is what made the old
 * section read as a template; an editorial hierarchy says which work matters most.
 */
function FeaturedProject({ project }: { readonly project: (typeof projects)[number] }) {
  return (
    <article className="mt-[var(--space-group)] grid gap-[var(--space-group)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-[clamp(2rem,4vw,4rem)]">
      <div>
        <div className="flex items-baseline gap-3">
          <span className="text-caption tabular-nums text-signal">01</span>
          <ProjectStatus status={project.status} />
        </div>
        <h3 className="mt-2 font-display text-[length:clamp(2rem,1.2rem+2.6vw,3.25rem)] leading-[0.98] tracking-[-0.015em] text-foreground">
          <Fact id={`project.${project.id}.name`}>{project.name}</Fact>
        </h3>
        <p className="mt-2 text-fine uppercase tracking-[0.14em] text-muted-foreground">
          <Fact id={`project.${project.id}.tagline`}>{project.tagline}</Fact>
        </p>
        <p className="mt-[var(--space-group)] max-w-[52ch] text-body leading-[1.55] text-foreground/85">
          {project.summary}
        </p>

        <ul className="mt-[var(--space-group)] space-y-[var(--space-hairline)]">
          {project.capabilities.map((capability) => (
            <li
              key={capability}
              className="flex gap-3 border-b border-border/60 pb-[var(--space-hairline)] text-fine text-muted-foreground last:border-0"
            >
              <span aria-hidden className="mt-[0.55em] size-1 shrink-0 rounded-full bg-signal/70" />
              <span>{capability}</span>
            </li>
          ))}
        </ul>

        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-[var(--space-group)] inline-flex items-center gap-1.5 text-fine text-foreground underline decoration-signal/50 decoration-1 underline-offset-[6px] transition-colors hover:decoration-signal"
        >
          {project.linkLabel}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
      </div>

      {project.image && (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <Image
            src={project.image}
            alt={`${project.name} interface`}
            width={1200}
            height={630}
            className="h-auto w-full"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      )}
    </article>
  )
}

function Projects() {
  const [featured, ...rest] = projects

  return (
    <section className="mt-[var(--space-section)]">
      <SectionHead label="Selected work" note={`${projects.length} projects`} />

      {featured && <FeaturedProject project={featured} />}

      {/* The remainder as a catalogue index: a number in the margin, the name, what it is,
          and where the link goes. Rules instead of cards. */}
      {/* A catalogue index: number, name, what it is. Everything else on request, so the
          section reads as a list rather than eight stacked essays. */}
      <ol className="mt-[var(--space-section)]">
        {rest.map((project, index) => (
          <li key={project.id} className="border-b border-border first:border-t">
            <Disclosure
              className="py-[var(--space-group)]"
              summary={(open) => (
                <div className="grid grid-cols-[2rem_auto_minmax(0,1fr)] items-start gap-x-3">
                  <span className="mt-[0.45em] text-caption tabular-nums text-muted-foreground/70 transition-colors group-hover:text-signal">
                    {String(index + 2).padStart(2, '0')}
                  </span>
                  <DisclosureMark open={open} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-display text-title leading-[1.1] text-foreground">
                        <Fact id={`project.${project.id}.name`}>{project.name}</Fact>
                      </span>
                      <ProjectStatus status={project.status} />
                    </span>
                    <span className="mt-1 block text-fine text-muted-foreground">
                      <Fact id={`project.${project.id}.tagline`}>{project.tagline}</Fact>
                    </span>
                  </span>
                </div>
              )}
            >
              <div className="pl-[calc(2rem+0.625rem+1.5rem)] pt-[var(--space-group)]">
                <p className="max-w-[58ch] text-body leading-[1.5] text-foreground/80">
                  {project.summary}
                </p>

                <ul className="mt-[var(--space-group)] space-y-[var(--space-hairline)]">
                  {project.capabilities.map((capability) => (
                    <li key={capability} className="flex gap-3 text-caption text-muted-foreground">
                      <span
                        aria-hidden
                        className="mt-[0.5em] size-1 shrink-0 rounded-full bg-signal/60"
                      />
                      <span>{capability}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link mt-[var(--space-group)] inline-flex items-center gap-1.5 text-fine text-foreground underline decoration-signal/50 decoration-1 underline-offset-[6px] transition-colors hover:decoration-signal"
                >
                  {project.linkLabel}
                  <ArrowUpRight
                    className="size-3 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5"
                    aria-hidden
                  />
                </a>
              </div>
            </Disclosure>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Skills() {
  return (
    <section className="mt-[var(--space-section)]">
      <SectionHead label="Tools" />
      <dl className="mt-[var(--space-group)]">
        {skills.map((group) => (
          <div
            key={group.id}
            className="grid gap-x-6 gap-y-1 border-b border-border py-[var(--space-tight)] first:border-t sm:grid-cols-[8rem_minmax(0,1fr)]"
          >
            <dt className="text-caption uppercase tracking-[0.16em] text-muted-foreground">
              {group.label}
            </dt>
            {/* Running text, not a wall of badges. */}
            <dd className="text-body text-foreground/85">{group.items.join(', ')}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Writing({ posts }: { readonly posts: readonly PostSummary[] }) {
  if (posts.length === 0) return null

  return (
    <section className="mt-[var(--space-section)]">
      <SectionHead label="Writing" note={`${posts.length} pieces`} />
      <ol className="mt-[var(--space-group)]">
        {posts.map((post) => (
          <li key={post.slug} className="border-b border-border first:border-t">
            <Link
              href={`/blogs/${post.slug}/`}
              className="group grid gap-x-6 gap-y-1 py-[var(--space-group)] sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              {/* Title and date only. The excerpts live on /blogs, where the list is the
                  whole point of the page rather than one section of it. */}
              <span className="min-w-0 font-display text-title leading-[1.15] text-foreground decoration-signal/50 decoration-1 underline-offset-[6px] group-hover:underline">
                {post.title}
              </span>
              <span className="text-fine tabular-nums text-muted-foreground sm:text-right">
                {post.date}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function HumanView({
  posts,
  commits,
  contributions,
}: {
  readonly posts: readonly PostSummary[]
  readonly commits: number
  readonly contributions?: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-[76rem] px-[clamp(1.25rem,4vw,4rem)] pb-[var(--space-section)]">
      <Masthead commits={commits} />
      <Work />
      {contributions && <div className="mt-[var(--space-section)]">{contributions}</div>}
      <Education />
      <Projects />
      <Skills />
      <Writing posts={posts} />
    </div>
  )
}
