'use client'

import { Fragment } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import {
  education,
  formatMonth,
  person,
  projects,
  roles,
  skills,
  type Role,
} from '@/data/profile'
import { Connective, Fact } from './Fact'
import { BenchRails } from './BenchRails'
import { Workbench, type WorkbenchSlide } from './Workbench'
import { SectionHead } from './SectionHead'
import { SignalPlate } from './SignalPlate'
import { Disclosure, DisclosureMark } from './Disclosure'
import { ToolMark } from './ToolMark'
import { orgVeilClass } from './withheld'
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
    // Top padding clears the fixed mode toggle, which owns the top-right corner. It is pulled
    // in tighter than the plate below it is tall: the plate grew, and it grew upward, because
    // sky is the one thing on this page that is worth more of the fold than the margin above
    // it was. The toggle still clears — the plate's mask has no ink within a rem of its edge.
    <header className="pt-[clamp(3rem,4.5vw,4.25rem)] text-center">
      {/* The catalogued object at the centre of the plate is now the black hole itself, not a
          portrait: the chart is drawn around the one thing on it that bends everything else,
          and the name below is what the plate is evidence for. */}
      <SignalPlate />

      {/* Two lines, tight leading, optical tracking pulled in — at this size the default
          spacing reads loose. The only element on the site allowed to reach display size.
          The portrait rides beside the name now rather than at the centre of the plate:
          the sky above belongs to the hole, and the face belongs with the byline. */}
      <div className="flex items-center justify-center gap-[clamp(1rem,2.5vw,1.75rem)]">
        <h1 className="font-display text-display leading-[0.82] tracking-[-0.035em] text-foreground">
          <span className="block">
            <Fact id="person.given">{person.givenName}</Fact>
          </span>
          {' '}
          <span className="block">
            <Fact id="person.family">{person.familyName}</Fact>
          </span>
        </h1>
        <div className="elevate size-[clamp(3.25rem,5.5vw,4.5rem)] shrink-0 overflow-hidden rounded-full bg-card ring-1 ring-border">
          <Image
            src={person.avatar}
            alt={person.name}
            width={256}
            height={256}
            className="h-full w-full object-cover"
            sizes="(max-width: 640px) 18vw, 5vw"
            priority
          />
        </div>
      </div>

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

          With no hue to spend, the focus terms are emphasised structurally instead:
          they switch to the display grotesque at full contrast and tight tracking while the
          sentence around them sits at 70%. Same job an accent colour was doing, done with
          the only two variables left — weight and contrast. */}
      <p className="measure-prose mt-[clamp(2rem,4vw,3rem)] text-balance text-lead leading-[1.45] text-foreground/70">
        <Connective>I’m a builder making </Connective>
        {person.focus.map((item, at) => (
          <Fragment key={item}>
            {at > 0 && <Connective>{separator(at, person.focus.length)}</Connective>}
            <Fact id={`person.focus.${at}`} className="font-display font-semibold tracking-[-0.02em] text-foreground">
              {item}
            </Fact>
          </Fragment>
        ))}
        <Connective> that make life easier. Off the clock, I follow </Connective>
        {person.interests.map((item, at) => (
          <Fragment key={item}>
            {at > 0 && <Connective>{separator(at, person.interests.length)}</Connective>}
            <Fact id={`person.interest.${at}`}>{item}</Fact>
          </Fragment>
        ))}
        <Connective>.</Connective>
      </p>
    </header>
  )
}

