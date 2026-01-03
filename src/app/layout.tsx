import './globals.css'
import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from './components/ThemeProvider'
import { Chakra_Petch, IBM_Plex_Mono } from 'next/font/google'
import { NavigationDock } from '@/components/ui/dock'

const chakraPetch = Chakra_Petch({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-chakra-petch',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-mono',
})
import { PostHogProvider } from '../components/PostHogProvider'
import Script from 'next/script'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://soumyapanda.me'),
  title: 'Soumya Panda - AI Developer & TypeScript Engineer | AI Product Development',
  description: 'Portfolio of Soumya Panda - AI Developer and TypeScript Engineer specializing in building AI-powered products with OpenAI, Anthropic, Vercel, Next.js, TypeScript, React, and Node.js',
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  icons: {
    icon: '/favicon-2025.png?v=1',
    shortcut: '/favicon-2025.png?v=1',
  },
  keywords: [
    'AI Developer',
    'TypeScript Engineer',
    'AI Product Development',
    'AI Application Builder',
    'OpenAI Integration',
    'Anthropic Claude',
    'Vercel Platform',
    'Next.js AI Apps',
    'React AI Components',
    'Node.js AI Backend',
    'TypeScript AI Development',
    'Artificial Intelligence',
    'Full Stack Developer',
    'AI SaaS Development',
    'AI Chatbots',
    'AI Automation',
    'Healthcare AI',
    'AI-Powered Applications',
    'AI Agent Development',
    'Large Language Models',
    'OpenAI API',
    'GPT Integration',
    'Claude API',
    'AI API Integration',
    'Prompt Engineering',
    'AI Model Integration',
    'Conversational AI',
    'AI Content Generation',
    'AI Workflow Automation',
    'AI Product Design',
    'AI User Experience',
    'AI Frontend Development',
    'AI Backend Development',
    'TypeScript AI Libraries',
    'JavaScript AI Frameworks',
    'AI Deployment',
    'Vercel AI',
    'Next.js 14',
    'React Server Components',
    'AI Streaming',
    'Real-time AI',
    'AI Response Generation',
    'AI Context Management',
    'AI Memory Systems',
    'AI Tool Integration',
    'Software Engineering',
    'Web Development',
    'Frontend Development',
    'Backend Development',
    'API Development',
    'Cloud Computing',
    'DevOps',
    'Agile Development',
    'Git',
    'Version Control',
    'RESTful APIs',
    'GraphQL',
    'Database Design',
    'MongoDB',
    'PostgreSQL',
    'Prisma ORM'
  ],
  authors: [{ name: 'Soumya Panda' }],
  openGraph: {
    title: 'Soumya Panda - AI Developer & TypeScript Engineer | AI Product Development',
    description: 'AI Developer and TypeScript Engineer specializing in building AI-powered products with OpenAI, Anthropic, Vercel, Next.js, TypeScript, React, and Node.js',
    type: 'website',
    images: [{
      url: '/og.png',
      width: 1200,
      height: 630,
      alt: 'Soumya Panda - AI Developer & TypeScript Engineer Portfolio | AI Product Development with OpenAI, Anthropic, Vercel',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Soumya Panda - AI Developer & TypeScript Engineer | AI Product Development',
    description: 'AI Developer and TypeScript Engineer specializing in building AI-powered products with OpenAI, Anthropic, Vercel, Next.js, TypeScript, React, and Node.js',
    images: ['/og.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Soumya Panda",
      "alternateName": "Soumyaranjan Panda",
      "jobTitle": "AI Developer & TypeScript Engineer",
      "description": "AI Developer and TypeScript Engineer specializing in building AI-powered products with OpenAI, Anthropic, Vercel, Next.js, TypeScript, React, and Node.js",
      "url": "https://soumyapanda.me",
      "sameAs": [
        "https://github.com/soummyaanon",
        "https://x.com/SoumyapX",
        "https://www.linkedin.com/in/soumyapanda12/"
      ],
      "knowsAbout": [
        "AI Product Development",
        "TypeScript Development",
        "Next.js",
        "React",
        "Node.js",
        "OpenAI API",
        "Anthropic Claude",
        "Vercel Platform",
        "AI Chatbots",
        "AI Automation",
        "Healthcare AI",
        "AI SaaS Development",
        "Full Stack Development",
        "Web Development"
      ],
      "hasOccupation": {
        "@type": "Occupation",
        "name": "AI Developer",
        "occupationLocation": {
          "@type": "Country",
          "name": "United States"
        },
        "skills": [
          "AI Product Development",
          "TypeScript Programming",
          "OpenAI Integration",
          "Anthropic Claude",
          "Next.js Development",
          "React Development",
          "Node.js Development",
          "AI API Integration",
          "Prompt Engineering",
          "AI Workflow Automation"
        ]
      },
      "alumniOf": {
        "@type": "EducationalOrganization",
        "name": "Visvesvaraya Technological University",
        "educationalCredentialAwarded": "Master of Computer Applications"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Soumya Panda - AI Developer Portfolio",
      "url": "https://soumyapanda.me",
      "description": "Portfolio of AI Developer and TypeScript Engineer specializing in building AI-powered products",
      "author": {
        "@type": "Person",
        "name": "Soumya Panda"
      },
      "publisher": {
        "@type": "Person",
        "name": "Soumya Panda"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://soumyapanda.me/blogs?search={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      "name": "AI Product Development Services",
      "description": "Specialized AI product development using OpenAI, Anthropic Claude, and modern web technologies",
      "provider": {
        "@type": "Person",
        "name": "Soumya Panda"
      },
      "serviceType": "AI Development",
      "areaServed": "Worldwide",
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "AI Development Services",
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "AI Chatbot Development",
              "description": "Building conversational AI chatbots using OpenAI and Anthropic APIs"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "AI SaaS Applications",
              "description": "Developing AI-powered SaaS products with modern web technologies"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "AI API Integration",
              "description": "Integrating AI APIs including OpenAI, Anthropic Claude, and other AI services"
            }
          }
        ]
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://soumyapanda.me"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Blog",
          "item": "https://soumyapanda.me/blogs"
        }
      ]
    }
  ]

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="" />
        <meta name="msvalidate.01" content="" />
        <meta name="yandex-verification" content="" />
        <meta name="author" content="Soumya Panda" />
        <meta name="publisher" content="Soumya Panda" />
        <meta name="language" content="en-US" />
        <meta name="geo.region" content="US" />
        <meta name="geo.placename" content="United States" />
        <link rel="canonical" href="https://soumyapanda.me" />
        <link rel="alternate" hrefLang="en" href="https://soumyapanda.me" />
        {structuredData.map((data, index) => (
          <Script
            key={index}
            id={`structured-data-${index}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(data),
            }}
          />
        ))}
      </head>
      <body className={`${chakraPetch.variable} ${ibmPlexMono.variable}`}>
        <PostHogProvider />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <NavigationDock />
        </ThemeProvider>
        <Script
          id="companion-samurai"
          src="https://cdn.jsdelivr.net/gh/Manas-Kenge/companion.js@main/companion.js"
          strategy="afterInteractive"
          data-variant="wanderer-magician"
          data-height="80"
          data-speed="9"
          data-idle-distance="54"
          data-death-interval="42"
          data-death-duration="75"
          data-persist-position="true"
        />
      </body>
    </html>
  )
}