# Portfolio Website Development Guide

## 🚀 Project Overview

This guide will help you build a modern, single-page portfolio website with a separate blogs page using Next.js 14 (latest version). The design is inspired by minimalist portfolio websites with clean typography and focused content presentation.

## 📋 Prerequisites

- Node.js 18.17 or later
- npm or yarn package manager
- Basic knowledge of React and Next.js

## 🏗️ Project Structure

```
my-portfolio/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── blogs/
│   │   └── page.tsx
│   └── components/
│       ├── Navigation.tsx
│       ├── Hero.tsx
│       ├── About.tsx
│       ├── Experience.tsx
│       ├── Skills.tsx
│       └── Footer.tsx
├── public/
│   ├── profile.png
│   └── favicon.ico
├── README.md
└── package.json
```

## 📄 File Contents

### 1. app/layout.tsx

```tsx
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Your Name - Software Developer',
  description: 'Portfolio of [Your Name] - Full-stack Developer specializing in Next.js, TypeScript, and AI systems',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

### 2. app/page.tsx (Main Portfolio Page)

```tsx
import Navigation from './components/Navigation'
import Hero from './components/Hero'
import About from './components/About'
import Experience from './components/Experience'
import Skills from './components/Skills'
import Footer from './components/Footer'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Hero />
        <About />
        <Experience />
        <Skills />
      </div>
      <Footer />
    </main>
  )
}
```

### 3. app/blogs/page.tsx

```tsx
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'