/** What goes before item `at` of a list read as prose: "a and b", "a, b, and c". */
function separator(at: number, length: number) {
  if (at < length - 1) return ', '
  return length > 2 ? ', and ' : ' and '
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
            <Fact id={`role.${role.id}.org`} className={orgVeilClass(role)}>
              {role.org}
            </Fact>
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
      <SectionHead index="01" label="Work" note={pad(roles.length)} />

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

/** Set like a Work row — who and what on the left, when on the right — with the emblem in the mark's place. */
function Education() {
  return (
    <section className="mt-[var(--space-section)]">
      <SectionHead index="03" label="Education" />

      <ol className="measure-column mt-[var(--space-group)]">
        {education.map((entry) => (
          <li key={entry.id} className="py-[var(--space-group)]">
            {/* The emblem gets its own column and opts out of baseline alignment, so the
                dates still sit on the institution's baseline the way they do in Work. */}
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-3">
              {entry.logo ? (
                <div className="size-10 shrink-0 self-start overflow-hidden rounded-full ring-1 ring-border grayscale-[0.35]">
                  <Image src={entry.logo} alt={`${entry.institution} emblem`} width={80} height={80} className="h-full w-full object-cover" />
                </div>
              ) : (
                <span aria-hidden />
              )}
              <span className="min-w-0">
                <h3 className="font-display text-title leading-[1.1] text-foreground">
                  <Fact id={`education.${entry.id}.institution`}>{entry.institution}</Fact>
                </h3>
                <p className="mt-1 text-fine text-muted-foreground">
                  <Fact id={`education.${entry.id}.credential`}>{entry.credential}</Fact>
                  <Connective>{`, ${entry.field}`}</Connective>
                </p>
                <p className="mt-[var(--space-hairline)] text-caption text-muted-foreground/70">
                  {entry.focus.join(' · ')}
                </p>
              </span>

              <p className="ml-3 field-label text-right tracking-[0.08em] text-muted-foreground">
                {/* Years only: it is a two-year programme, and the months add nothing to that. */}
                {entry.from.slice(0, 4)} — {entry.until.slice(0, 4)}
              </p>
            </div>
          </li>
        ))}
      </ol>
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

/** Where a project lives, as the bar of a browser window would show it. */
function hostOf(url: string) {
  try {
    const { host, pathname } = new URL(url)
    const bare = host.replace(/^www\./, '')
    // A package or a release page is named by its path, not by the registry it sits on.
    if (bare === 'github.com' || bare === 'npmjs.com') return `${bare}${pathname.split('/').slice(0, 3).join('/')}`
    return bare
  } catch {
    return url
  }
}

/**
 * One project as a window onto it: a bar with its address, the interface itself, and the
 * name and line under it. Screenshots sit in greyscale like the rest of the page and take
 * their colour back when the card is pointed at, which is the one place colour is allowed in,
 * because it is the product's own. A project with nothing to show gets the rails' hatch.
 */
function ProjectCard({
  project,
  index,
  wide,
}: {
  readonly project: (typeof projects)[number]
  readonly index: number
  readonly wide: boolean
}) {
  return (
    <li className={`bg-background ${wide ? 'sm:col-span-2' : ''}`}>
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="project-card group flex h-full flex-col focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal"
      >
        <span className="flex h-7 items-center gap-1.5 border-b border-border px-3">
          {[0, 1, 2].map((dot) => (
            <span key={dot} aria-hidden className="size-1.5 rounded-full bg-border transition-colors group-hover:bg-muted-foreground/60" />
          ))}
          <span className="field-label ml-2 min-w-0 truncate tracking-[0.06em] normal-case text-muted-foreground/80">
            {hostOf(project.url)}
          </span>
          <ArrowUpRight
            aria-hidden
            className="ml-auto size-3 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
          />
        </span>

        <span className={`relative block overflow-hidden border-b border-border ${wide ? 'aspect-[16/8]' : 'aspect-[16/10]'}`}>
          {project.image ? (
            <Image
              src={project.image}
              alt={`${project.name} interface`}
              fill
              className="project-shot object-cover object-top"
              sizes={wide ? '(max-width: 640px) 100vw, 46rem' : '(max-width: 640px) 100vw, 23rem'}
            />
          ) : (
            <span className="project-hatch absolute inset-0 grid place-items-center">
              <span className="border border-border bg-background px-3 py-1.5 font-display text-fine text-foreground">
                {project.name}
              </span>
            </span>
          )}
        </span>

        <span className="flex flex-1 flex-col p-[clamp(0.875rem,2vw,1.25rem)]">
          <span className="flex items-baseline gap-3">
            <span className="field-label text-muted-foreground/70">{pad(index + 1)}</span>
            <span className="min-w-0 font-display text-title leading-[1.1] text-foreground">
              <Fact id={`project.${project.id}.name`}>{project.name}</Fact>
            </span>
            <span className="ml-auto">
              <ProjectStatus status={project.status} />
            </span>
          </span>
          <span className="mt-1.5 block pl-[calc(1.5ch+0.75rem)] text-fine text-muted-foreground">
            <Fact id={`project.${project.id}.tagline`}>{project.tagline}</Fact>
          </span>
          <span className={`mt-[var(--space-tight)] block pl-[calc(1.5ch+0.75rem)] text-caption leading-[1.55] text-muted-foreground/75 ${wide ? 'max-w-[60ch]' : 'line-clamp-3'}`}>
            {project.summary}
          </span>
        </span>
      </a>
    </li>
  )
}

/** The three projects the homepage leads with; the rest are on /projects. */
const FEATURED = ['agent-island', 'purge', 'bixai-starter'] as const

/**
 * A boxed grid: the cells share one hairline, the way the rails and section lines do, and the
 * lead project takes the full width of the first row. Only the featured three are here; the
 * last cell of the box is the way through to every project.
 */
function Projects() {
  const featured = FEATURED.map((id) => projects.find((project) => project.id === id)).filter(
    (project): project is (typeof projects)[number] => Boolean(project),
  )

  return (
    <section className="mt-[var(--space-section)]">
      <SectionHead index="04" label="Selected work" note={pad(featured.length)} />

      <div className="measure-column mt-[var(--space-group)] border border-border bg-border">
        <ol className="grid gap-px sm:grid-cols-2">
          {featured.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} wide={index === 0} />
          ))}
        </ol>
        <Link
          href="/projects/"
          className="group mt-px flex items-center justify-between gap-4 bg-background px-[clamp(0.875rem,2vw,1.25rem)] py-4 transition-colors hover:bg-card focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal"
        >
          <span className="field-label tracking-[0.2em] text-foreground">See all projects</span>
          <span className="flex items-center gap-3">
            <span className="field-label text-muted-foreground">{pad(projects.length)} entries</span>
            <ArrowUpRight
              aria-hidden
              className="size-3.5 rotate-45 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:text-foreground"
            />
          </span>
        </Link>
      </div>
    </section>
  )
}

