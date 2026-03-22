import { BookOpen } from 'lucide-react'
import { TimeLine_01Entry } from '@/components/ui/release-time-line'

export const projectEntries: TimeLine_01Entry[] = [
  {
    icon: BookOpen,
    title: "Marcko",
    subtitle: "Open Source Markdown Editor",
    description:
      "Open source markdown editor with real-time preview, secure document sharing, encryption at rest, and AI integration. Free for developers and writers.",
    items: [
      "Real-time markdown preview",
      "Secure enterprise document sharing",
      "Encryption at rest for privacy",
      "AI integration for seamless writing",
    ],
    media: "/marcko-og.png",
    button: {
      url: "https://marcko.bixai.dev",
      text: "View Project",
    },
  },
  {
    icon: BookOpen,
    title: "Bixai Agent SDK Starter",
    subtitle: "Next.js AI Agent Template",
    description:
      "Create production-ready AI agent apps with Next.js and the OpenAI Agents SDK. Features a clean structure, modular tools, and fast setup process.",
    items: [
      "Production-ready Next.js integration",
      "OpenAI Agents SDK support",
      "Modular tool and agent structure",
      "Fast setup and deployment capabilities",
    ],
    media: "/create-bixai-og.jpg",
    button: {
      url: "https://create.bixai.dev",
      text: "View Project",
    },
  },
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
