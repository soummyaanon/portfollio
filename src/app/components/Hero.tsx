'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { HyperText } from '@/components/ui/hyper-text'
import { GolangDark } from '@/components/ui/svgs/golangDark'
import { Golang } from '@/components/ui/svgs/golang'
import { useTheme } from 'next-themes'

export default function Hero() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 🎯 UPDATE HERE: Change this to reflect what you're currently learning

  // 🎯 UPDATE HERE: Set the date when you started learning (format: YYYY-MM-DD)
  const learningStartDate = new Date()
  learningStartDate.setDate(learningStartDate.getDate() - 1) // Started yesterday

  // Calculate learning progress based on start date (30-day learning period)
  const now = new Date()
  const daysSinceStart = Math.floor((now.getTime() - learningStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 // +1 to include start day
  const learningPeriodDays = 30 // 30-day learning period
  const monthlyProgress = Math.min((daysSinceStart / learningPeriodDays) * 100, 100) // Cap at 100%
  const progressPercentage = Math.round(monthlyProgress)
  
  // Use resolvedTheme to avoid hydration mismatch
  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <section className="py-6 sm:py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-row items-center justify-center sm:justify-between gap-4 sm:gap-6">
          <div className="flex-1 text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3">
              Hi, I&apos;m <HyperText className="text-primary">Soumyaranjan</HyperText>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-2">
              A Software Engineer.
            </p>

            {/* Learning Indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground/80 mt-3">
              {/* Monthly Progress Loader */}
              <div className="relative w-4 h-4">
                <svg className="w-4 h-4 transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background circle */}
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeOpacity="0.2"
                    className="text-green-500"
                  />
                  {/* Progress circle */}
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={`${monthlyProgress}, 100`}
                    className="text-green-500 transition-all duration-1000 ease-out"
                  />
                </svg>
              </div>
              <span className="text-xs font-medium text-green-500">{progressPercentage}%</span>
              <span>Currently learning:</span>
              {!mounted ? (
                <GolangDark className="w-6 h-6" />
              ) : isDark ? (
                <Golang className="w-6 h-6" />
              ) : (
                <GolangDark className="w-6 h-6" />
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <Image
              src={`https://github.com/soummyaanon.png?v=${new Date().toISOString().split('T')[0]}`}
              alt="Soumyaranjan Panda"
              width={80}
              height={80}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-lg ring-2 ring-primary"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  )
}
