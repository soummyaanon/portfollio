'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import TimeLine_01 from '@/components/ui/release-time-line'
import { projectEntries } from '@/data/projects'

export default function ProjectsPage() {
  return (
    <main className="min-h-screen relative z-10 py-12">
      <motion.div
        className="max-w-2xl mx-auto px-3 sm:px-4 space-y-4 pt-[10vh] pb-[40vh]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </div>
        
        <TimeLine_01
          title="All Projects"
          description="A complete timeline of all my projects and developments, showcasing everything from AI platforms to data tools."
          entries={projectEntries}
        />
      </motion.div>
    </main>
  )
}
