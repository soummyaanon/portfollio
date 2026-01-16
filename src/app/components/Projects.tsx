'use client'

import { memo } from 'react'
import { BookOpen } from 'lucide-react'
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
  {
    icon: BookOpen,
    title: "Readany",
    subtitle: "PDF Book Reader",
    description:
      "An immersive PDF book reader that transforms static documents into interactive reading experiences with realistic page flipping animations, extensive customization options, and a focus on readability.",
    items: [
      "Realistic page flipping animations with react-pageflip",
      "PDF upload and rendering with react-pdf",
      "Customizable reading themes and layouts",
      "Responsive design for all devices",
      "Bookmark and annotation features",
      "Text-to-speech integration",
      "Advanced zoom and navigation controls",
    ],
    media: "/readny.png",
    button: {
      url: "https://readany.vercel.app/",
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
        entries={projectEntries}
      />
    </section>
  )
}

export default memo(Projects)