/**
 * Two rails of tools running in opposite directions.
 *
 * A marquee is usually decoration bolted onto a list. Here it *is* the list: every tool keeps
 * its name beside its mark, because a row of bare logos is a quiz and it is invisible to every
 * crawler and language model that reads this page. Counter-rotation is what stops two parallel
 * rails reading as one block sliding sideways.
 *
 * Only tools ride the rails. The group labels used to travel in the stream too, which meant a
 * reader scanning past caught the word "AI" as often as the name of anything — a category is
 * not a tool, and interleaving the two made the list look padded. The taxonomy is not lost: it
 * is still in the data, and the machine view prints these grouped under their field keys, which
 * is the rendering where a label is the point.
 *
 * Hovering stops it, so a name that catches your eye can actually be read.
 */
function Skills() {
  // Languages and frameworks on the top rail, everything else on the bottom. Split by
  // count rather than meaning would leave one rail short enough to show a seam.
  const rails = [skills.slice(0, 2), skills.slice(2)]

  return (
    <section className="mt-[var(--space-section)]">
      <SectionHead index="05" label="Tools" />

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
            {groups.flatMap((group) =>
              group.items.map((item) => (
                <span key={item} className="shrink-0 text-body text-foreground/85">
                  <ToolMark name={item} />
                </span>
              )),
            )}
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
      <SectionHead index="06" label="Writing" note={pad(posts.length)} />
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

export function HumanView({
  posts,
  contributions,
  workbench = [],
}: {
  readonly posts: readonly PostSummary[]
  readonly contributions?: React.ReactNode
  readonly workbench?: readonly WorkbenchSlide[]
}) {
  return (
    <div className="bench measure-page pb-[var(--space-section)]">
      <BenchRails />
      <Masthead />
      <Work />
      {contributions && <div className="mt-[var(--space-section)]">{contributions}</div>}
      <Education />
      <Projects />
      <Skills />
      <Writing posts={posts} />
      <Workbench slides={workbench} />
    </div>
  )
}
