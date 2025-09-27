import Hero from './components/Hero'
import About from './components/About'
import Experience from './components/Experience'
import Skills from './components/Skills'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-2 space-y-4">
        <Hero />
        <About />
        <Experience />
        <Skills />
      </div>
    </main>
  )
}