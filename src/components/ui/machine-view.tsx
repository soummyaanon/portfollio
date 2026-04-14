'use client'

import { memo, useState, useRef, useCallback, useEffect, useMemo, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check } from 'lucide-react'
import { GeistMono } from 'geist/font/mono'

interface MachineViewProps {
  readonly isVisible: boolean
}

interface WaveState {
  wavePosition: number
  mouseX: number
  mouseY: number
}

const WaveContext = createContext<WaveState>({ wavePosition: 0, mouseX: -1000, mouseY: -1000 })

const DECODE_CHARS = '01█▓▒░'

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

function HoverChar({ 
  char, 
  globalIdx, 
  isWaveActive 
}: { 
  char: string
  globalIdx: number
  isWaveActive: boolean 
}) {
  const { mouseX, mouseY } = useContext(WaveContext)
  const charRef = useRef<HTMLSpanElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!charRef.current || mouseX < 0) {
      setIsHovered(false)
      return
    }
    
    const rect = charRef.current.getBoundingClientRect()
    const charCenterX = rect.left + rect.width / 2
    const charCenterY = rect.top + rect.height / 2
    const distance = Math.sqrt(
      Math.pow(mouseX - charCenterX, 2) + 
      Math.pow(mouseY - charCenterY, 2)
    )
    
    setIsHovered(distance < 60)
  }, [mouseX, mouseY])

  const isActive = isWaveActive || isHovered
  const displayChar = isActive 
    ? DECODE_CHARS[Math.floor(Math.random() * DECODE_CHARS.length)]
    : char

  return (
    <span 
      ref={charRef}
      className={isActive ? 'text-green-500' : ''}
      style={{ transition: 'color 0.15s ease-out' }}
    >
      {displayChar}
    </span>
  )
}

function TextContent({ lines }: { lines: string[] }) {
  const { wavePosition } = useContext(WaveContext)
  
  const charData = useMemo(() => {
    const data: { char: string; lineIdx: number; globalIdx: number }[] = []
    let globalIdx = 0
    
    lines.forEach((line, lineIdx) => {
      line.split('').forEach((char) => {
        data.push({ char, lineIdx, globalIdx })
        globalIdx++
      })
      globalIdx++
    })
    
    return data
  }, [lines])

  const activeSet = useMemo(() => {
    const waveWidth = 35
    const active = new Set<number>()
    
    charData.forEach(({ globalIdx }) => {
      const distance = Math.abs(globalIdx - wavePosition)
      if (distance < waveWidth) {
        active.add(globalIdx)
      }
    })
    
    return active
  }, [wavePosition, charData])

  const lineGroups = useMemo(() => {
    const groups: { char: string; globalIdx: number }[][] = []
    let currentLine: { char: string; globalIdx: number }[] = []
    let currentLineIdx = 0
    
    charData.forEach(({ char, lineIdx, globalIdx }) => {
      if (lineIdx !== currentLineIdx) {
        groups.push(currentLine)
        currentLine = []
        currentLineIdx = lineIdx
      }
      currentLine.push({ char, globalIdx })
    })
    groups.push(currentLine)
    
    return groups
  }, [charData])

  return (
    <>
      {lineGroups.map((lineChars, lineIdx) => (
        <span key={lineIdx} className="block py-[1px]">
          {lineChars.map(({ char, globalIdx }) => {
            if (char === ' ') return <span key={globalIdx}> </span>
            
            return (
              <HoverChar
                key={globalIdx}
                char={char}
                globalIdx={globalIdx}
                isWaveActive={activeSet.has(globalIdx)}
              />
            )
          })}
        </span>
      ))}
    </>
  )
}

function MachineView({ isVisible }: MachineViewProps) {
  const [copied, setCopied] = useState(false)
  const [wavePosition, setWavePosition] = useState(0)
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 })
  const containerRef = useRef<HTMLDivElement>(null)

  const lines = useMemo(() => MARKDOWN_CONTENT.split('\n'), [])
  const totalChars = useMemo(() => lines.length * 100, [lines.length])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(MARKDOWN_CONTENT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setMousePos({ x: -1000, y: -1000 })
  }, [])

  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setWavePosition(prev => {
        const next = prev + 5
        return next > totalChars ? 0 : next
      })
    }, 40)

    return () => clearInterval(interval)
  }, [isVisible, totalChars])

  const waveState = useMemo(() => ({
    wavePosition,
    mouseX: mousePos.x,
    mouseY: mousePos.y
  }), [wavePosition, mousePos.x, mousePos.y])

  if (!isVisible) return null

  return (
    <WaveContext.Provider value={waveState}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="fixed inset-0 z-40 bg-background"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
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

        <div 
          ref={containerRef}
          className="h-screen overflow-y-auto overflow-x-hidden px-4 py-8 pb-24"
        >
          <div className="max-w-2xl mx-auto">
            <div className="sr-only" aria-label="Raw markdown content for AI agents">
              {MARKDOWN_CONTENT}
            </div>

            <pre 
              className={`${GeistMono.className} text-xs sm:text-sm leading-loose whitespace-pre-wrap break-words text-foreground/90 tracking-wide`}
            >
              <code className="block">
                <TextContent lines={lines} />
              </code>
            </pre>
          </div>
        </div>
      </motion.div>
    </WaveContext.Provider>
  )
}

export default memo(MachineView)
