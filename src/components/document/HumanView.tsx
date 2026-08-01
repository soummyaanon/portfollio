'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import {
  education,
  formatMonth,
  formatPeriod,
  person,
  projects,
  roles,
  skills,
  type Role,
} from '@/data/profile'
import { Connective, Fact } from './Fact'
import { SectionHead } from './SectionHead'
import { SignalPlate } from './SignalPlate'
import { Disclosure, DisclosureMark } from './Disclosure'
import { ToolMark } from './ToolMark'
import { Marquee } from '@/components/ui/marquee'
import type { PostSummary } from './types'

/**
 * The reading view: one vertical axis, three nested measures, and no hue at all.
 *
 * Everything that announces itself — the plate, the name, the section labels, the standing
 * facts — is centred on that axis. Everything that has to be *read* or *scanned* stays
 * flush left inside a centred column, because centred body copy gives every line a
 * different starting point and centred list rows destroy the alignment that makes a list
 * scannable. The symmetry is in the composition, not in the paragraphs.
 *
 * There are no cards anywhere on this page, and no colour. Structure is carried entirely
 * by hairlines, spacing, and type — greyscale forces every distinction to be made with
 * contrast, weight, and the switch between the grotesque and the machine face, which is
 * also what keeps it looking like an instrument rather than a brochure.
 */

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function Masthead() {
  return (
    // Top padding clears the fixed mode toggle, which owns the top-right corner.
    <header className="pt-[clamp(4.5rem,7vw,6.5rem)] text-center">
      {/* The portrait sits at the centre of the engraved plate rather than off to one side:
          it is the source the contour field radiates from, so the decoration has a subject
          instead of being a texture the page happens to sit on. */}
      <SignalPlate>
        <div className="elevate size-[clamp(3.5rem,6vw,5rem)] overflow-hidden rounded-full bg-card ring-1 ring-border">
          <Image
            src={person.avatar}
            alt={person.name}
            width={420}
            height={420}
            className="h-full w-full object-cover"
            sizes="(max-width: 640px) 24vw, 6vw"
            priority
          />
        </div>
      </SignalPlate>

      {/* Two lines, tight leading, optical tracking pulled in — at this size the default
          spacing reads loose. The only element on the site allowed to reach display size. */}
      <h1 className="font-display text-display leading-[0.82] tracking-[-0.035em] text-foreground">
        <span className="block">
          <Fact id="person.given">{person.givenName}</Fact>
        </span>
        <span className="block">
          <Fact id="person.family">{person.familyName}</Fact>
        </span>
      </h1>

      {/* Tracking is dialled back on narrow screens: at 0.28em the three facts run 40 characters
          wide and wrap, which strands a separator dot at the end of the first line. */}
      <p className="field-label mt-[clamp(1.25rem,2.5vw,2rem)] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 tracking-[0.16em] text-muted-foreground sm:tracking-[0.26em]">
        <Fact id="person.title">{person.title}</Fact>
        <Connective>
          <span aria-hidden className="block h-2.5 w-px bg-border" />
        </Connective>
        <Fact id="person.location">{person.location}</Fact>
        <Connective>
          <span aria-hidden className="block h-2.5 w-px bg-border" />
        </Connective>
        <Fact id="person.timezone">{person.timezone}</Fact>
      </p>

      {/* The lead is the one piece of centred running text, kept to ~44 characters so no
          line is long enough for the ragged left edge to become work to read.

          With no hue to spend, the two focus terms are emphasised structurally instead:
          they switch to the display grotesque at full contrast and tight tracking while the
          sentence around them sits at 70%. Same job an accent colour was doing, done with
          the only two variables left — weight and contrast. */}
      <p className="measure-prose mt-[clamp(2rem,4vw,3rem)] text-balance text-lead leading-[1.45] text-foreground/70">
        <Connective>I build </Connective>
        <Fact
          id="person.focus.0"
          className="font-display font-semibold tracking-[-0.02em] text-foreground"
        >
          {person.focus[0]}
        </Fact>
        <Connective> that reduce human workload, currently focused on </Connective>
        <Fact
          id="person.focus.1"
          className="font-display font-semibold tracking-[-0.02em] text-foreground"
        >
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
    </header>
  )
}