export default function Blogs() {
  const blogPosts = [
    {
      title: "Building Healthcare AI Systems with Next.js",
      date: "September 2025",
      excerpt: "My journey in developing HIPAA-compliant AI applications using modern web technologies.",
      slug: "healthcare-ai-nextjs"
    },
    {
      title: "OpenAI Agent SDK: Real-world Implementation",
      date: "August 2025", 
      excerpt: "Deep dive into building intelligent agents with TypeScript and OpenAI's latest SDK.",
      slug: "openai-agent-sdk-implementation"
    },
    {
      title: "Modern Full-Stack Development in 2025",
      date: "July 2025",
      excerpt: "Exploring the latest trends in web development including vector databases and AI integration.",
      slug: "modern-fullstack-2025"
    }
  ]

  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog</h1>
          <p className="text-lg text-gray-600">Thoughts on technology, development, and building the future.</p>
        </div>
        
        <div className="space-y-8">
          {blogPosts.map((post, index) => (
            <article key={index} className="border-b border-gray-200 pb-8">
              <div className="mb-2">
                <span className="text-sm text-gray-500">{post.date}</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3 hover:text-blue-600 cursor-pointer">
                {post.title}
              </h2>
              <p className="text-gray-600 leading-relaxed">{post.excerpt}</p>
              <div className="mt-4">
                <span className="text-blue-600 hover:underline cursor-pointer">Read more →</span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  )
}
```

### 4. app/components/Navigation.tsx

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Your Name
          </Link>
          <div className="flex space-x-6">
            <Link 
              href="/" 
              className={`hover:text-blue-600 transition-colors ${pathname === '/' ? 'text-blue-600' : 'text-gray-600'}`}
            >
              Home
            </Link>
            <Link 
              href="/blogs" 
              className={`hover:text-blue-600 transition-colors ${pathname === '/blogs' ? 'text-blue-600' : 'text-gray-600'}`}
            >
              Blog
            </Link>
            <a 
              href="mailto:your.email@example.com" 
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}
```

### 5. app/components/Hero.tsx

```tsx
import Image from 'next/image'

export default function Hero() {
  return (
    <section className="py-20">
      <div className="flex items-center space-x-8">
        <div className="flex-1">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Hi, I'm <span className="text-blue-600">Your Name</span>
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Software Developer from Cuttack, Odisha
          </p>
          <p className="text-lg text-gray-500 leading-relaxed">
            Building the future with AI-powered healthcare systems, modern web technologies, 
            and a passion for creating solutions that make a difference.
          </p>
        </div>
        <div className="flex-shrink-0">
          <Image
            src="/profile.png"
            alt="Profile Picture"
            width={200}
            height={200}
            className="rounded-full shadow-lg"
          />
        </div>
      </div>
    </section>
  )
}
```

### 6. app/components/About.tsx

```tsx
export default function About() {
  return (
    <section id="about" className="py-16">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">About</h2>
      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 leading-relaxed mb-6">
          <strong>tldr;</strong> learnt by building real-world applications and solving complex problems.
        </p>
        <p className="text-gray-600 leading-relaxed mb-6">
          I'm passionate about technology and innovation, especially in the healthcare domain. 
          I believe in building solutions that make a meaningful impact on people's lives.
        </p>
        <p className="text-gray-600 leading-relaxed">
          When I'm not coding, I enjoy sprint training, dragon fruit farming, mobile photography, 
          and staying updated with the latest tech trends. I'm also pursuing academic studies in 
          physics and chemistry.
        </p>
      </div>
    </section>
  )
}
```

### 7. app/components/Experience.tsx

```tsx
export default function Experience() {
  const experiences = [
    {
      company: "Healthcare AI Projects",
      period: "2024 - Present",
      role: "Full-Stack Developer",
      description: "Building HIPAA-compliant AI systems using Next.js, TypeScript, and OpenAI's Agent SDK. Developing RAG systems with vector databases for healthcare data processing."
    },
    {
      company: "Client Projects", 
      period: "2023 - Present",
      role: "Freelance Developer",
      description: "Delivering custom web applications and AI solutions for various clients. Specialized in modern React ecosystem and cloud-first architecture."
    },
    {
      company: "Academic Research",
      period: "2023 - Present", 
      role: "Student Researcher",
      description: "Pursuing studies in physics and chemistry while applying computational methods to solve complex scientific problems."
    }
  ]

  return (
    <section id="experience" className="py-16">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Experience</h2>
      <div className="space-y-8">
        {experiences.map((exp, index) => (
          <div key={index} className="border-l-4 border-blue-600 pl-6">
            <div className="mb-2">
              <h3 className="text-xl font-semibold text-gray-900">{exp.company}</h3>
              <div className="flex justify-between items-center">
                <span className="text-blue-600 font-medium">{exp.role}</span>
                <span className="text-sm text-gray-500">{exp.period}</span>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed">{exp.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

### 8. app/components/Skills.tsx

```tsx
export default function Skills() {
  const skills = [
    "Next.js", "TypeScript", "React", "Node.js", 
    "OpenAI SDK", "Python", "Prisma", "Azure",
    "Vector Databases", "HIPAA Compliance", "shadcn UI",
    "Tailwind CSS", "Git", "Vercel", "RESTful APIs"
  ]

  return (
    <section id="skills" className="py-16">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Skills</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {skills.map((skill, index) => (
          <div 
            key={index}
            className="bg-gray-50 px-4 py-2 rounded-lg text-center text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            {skill}
          </div>
        ))}
      </div>
    </section>
  )
}
```

### 9. app/components/Footer.tsx

```tsx
import { Github, Linkedin, Twitter, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">
            © 2025 Your Name. Building the future, one line of code at a time.
          </p>
          <div className="flex space-x-4">
            <a href="https://github.com/yourusername" className="text-gray-400 hover:text-gray-600">
              <Github size={20} />
            </a>
            <a href="https://linkedin.com/in/yourusername" className="text-gray-400 hover:text-gray-600">
              <Linkedin size={20} />
            </a>
            <a href="https://twitter.com/yourusername" className="text-gray-400 hover:text-gray-600">
              <Twitter size={20} />
            </a>
            <a href="mailto:your.email@example.com" className="text-gray-400 hover:text-gray-600">
              <Mail size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
```

### 10. app/globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  scroll-behavior: smooth;
}

body {
  font-feature-settings: 'rlig' 1, 'calt' 1;
}

.prose h1,
.prose h2,
.prose h3,
.prose h4 {
  font-weight: 600;
}
```

## 🎨 Customization Guide

### 1. Personal Information
- Replace "Your Name" with your actual name throughout the files
- Update email addresses and social media links
- Add your actual work experience in `Experience.tsx`
- Customize the skills list based on your expertise

### 2. Profile Picture
- Add your profile picture to `public/profile.png`
- Ensure it's a square image (recommended: 400x400px)

### 3. Color Scheme
- Primary: Blue (`blue-600`)
- Text: Gray scale (`gray-900`, `gray-600`, `gray-500`)
- Background: White with gray accents

### 4. Content Customization
- Update the hero description to match your background
- Modify the about section with your personal story
- Add real project experiences
- Update blog posts with your actual content

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Manual Build
```bash
npm run build
npm start
```

## 📱 Responsive Design

The portfolio is fully responsive with:
- Mobile-first approach
- Breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Touch-friendly navigation
- Optimized typography for all screen sizes

## 🔧 Additional Features to Add

1. **Dark Mode**: Implement with `next-themes`
2. **Blog CMS**: Connect to Contentful or Sanity
3. **Contact Form**: Add with EmailJS or Formspree
4. **Analytics**: Integrate Google Analytics or Plausible
5. **SEO**: Add structured data and meta tags
6. **Performance**: Optimize images and implement lazy loading

## ⚡ Advanced Implementation Features

### 1. Dynamic Meta Tags and SEO

```tsx
// app/layout.tsx - Enhanced with dynamic metadata
export const metadata: Metadata = {
  title: 'Your Name - Software Developer',
  description: 'Portfolio of [Your Name] - Full-stack Developer specializing in Next.js, TypeScript, and AI systems',
  keywords: ['Full Stack Developer', 'Next.js', 'TypeScript', 'AI Systems', 'Healthcare'],
  authors: [{ name: 'Your Name' }],
  openGraph: {
    title: 'Your Name - Software Developer',
    description: 'Full-stack Developer specializing in Next.js, TypeScript, and AI systems',
    type: 'website',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your Name - Software Developer',
    description: 'Full-stack Developer specializing in Next.js, TypeScript, and AI systems',
    images: ['/og-image.jpg'],
  },
}
```

### 2. Contact Form Implementation

```tsx
// app/components/Contact.tsx
'use client'
import { useState } from 'react'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        alert('Message sent successfully!')
        setFormData({ name: '', email: '', message: '' })
      }
    } catch (error) {
      alert('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="contact" className="py-16">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Get In Touch</h2>
      <form onSubmit={handleSubmit} className="max-w-md">
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Message
          </label>
          <textarea
            id="message"
            rows={4}
            value={formData.message}
            onChange={(e) => setFormData({...formData, message: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </section>
  )
}
```

### 3. Projects Showcase Section

```tsx
// app/components/Projects.tsx
export default function Projects() {
  const projects = [
    {
      title: "Healthcare AI Platform",
      description: "HIPAA-compliant AI system for medical data processing",
      tech: ["Next.js", "OpenAI SDK", "TypeScript", "Azure"],
      github: "https://github.com/username/healthcare-ai",
      demo: "https://healthcare-demo.vercel.app"
    },
    {
      title: "E-commerce Analytics",
      description: "Real-time analytics dashboard for e-commerce platforms",
      tech: ["React", "Node.js", "MongoDB", "D3.js"],
      github: "https://github.com/username/ecommerce-analytics",
      demo: "https://analytics-demo.vercel.app"
    }
  ]

  return (
    <section id="projects" className="py-16">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Featured Projects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {projects.map((project, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{project.title}</h3>
            <p className="text-gray-600 mb-4">{project.description}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {project.tech.map((tech, techIndex) => (
                <span key={techIndex} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                  {tech}
                </span>
              ))}
            </div>
            <div className="flex space-x-4">
              <a href={project.github} className="text-blue-600 hover:underline">Code</a>
              <a href={project.demo} className="text-blue-600 hover:underline">Demo</a>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

### 4. Theme Provider for Dark Mode

```tsx
// app/components/ThemeProvider.tsx
'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// app/layout.tsx - Wrap with ThemeProvider
import { ThemeProvider } from './components/ThemeProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### 5. Performance Optimization

```tsx
// next.config.ts - Enhanced configuration
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    domains: ['images.unsplash.com', 'avatars.githubusercontent.com'],
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    optimizeCss: true,
    webVitalsAttribution: ['CLS', 'LCP'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

## 📊 Analytics Integration

### Google Analytics 4

```tsx
// app/components/GoogleAnalytics.tsx
'use client'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function GoogleAnalytics({ GA_MEASUREMENT_ID }: { GA_MEASUREMENT_ID: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const url = pathname + searchParams.toString()

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: url,
      })
    }
  }, [pathname, searchParams, GA_MEASUREMENT_ID])

  return null
}

