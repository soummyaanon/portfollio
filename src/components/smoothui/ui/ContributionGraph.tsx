'use client'

import React, { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useTheme } from 'next-themes'
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
  showLegend?: boolean
  showTooltips?: boolean
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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// GitHub contribution colors (official palettes)
const GITHUB_CONTRIBUTION_COLORS_LIGHT = [
  '#ebedf0', // Level 0 — no contributions
  '#9be9a8', // Level 1
  '#40c463', // Level 2
  '#30a14e', // Level 3
  '#216e39', // Level 4 — highest
]

const GITHUB_CONTRIBUTION_COLORS_DARK = [
  '#161b22', // Level 0 — no contributions
  '#0e4429', // Level 1
  '#006d32', // Level 2
  '#26a641', // Level 3
  '#39d353', // Level 4 — highest
]

const CONTRIBUTION_LEVELS = [0, 1, 2, 3, 4]

// Responsive sizing to keep the grid inside its container without horizontal scroll
const CELL_SIZE = 'clamp(0.25rem, 0.7vw, 0.55rem)'
const CELL_GAP = 'clamp(0.08rem, 0.25vw, 0.25rem)'
// Ensure day labels never shrink too small (prevents overlap with the grid)
const DAY_LABEL_WIDTH = 'clamp(1.4rem, calc(var(--cell-size) * 2.8), 2.25rem)'

export function ContributionGraph({
  data = [],
  year = new Date().getFullYear(),
  className = "",
  showLegend = true,
  showTooltips = true,
}: ContributionGraphProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
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

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  const contributionColors = useMemo(
    () =>
      isDark
        ? GITHUB_CONTRIBUTION_COLORS_DARK
        : GITHUB_CONTRIBUTION_COLORS_LIGHT,
    [isDark],
  )

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
          className="w-full border-separate text-[10px] sm:text-xs"
          style={tableStyle}
        >
          <caption className="sr-only">Contribution Graph for {year}</caption>

          {/* Month Headers */}
          <thead>
            <tr className="h-3">
              <td
                className="w-7 min-w-7"
                style={{ width: DAY_LABEL_WIDTH, minWidth: DAY_LABEL_WIDTH }}
              ></td>
              {monthHeaders.map((header, index) => (
                <td
                  key={index}
                  className="text-foreground relative text-left"
                  colSpan={header.colspan}
                >
                  <span className="absolute top-0 left-1">{header.month}</span>
                </td>
              ))}
            </tr>
          </thead>

          {/* Day Grid */}
          <tbody>
            {Array.from({ length: 7 }, (_, dayIndex) => (
              <tr key={dayIndex} className="h-2.5">
                {/* Day Labels */}
                <td
                  className="text-foreground relative"
                  style={{ width: DAY_LABEL_WIDTH, minWidth: DAY_LABEL_WIDTH }}
                >
                  {dayIndex % 2 === 0 && (
                    <span className="absolute -bottom-0.5 right-1 text-xs">
                      {DAYS[dayIndex]}
                    </span>
                  )}
                </td>

                {/* Day Cells */}
                {Array.from({ length: 53 }, (_, weekIndex) => {
                  const dayData = yearData[weekIndex * 7 + dayIndex]
                  if (!dayData || !dayData.date) {
                    return (
                      <td key={weekIndex} className="p-0">
                        <div
                          className="rounded-sm"
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
                        className="rounded-sm transition-colors hover:ring-2 hover:ring-background"
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

      {/* Legend */}
      {showLegend && (
        <div className="text-foreground/70 mt-4 flex items-center justify-between text-xs">
          <span>Less</span>
          <div className="flex items-center gap-1">
            {CONTRIBUTION_LEVELS.map((level) => (
              <div
                key={level}
                className="h-3 w-3 rounded-sm border border-border"
                style={{ backgroundColor: contributionColors[level] }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      )}
    </div>
  )
}

export default ContributionGraph