/** Who, what, when — the three facts every role has. */
function RoleHeading({ role, open }: { readonly role: Role; readonly open?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1">
      <div className="flex items-start gap-3">
        {/* The affordance is drawn only when there is something behind it. A row with no
            write-up yet keeps the same indent so the column of names stays straight. */}
        {open === undefined ? (
          <span aria-hidden className="mt-[0.6em] block size-2.5 shrink-0" />
        ) : (
          <DisclosureMark open={open} />
        )}
        <span className="min-w-0">
          <h3 className="font-display text-title leading-[1.1] text-foreground">
            <Fact id={`role.${role.id}.org`}>{role.org}</Fact>
          </h3>
          <p className="mt-1 text-fine text-muted-foreground">
            <Fact id={`role.${role.id}.title`}>{role.title}</Fact>
          </p>
        </span>
      </div>

      <p className="field-label text-right tracking-[0.08em] text-muted-foreground">
        <Fact id={`role.${role.id}.from`}>{formatMonth(role.from)}</Fact>
        <Connective>{' — '}</Connective>
        <Fact id={`role.${role.id}.until`}>
          {role.until ? formatMonth(role.until) : 'Present'}
        </Fact>
      </p>
    </div>
  )
}

/**
 * At rest: who, what, when. The description and the stack are one click away — unless the
 * role has neither, in which case the row is static rather than a button that opens onto
 * nothing.
 */
function RoleRow({ role }: { readonly role: Role }) {
  const detail = role.summary || role.location || role.stack?.length

  if (!detail) {
    return (
      <div className="py-[var(--space-group)]">
        <RoleHeading role={role} />
      </div>
    )
  }

  return (
    <Disclosure
      className="py-[var(--space-group)]"
      summary={(open) => <RoleHeading role={role} open={open} />}
    >
      <div className="pl-[calc(0.625rem+0.75rem)] pt-[var(--space-group)]">
        {role.summary && (
          <p className="max-w-[62ch] text-body leading-[1.55] text-foreground/85">
            {role.summary}
          </p>
        )}
        {role.location && (
          <p className="mt-[var(--space-tight)] text-caption text-muted-foreground">
            {role.location}
            {role.remote ? ' · Remote' : ''}
          </p>
        )}
        {role.stack && role.stack.length > 0 && (
          <p className="mt-[var(--space-hairline)] text-caption text-muted-foreground/70">
            {role.stack.join(' · ')}
          </p>
        )}
      </div>
    </Disclosure>
  )
}

function Work() {
  return (
    <section className="mt-[var(--space-section)]">
      <SectionHead label="Work" note={pad(roles.length)} />

      <ol className="measure-column mt-[var(--space-group)]">
        {roles.map((role) => (
          <li key={role.id} className="border-b border-border">
            <RoleRow role={role} />
          </li>
        ))}
      </ol>
    </section>
  )
}

/** A single entry, so it can be set on the axis outright rather than as a row in a list. */
function Education() {
  return (
    <section className="mt-[var(--space-section)]">
      <SectionHead label="Education" />
      {education.map((entry) => (
        <div key={entry.id} className="measure-prose mt-[var(--space-group)] text-center">
          <h3 className="text-balance font-display text-title leading-[1.15] text-foreground">
            <Fact id={`education.${entry.id}.institution`}>{entry.institution}</Fact>
          </h3>
          <p className="mt-2 text-fine text-muted-foreground">
            <Fact id={`education.${entry.id}.credential`}>{entry.credential}</Fact>
            <Connective>{`, ${entry.field}`}</Connective>
          </p>
          <p className="field-label mt-[var(--space-tight)] tracking-[0.1em] text-muted-foreground/70">
            {formatPeriod(entry.from, entry.until)}
            {' · '}
            {entry.focus.join(' · ')}
          </p>
        </div>
      ))}
    </section>
  )
}