// app/layout.tsx - Add GA script
import GoogleAnalytics from './components/GoogleAnalytics'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <GoogleAnalytics GA_MEASUREMENT_ID={process.env.NEXT_PUBLIC_GA_ID || ''} />
        {children}
      </body>
    </html>
  )
}
```

## 🚀 Deployment Optimization

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_GA_ID=GA_MEASUREMENT_ID
NEXT_PUBLIC_SITE_URL=https://yourportfolio.com
DATABASE_URL=your_database_url
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_PUBLIC_KEY=your_public_key
```

## 📝 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type checking
npm run type-check

# Preview production build
npm run preview
```

## 🔧 Package Dependencies

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "lucide-react": "^0.294.0",
    "next-themes": "^0.2.1",
    "framer-motion": "^10.16.4",
    "@emailjs/browser": "^3.11.0"
  },
  "devDependencies": {
    "@types/react": "18.x",
    "@types/node": "20.x",
    "typescript": "5.x",
    "tailwindcss": "3.x",
    "autoprefixer": "10.x",
    "postcss": "8.x",
    "eslint": "8.x",
    "@next/eslint-config-next": "14.x"
  }
}
```

## 🎯 Best Practices Implemented

- **TypeScript**: Full type safety
- **Next.js 14**: Latest App Router
- **Tailwind CSS**: Utility-first styling
- **Component Architecture**: Modular and reusable
- **SEO Optimized**: Meta tags and structured data
- **Performance**: Optimized images and code splitting
- **Accessibility**: Semantic HTML and ARIA labels

## 🔄 Maintenance

1. **Regular Updates**: Keep dependencies updated
2. **Content Updates**: Add new projects and blog posts
3. **Performance Monitoring**: Check Core Web Vitals
4. **Security**: Monitor for vulnerabilities

---

**Happy Coding! 🚀**

Need help? Check the [Next.js documentation](https://nextjs.org/docs) or feel free to customize this template to match your unique style and requirements.