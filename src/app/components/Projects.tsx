'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

function Projects() {
  return (
    <section 
      id="projects" 
      className="py-4 sm:py-8"
      aria-labelledby="projects-heading"
    >
      <div className="max-w-4xl mx-auto">
        <h2 
          id="projects-heading"
          className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6"
        >
          Projects
        </h2>

        <div className="flex w-full items-center justify-center py-12 sm:py-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative z-10"
          >
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter">
              <span className={cn(
                "animate-pulse bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-clip-text text-transparent",
                "drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] dark:drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]"
              )}>
                Coming Soon
              </span>
            </h3>
            <p className="mt-4 text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
              We are working on something amazing. Check back later to see our latest projects         </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default memo(Projects)