/**
 * A hairline-boxed tag rather than a coloured word. With one hue on the page there is no
 * "amber means unfinished" available, so the status has to be legible as a shape: a rule
 * around it says this is a stamp on the record, not part of the sentence.
 */
function ProjectStatus({ status }: { readonly status: 'live' | 'in-development' }) {
  if (status === 'live') return null
  return (
    <span className="field-label shrink-0 border border-border px-1.5 py-[0.15rem] leading-none text-muted-foreground">
      In development
    </span>
  )
}

/**
 * The lead project gets a full block — a centred title, the interface at full column width,
 * then the summary and its capability list. Everything after it is an index entry. Giving
 * every project an identical card is what made the old section read as a template; an
 * editorial hierarchy says which work matters most.
 */
function FeaturedProject({ project }: { readonly project: (typeof projects)[number] }) {
  return (
    <article className="measure-column mt-[var(--space-group)]">
      <div className="text-center">
        <p className="field-label flex items-center justify-center gap-3 text-foreground">
          01
          <ProjectStatus status={project.status} />
        </p>
        <h3 className="mt-3 font-display text-[length:clamp(1.5rem,0.9rem+2.2vw,2.5rem)] leading-[1] tracking-[-0.04em] text-foreground">
          <Fact id={`project.${project.id}.name`}>{project.name}</Fact>
        </h3>
        <p className="field-label mt-3 text-muted-foreground">
          <Fact id={`project.${project.id}.tagline`}>{project.tagline}</Fact>
        </p>
      </div>

      {project.image && (
        <div className="elevate mt-[var(--space-group)] overflow-hidden border border-border bg-card">
          <Image
            src={project.image}
            alt={`${project.name} interface`}
            width={1200}
            height={630}
            className="h-auto w-full"
            sizes="(max-width: 1024px) 100vw, 52rem"
          />
        </div>
      )}

      {/* Summary on the axis, capabilities in balanced columns beneath it. Side by side they
          left a column of dead paper — the paragraph is four lines and the list is fifteen,
          and a two-column grid has no way to make those the same height. */}
      <p className="measure-prose mt-[var(--space-group)] text-center text-body leading-[1.6] text-foreground/85">
        {project.summary}
      </p>

      <ul className="mt-[var(--space-group)] gap-x-[clamp(2rem,4vw,3.5rem)] sm:columns-2">
        {project.capabilities.map((capability) => (
          <li
            key={capability}
            className="flex break-inside-avoid gap-3 border-b border-border/60 py-[var(--space-hairline)] text-fine leading-[1.45] text-muted-foreground"
          >
            <span aria-hidden className="mt-[0.7em] h-px w-2 shrink-0 bg-border" />
            <span>{capability}</span>
          </li>
        ))}
      </ul>

      <p className="mt-[var(--space-group)] text-center">
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group/link inline-flex items-center gap-1.5 text-fine text-foreground underline decoration-signal/50 decoration-1 underline-offset-[6px] transition-colors duration-200 hover:decoration-signal"
        >
          {project.linkLabel}
          <ArrowUpRight
            className="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5"
            aria-hidden
          />
        </a>
      </p>
    </article>
  )
}

