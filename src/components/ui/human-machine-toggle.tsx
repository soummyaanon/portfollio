'use client'

import { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { GeistMono } from 'geist/font/mono'

interface HumanMachineToggleProps {
  readonly isHuman: boolean
  readonly onToggle: (isHuman: boolean) => void
}

function HumanMachineToggle({ isHuman, onToggle }: HumanMachineToggleProps) {
  const handleToggle = useCallback(() => {
    onToggle(!isHuman)
  }, [isHuman, onToggle])

  return (
    <motion.div 
      className="fixed top-4 right-4 z-50"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <button
        onClick={handleToggle}
        className={`${GeistMono.className} flex items-center border border-border bg-background/80 backdrop-blur-sm hover:bg-muted transition-colors`}
        aria-label={`Switch to ${isHuman ? 'Machine' : 'Human'} mode`}
      >
        {/* Human */}
        <span 
          className={`px-3 py-2 text-[10px] uppercase tracking-widest transition-colors ${
            isHuman 
              ? 'bg-foreground text-background' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Human
        </span>
        
        {/* Machine */}
        <span 
          className={`px-3 py-2 text-[10px] uppercase tracking-widest transition-colors ${
            !isHuman 
              ? 'bg-foreground text-background' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Machine
        </span>
      </button>
    </motion.div>
  )
}

export default memo(HumanMachineToggle)
