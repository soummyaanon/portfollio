'use client'

import { memo } from 'react'
import TimeLine_01, { TimeLine_01Entry } from '@/components/ui/release-time-line'

const projectEntries: TimeLine_01Entry[] = [
  {
    logo: "/arthion-logo.ico",
    title: "Arthion AI",
    subtitle: "Financial Intelligence",
    badge: "In Development",
    description:
      "AI-powered financial intelligence platform providing real-time stock analysis, technical indicators, market sentiment tracking, and actionable insights for smarter investment decisions.",
    items: [
      "Real-time stock charts with OHLC and line views",
      "Technical indicators like RSI, MACD analysis",
      "Top movers tracking (Gainers, Losers, Active)",
      "News & sentiment analysis for market insights",
      "AI-powered stock recommendations",
    ],
    media: "/arthion.png",
    button: {
      url: "https://arthionai.app/",
      text: "View Project",
    },
  },
  {
    logo: "/aarekhit-logo.png",
    title: "Aarekhit AI",
    subtitle: "Data Visualization",
    description:
      "An intelligent graph visualization and analysis platform that transforms text and data into stunning interactive visualizations powered by AI analytics in seconds.",
    items: [
      "Interactive graph visualization",
      "AI-powered data analysis",
      "Real-time collaboration",
      "Custom styling and theming",
      "Data import/export capabilities",
    ],
    media: "/aarekhit.png",
    button: {
      url: "https://www.aarekhit.com/",
      text: "View Project",
    },
  },
  {
    logo: "/notex1.png",
    title: "Notex",
    subtitle: "AI Note-Taking",
    description:
      "Experience the future of note-taking with AI-powered insights and the noteX Assistance Bot. Smart organization keeps your thoughts in order while maintaining security and privacy.",
    items: [
      "noteX Bot - AI assistance at your service",
      "Smart organization for structured notes",
      "Secure and private - your data, your control",
      "AI-powered insights and suggestions",
      "Cross-platform synchronization",
    ],
    media: "/notex.png",
    button: {
      url: "https://noteex.vercel.app/",
      text: "View Project",
    },
  },
]

function Projects() {
  return (
    <section
      id="projects"
      className="py-4 sm:py-8"
      aria-labelledby="projects-heading"
    >
      <TimeLine_01
        title="Projects"
        description="A collection of projects I've built, exploring different technologies and solving real-world problems."
        entries={projectEntries}
      />
    </section>
  )
}

export default memo(Projects)
