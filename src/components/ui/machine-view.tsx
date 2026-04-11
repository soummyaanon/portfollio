'use client'

import { memo, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check } from 'lucide-react'
import { GeistMono } from 'geist/font/mono'

interface MachineViewProps {
  readonly isVisible: boolean
}

const MARKDOWN_CONTENT = `# SOUMYARANJAN PANDA

> Software Engineer | AI Developer | TypeScript Engineer

---

## $ whoami

\`\`\`yaml
name: "Soumyaranjan Panda"
role: "Software Engineer"
focus: ["AI-driven tools", "Healthcare AI Solutions"]
currently_building: "Arthion AI"
learning: "Go"
location: "Asia/Kolkata"
\`\`\`

I build **AI-driven tools** that reduce human workload, currently focusing on **healthcare AI solutions** that streamline physicians' workflows. I also enjoy **deep-space science** and following **political developments**.

---

## $ cat experience.md

### Wybit
- **Role:** Software Engineer
- **Period:** Jul 2025 - Present
- **Location:** Orlando, Florida, United States · Remote
- **Description:** Developing agents that are going to reshape healthcare.
- **Skills:** \`OpenAI\` \`AI\` \`Next.js\` \`SaaS\` \`Software Design\`

### Cloudoplus
- **Role:** AI Engineer  
- **Period:** Apr 2025 - Aug 2025
- **Location:** Santa Ana, California, United States · Remote
- **Description:** Developed an AI-powered QA agent to streamline and automate the quality assurance process.
- **Skills:** \`AI\` \`Machine Learning\` \`Python\` \`QA Automation\` \`Next.js\` \`React.js\` \`Node.js\`

### Chatsguru
- **Role:** AI Engineer
- **Period:** Sep 2024 - Apr 2025
- **Location:** Ahmedabad, Gujarat, India · Remote
- **Description:** Developed 2-3 AI-powered products including an AI-based social media platform for unified posting.
- **Skills:** \`Next.js\` \`React.js\` \`Tailwind CSS\` \`AI\` \`Machine Learning\` \`API Integration\`

---

## $ cat education.md

### Visvesvaraya Technological University
- **Degree:** Master of Computer Applications - MCA, Computer Science
- **Period:** Dec 2022 - Oct 2024
- **Focus:** Software Development, Algorithms, Data Structures

---

## $ ls -la skills/

\`\`\`
drwxr-xr-x  languages/
drwxr-xr-x  frameworks/
drwxr-xr-x  tools/
drwxr-xr-x  databases/
\`\`\`

### Languages
- TypeScript
- JavaScript
- Python
- Go (learning)

### Frameworks
- Next.js
- React
- Node.js

### Tools & Services
- OpenAI API
- Prisma
- Git
- Shadcn UI

### Databases
- PostgreSQL
- MongoDB

---

## $ cat projects.json | jq '.[] | .title'

### [Marcko](https://marcko.bixai.dev)
> Open Source Markdown Editor
- Real-time markdown preview
- Secure enterprise document sharing
- Encryption at rest for privacy
- AI integration for seamless writing

### [Bixai Agent SDK Starter](https://create.bixai.dev)
> Next.js AI Agent Template
- Production-ready Next.js integration
- OpenAI Agents SDK support
- Modular tool and agent structure

### [Arthion AI](https://arthionai.app/) 🚧 In Development
> Financial Intelligence Platform
- Real-time stock charts with OHLC and line views
- Technical indicators like RSI, MACD analysis
- AI-powered stock recommendations

### [Aarekhit AI](https://www.aarekhit.com/)
> Data Visualization Platform
- Interactive graph visualization
- AI-powered data analysis
- Real-time collaboration

### [Notex](https://noteex.vercel.app/)
> AI Note-Taking Application
- noteX Bot - AI assistance
- Smart organization for structured notes
- Secure and private

### [Readany](https://readany.vercel.app/)
> PDF Book Reader
- Realistic page flipping animations
- Customizable reading themes

---

## $ cat contact.json

\`\`\`json
{
  "github": "https://github.com/soummyaanon",
  "twitter": "https://x.com/SoumyapX",
  "linkedin": "https://www.linkedin.com/in/soumyapanda12/",
  "website": "https://soumyapanda.me"
}
\`\`\`

---

## $ echo $QUOTE

> सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।
> अहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः ॥

---

\`\`\`
$ exit 0
Connection to soumyapanda.me closed.
\`\`\`
`

function MachineView({ isVisible }: MachineViewProps) {
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(MARKDOWN_CONTENT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [])

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="fixed inset-0 z-40 bg-background"
    >
      {/* Copy button - fixed top right below toggle */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.1 }}
        onClick={handleCopy}
        className={`${GeistMono.className} fixed top-16 right-4 z-50 flex items-center gap-2 px-3 py-2 border border-border bg-background/80 backdrop-blur-sm hover:bg-muted transition-colors text-[10px] uppercase tracking-widest`}
        aria-label="Copy markdown content"
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span
              key="copied"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 text-foreground"
            >
              <Check className="w-3 h-3" />
              Copied
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Copy className="w-3 h-3" />
              Copy All
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Content - fully readable by agents, no animation delay */}
      <div 
        ref={containerRef}
        className="h-screen overflow-y-auto overflow-x-hidden px-4 py-8 pb-24"
      >
        <div className="max-w-2xl mx-auto">
          {/* Raw markdown for agents - hidden visually but accessible */}
          <div className="sr-only" aria-label="Raw markdown content for AI agents">
            {MARKDOWN_CONTENT}
          </div>

          {/* Visible formatted content */}
          <pre 
            className={`${GeistMono.className} text-xs sm:text-sm leading-loose whitespace-pre-wrap break-words text-foreground/90 tracking-wide`}
          >
            <code className="block">
              {MARKDOWN_CONTENT.split('\n').map((line, index) => (
                <span key={index} className="block py-[1px]">
                  {renderMarkdownLine(line)}
                </span>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </motion.div>
  )
}

function renderMarkdownLine(line: string): React.ReactNode {
  if (line.startsWith('# ')) {
    return <span className="text-foreground font-semibold text-base sm:text-lg">{line}</span>
  }
  if (line.startsWith('## ')) {
    return <span className="text-foreground/90 font-medium text-sm sm:text-base">{line}</span>
  }
  if (line.startsWith('### ')) {
    return <span className="text-foreground/80 font-medium">{line}</span>
  }
  if (line.startsWith('> ')) {
    return <span className="text-muted-foreground italic">{line}</span>
  }
  if (line.startsWith('---')) {
    return <span className="text-muted-foreground/40">{line}</span>
  }
  if (line.startsWith('- ')) {
    return (
      <span>
        <span className="text-muted-foreground">-</span>
        <span className="text-foreground/80">{line.slice(1)}</span>
      </span>
    )
  }
  if (line.startsWith('```')) {
    return <span className="text-muted-foreground">{line}</span>
  }
  if (line.includes('**')) {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    return (
      <>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <span key={i} className="text-foreground font-medium">{part}</span>
          }
          return <span key={i}>{renderInlineCode(part)}</span>
        })}
      </>
    )
  }
  if (line.includes('`')) {
    return renderInlineCode(line)
  }
  if (line.match(/^\[.+\]\(.+\)$/)) {
    return <span className="text-foreground/70 underline underline-offset-2">{line}</span>
  }
  return <span className="text-foreground/80">{line}</span>
}

function renderInlineCode(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <span key={i} className="bg-muted text-foreground/90 px-1 rounded text-[10px] sm:text-xs">
              {part}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

export default memo(MachineView)
