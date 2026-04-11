'use client'

import { ComponentType, useState, useCallback } from 'react'
import { JSX } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Hero from './components/Hero'
import Experience from './components/Experience'
import Skills from './components/Skills'
import Projects from './components/Projects'
import GitHubContributions from './components/GitHubContributions'
import HumanMachineToggle from '@/components/ui/human-machine-toggle'
import MachineView from '@/components/ui/machine-view'

type SectionConfig = {
  key: string
  Component: ComponentType | (() => JSX.Element)
  delay: number
}

const sections: SectionConfig[] = [
  { key: 'hero', Component: Hero, delay: 0.1 },
  { key: 'experience', Component: Experience, delay: 0.3 },
  { key: 'github-contributions', Component: GitHubContributions, delay: 0.4 },
  { key: 'projects', Component: Projects, delay: 0.5 },
  { key: 'skills', Component: Skills, delay: 0.6 }
]

export default function Home() {
  const [isHuman, setIsHuman] = useState(true)

  const handleToggle = useCallback((value: boolean) => {
    setIsHuman(value)
  }, [])

  return (
    <div>
      <HumanMachineToggle isHuman={isHuman} onToggle={handleToggle} />
      
      <AnimatePresence mode="sync">
        {isHuman ? (
          <motion.main
            key="human"
            className="min-h-screen relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="max-w-2xl mx-auto px-3 sm:px-4 py-1 sm:py-2 space-y-0.5 sm:space-y-1">
              {sections.map(({ key, Component }) => (
                <section key={key}>
                  <Component />
                </section>
              ))}
            </div>
          </motion.main>
        ) : (
          <motion.div
            key="machine"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <MachineView isVisible={!isHuman} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
