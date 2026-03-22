'use client'

import { memo } from 'react'
import Link from 'next/link'
import TimeLine_01 from '@/components/ui/release-time-line'
import { projectEntries } from '@/data/projects'

function Projects() {
  return (
    <section
      id="projects"
      className="py-4 sm:py-8"
      aria-labelledby="projects-heading"
    >
      <div className="max-w-4xl mx-auto mb-4 sm:mb-6 px-4">
        <p className="text-[11px] sm:text-xs text-muted-foreground/75 leading-relaxed text-justify">
          <i>Most of my projects aren&apos;t shown here because they&apos;re currently used by clients and companies, and per their request, they remain private for now. The projects you see here include two from my learning period, and the current one I&apos;m building is{' '}
          <a 
            href="https://arthionai.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 font-thin underline decoration-primary/50 hover:decoration-primary transition-colors duration-200"
          >
            Arthion AI
          </a>
          , a finance agent. I&apos;ll document each of my works for sure!</i>
        </p>
      </div>
      <TimeLine_01
        title="Projects"
        description="A collection of projects I&apos;ve built, exploring different technologies and solving real-world problems."
        entries={projectEntries.slice(0, 2)}
      />
      <div className="mt-8 flex justify-center">
        <Link 
          href="/projects"
          className="px-6 py-2.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-sm font-medium inline-flex items-center gap-2 group"
        >
          View All Projects
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    </section>
  )
}

export default memo(Projects)
