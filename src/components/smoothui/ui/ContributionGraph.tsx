'use client'

import React, { useMemo, useState, type CSSProperties } from 'react'
import { motion } from 'motion/react'

export interface ContributionData {
  date: string
  count: number
  level: number
}

export interface ContributionGraphProps {
  data?: ContributionData[]
  year?: number
  className?: string
  showTooltips?: boolean
  /** A line under the grid, such as a running total. */
  footer?: React.ReactNode
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/**
 * Five steps of grey, like the rest of the site: an empty day is the zinc of the page's
 * hairlines, and each level up is a step lighter, to near-white for the busiest days.
 */
const CONTRIBUTION_GREYS = [
  'oklch(0.2739 0.0055 286)', // Level 0 — no contributions
  'oklch(0.4200 0 0)', // Level 1
  'oklch(0.5800 0 0)', // Level 2
  'oklch(0.7600 0 0)', // Level 3
  'oklch(0.9400 0 0)', // Level 4 — highest
]

// Sized so all 53 weeks fill the reading column without a horizontal scroll, on a phone too.
const CELL_SIZE = 'clamp(0.3rem, 0.78vw, 0.6875rem)'
const CELL_GAP = 'clamp(0.1rem, 0.2vw, 0.19rem)'

export function ContributionGraph({
  data = [],
  year = new Date().getFullYear(),
  className = "",
  showTooltips = true,
  footer,
}: ContributionGraphProps) {
  const [hoveredDay, setHoveredDay] = useState<ContributionData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const graphStyle = useMemo(
    () =>
      ({
        '--cell-size': CELL_SIZE,
        '--cell-gap': CELL_GAP,
      }) as CSSProperties,
    [],
  )
  const tableStyle = useMemo(
    () =>
      ({
        borderSpacing: 'var(--cell-gap)',
      }) as CSSProperties,
    [],
  )

  const contributionColors = CONTRIBUTION_GREYS

  // Generate all days for the year
  const yearData = useMemo(() => {
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)
    const days: ContributionData[] = []

    // Start from the Sunday of the first week that contains January 1st
    // This ensures December gets proper weeks before January
    const firstSunday = new Date(startDate)
    firstSunday.setDate(startDate.getDate() - startDate.getDay())

    // Generate 53 weeks (GitHub shows 53 weeks)
    for (let week = 0; week < 53; week++) {
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(firstSunday)
        currentDate.setDate(firstSunday.getDate() + week * 7 + day)

        // Include days from the previous year's December if they're in the first week
        const isInRange = currentDate >= startDate && currentDate <= endDate
        const isPreviousYearDecember =
          currentDate.getFullYear() === year - 1 &&
          currentDate.getMonth() === 11
        const isNextYearJanuary =
          currentDate.getFullYear() === year + 1 && currentDate.getMonth() === 0

        if (isInRange || isPreviousYearDecember || isNextYearJanuary) {
          const dateString = currentDate.toISOString().split("T")[0]
          const existingData = data.find((d) => d.date === dateString)

          days.push({
            date: dateString,
            count: existingData?.count || 0,
            level: existingData?.level || 0,
          })
        } else {
          // Add empty day for alignment
          days.push({
            date: "",
            count: 0,
            level: 0,
          })
        }
      }
    }

    return days
  }, [data, year])

  // Calculate month headers with colspan
  const monthHeaders = useMemo(() => {
    const headers: { month: string; colspan: number; startWeek: number }[] = []
    const startDate = new Date(year, 0, 1)
    const firstSunday = new Date(startDate)
    firstSunday.setDate(startDate.getDate() - startDate.getDay())

    let currentMonth = -1
    let currentYear = -1
    let monthStartWeek = 0
    let weekCount = 0

    for (let week = 0; week < 53; week++) {
      const weekDate = new Date(firstSunday)
      weekDate.setDate(firstSunday.getDate() + week * 7)

      // Use a combined key for month and year to handle December from previous year
      const monthKey = weekDate.getMonth()
      const yearKey = weekDate.getFullYear()

      if (monthKey !== currentMonth || yearKey !== currentYear) {
        if (currentMonth !== -1) {
          // Only show months from the current year, and only show December from previous year
          // if it actually contains days from the current year and has enough weeks to justify a header
          const shouldShowMonth =
            currentYear === year ||
            (currentYear === year - 1 &&
              currentMonth === 11 &&
              startDate.getDay() !== 0 &&
              weekCount >= 2)

          if (shouldShowMonth) {
            headers.push({
              month: MONTHS[currentMonth],
              colspan: weekCount,
              startWeek: monthStartWeek,
            })
          }
        }
        currentMonth = monthKey
        currentYear = yearKey
        monthStartWeek = week
        weekCount = 1
      } else {
        weekCount++
      }
    }

    // Add the last month
    if (currentMonth !== -1) {
      const shouldShowMonth =
        currentYear === year ||
        (currentYear === year - 1 &&
          currentMonth === 11 &&
          startDate.getDay() !== 0 &&
          weekCount >= 2)

      if (shouldShowMonth) {
        headers.push({
          month: MONTHS[currentMonth],
          colspan: weekCount,
          startWeek: monthStartWeek,
        })
      }
    }

    return headers
  }, [year])

  const handleDayHover = (day: ContributionData, event: React.MouseEvent) => {
    if (showTooltips && day.date) {
      setHoveredDay(day)
      setTooltipPosition({ x: event.clientX, y: event.clientY })
    }
  }

  const handleDayLeave = () => {
    setHoveredDay(null)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getContributionText = (count: number) => {
    if (count === 0) return "No contributions"
    if (count === 1) return "1 contribution"
    return `${count} contributions`
  }

  return (
    <div className={`contribution-graph ${className}`} style={graphStyle}>
      <div className="no-scrollbar overflow-x-auto overflow-y-hidden">
        <table
          className="w-full border-separate font-mono text-[10px] tabular-nums sm:text-xs"
          style={tableStyle}
        >
          <caption className="sr-only">Contribution Graph for {year}</caption>

          {/* Month Headers */}
          <thead>
            <tr className="h-5">
              {monthHeaders.map((header, index) => (
                <td
                  key={index}
                  className="relative text-left text-muted-foreground"
                  colSpan={header.colspan}
                >
                  <span className="absolute top-0 left-0">{header.month}</span>
                </td>
              ))}
            </tr>
          </thead>

          {/* Day Grid */}
          <tbody>
            {Array.from({ length: 7 }, (_, dayIndex) => (
              <tr key={dayIndex}>
                {Array.from({ length: 53 }, (_, weekIndex) => {
                  const dayData = yearData[weekIndex * 7 + dayIndex]
                  if (!dayData || !dayData.date) {
                    return (
                      <td key={weekIndex} className="p-0">
                        <div
                          className="rounded-[3px]"
                          style={{
                            height: 'var(--cell-size)',
                            width: 'var(--cell-size)',
                          }}
                        ></div>
                      </td>
                    )
                  }

                  return (
                    <td
                      key={weekIndex}
                      className="cursor-pointer p-0"
                      onMouseEnter={(e) => handleDayHover(dayData, e)}
                      onMouseLeave={handleDayLeave}
                      title={
                        showTooltips
                          ? `${formatDate(dayData.date)}: ${getContributionText(dayData.count)}`
                          : undefined
                      }
                    >
                      <div
                        className="rounded-[3px] transition-colors hover:ring-1 hover:ring-foreground/60"
                        style={{
                          height: 'var(--cell-size)',
                          width: 'var(--cell-size)',
                          backgroundColor: contributionColors[dayData.level],
                        }}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      {showTooltips && hoveredDay && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="pointer-events-none fixed z-50 rounded-lg border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg backdrop-blur-sm"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 40,
          }}
        >
          <div className="font-semibold">
            {getContributionText(hoveredDay.count)}
          </div>
          <div className="text-muted-foreground">
            {formatDate(hoveredDay.date)}
          </div>
        </motion.div>
      )}

      {footer && <p className="mt-3 font-mono text-[11px] text-muted-foreground sm:text-xs">{footer}</p>}
    </div>
  )
}

export default ContributionGraph