function Projects() {
  const [featured, ...rest] = projects

  return (
    <section className="mt-[var(--space-section)]">
      <SectionHead label="Selected work" note={pad(projects.length)} />

      {featured && <FeaturedProject project={featured} />}

      {/* The remainder as a catalogue index: number, name, what it is. Everything else on
          request, so the section reads as a list rather than eight stacked essays. */}
      <ol className="measure-column mt-[var(--space-section)]">
        {rest.map((project, index) => (
          <li key={project.id} className="border-b border-border first:border-t">
            <Disclosure
              className="py-[var(--space-group)]"
              summary={(open) => (
                <div className="grid grid-cols-[2rem_auto_minmax(0,1fr)] items-start gap-x-3">
                  <span className="field-label mt-[0.5em] text-muted-foreground/70 transition-colors group-hover:text-foreground">
                    {pad(index + 2)}
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
                      <span aria-hidden className="mt-[0.65em] h-px w-2 shrink-0 bg-border" />
                      <span>{capability}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link mt-[var(--space-group)] inline-flex items-center gap-1.5 text-fine text-foreground underline decoration-signal/50 decoration-1 underline-offset-[6px] transition-colors duration-200 hover:decoration-signal"
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

/**
 * Two rails of tools running in opposite directions.
 *
 * A marquee is usually decoration bolted onto a list. Here it *is* the list: the group
 * labels ride along in the stream, so the taxonomy survives, and every tool keeps its name
 * beside its mark — a row of bare logos is a quiz, and it is invisible to every crawler and
 * language model that reads this page. Counter-rotation is what stops two parallel rails
 * reading as one block sliding sideways.
 *
 * Hovering stops it, so a name that catches your eye can actually be read.
 */
function Skills() {
  // Languages and frameworks on the top rail, everything else on the bottom. Split by
  // count rather than meaning would leave one rail short enough to show a seam.
  const rails = [skills.slice(0, 2), skills.slice(2)]

  return (
    <section className="mt-[var(--space-section)]">
      <SectionHead label="Tools" />

      {/* The fade is a mask, not two gradient overlays: it works over any background, so it
          survives a theme flip without a second pair of elements tinted the other way. */}
      <div className="measure-column mt-[var(--space-group)] [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] motion-reduce:overflow-x-auto motion-reduce:[mask-image:none]">
        {rails.map((groups, index) => (
          <Marquee
            key={groups[0]?.id ?? index}
            reverse={index === 1}
            pauseOnHover
            className="[--duration:52s] [--gap:2.25rem] py-1.5"
          >
            {groups.flatMap((group) => [
              <span key={group.id} className="field-label shrink-0 text-muted-foreground/55">
                {group.label}
              </span>,
              ...group.items.map((item) => (
                <span key={item} className="shrink-0 text-body text-foreground/85">
                  <ToolMark name={item} />
                </span>
              )),
            ])}
          </Marquee>
        ))}
      </div>
    </section>
  )
}

function Writing({ posts }: { readonly posts: readonly PostSummary[] }) {
  if (posts.length === 0) return null

  return (
    <section className="mt-[var(--space-section)]">
      <SectionHead label="Writing" note={pad(posts.length)} />
      <ol className="measure-column mt-[var(--space-group)]">
        {posts.map((post) => (
          <li key={post.slug} className="border-b border-border">
            <Link
              href={`/blogs/${post.slug}/`}
              className="group grid gap-x-6 gap-y-1 py-[var(--space-group)] sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              {/* Title and date only. The excerpts live on /blogs, where the list is the
                  whole point of the page rather than one section of it. */}
              <span className="min-w-0 font-display text-title leading-[1.15] text-foreground decoration-signal/50 decoration-1 underline-offset-[6px] group-hover:underline">
                {post.title}
              </span>
              <span className="field-label text-muted-foreground sm:text-right">
                {post.date}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Closes the axis. Without it the document just stops at whatever the last list was. */
function Colophon() {
  return (
    <div className="mt-[var(--space-section)] flex items-center justify-center gap-4">
      <span aria-hidden className="rule-fade-r h-px w-[clamp(3rem,12vw,9rem)]" />
      <span aria-hidden className="size-1 rounded-full bg-muted-foreground/60" />
      <span aria-hidden className="rule-fade-l h-px w-[clamp(3rem,12vw,9rem)]" />
    </div>
  )
}

export function HumanView({
  posts,
  contributions,
}: {
  readonly posts: readonly PostSummary[]
  readonly contributions?: React.ReactNode
}) {
  return (
    <div className="measure-page px-[clamp(1.25rem,4vw,4rem)] pb-[var(--space-section)]">
      <Masthead />
      <Work />
      {contributions && <div className="mt-[var(--space-section)]">{contributions}</div>}
      <Education />
      <Projects />
      <Skills />
      <Writing posts={posts} />
      <Colophon />
    </div>
  )
}
