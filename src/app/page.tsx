'use client'

import { ComponentType } from 'react'
import { motion } from 'framer-motion'
import Hero from './components/Hero'
import About from './components/About'
import Experience from './components/Experience'
import Skills from './components/Skills'
import GitHubContributions from './components/GitHubContributions'
import { DottedGlowBackground } from '@/components/ui/dotted-glow-background'

type SectionConfig = {
  key: string
  Component: ComponentType
  delay: number
}

const sections: SectionConfig[] = [
  { key: 'hero', Component: Hero, delay: 0.1 },
  { key: 'about', Component: About, delay: 0.3 },
  { key: 'experience', Component: Experience, delay: 0.5 },
  { key: 'github-contributions', Component: GitHubContributions, delay: 0.7 },
  { key: 'skills', Component: Skills, delay: 0.9 }
]

export default function Home() {
  return (
    <div>
      <div className="fixed inset-0 pointer-events-none z-0">
        <DottedGlowBackground
          opacity={0.4}
          gap={20}
          radius={1.5}
          colorLightVar="--color-neutral-500"
          glowColorLightVar="--color-neutral-600"
          colorDarkVar="--color-neutral-500"
          glowColorDarkVar="--color-sky-800"
          backgroundOpacity={0}
          speedMin={0.2}
          speedMax={0.8}
          speedScale={1}
        />
      </div>
      <main className="min-h-screen relative z-10">
        <motion.div
        className="max-w-2xl mx-auto px-3 sm:px-4 py-1 sm:py-2 space-y-0.5 sm:space-y-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {sections.map(({ key, Component, delay }) => (
          <motion.section
            key={key}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay }}
          >
            <Component />
          </motion.section>
        ))}
        </motion.div>
      </main>
    </div>
  )
}
