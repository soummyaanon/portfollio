import { Github, Linkedin, Twitter, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-muted border-t border-border">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">
            © 2025 Soumyaranjan Panda. Building the future, one line of code at a time.
          </p>
          <div className="flex space-x-4">
            <a href="https://github.com/soummyaanon" className="text-muted-foreground hover:text-foreground">
              <Github size={24} />
            </a>
            <a href="https://www.linkedin.com/in/soumyapanda12/" className="text-muted-foreground hover:text-foreground">
              <Linkedin size={24} />
            </a>
            <a href="https://x.com/SoumyapX" className="text-muted-foreground hover:text-foreground">
              <Twitter size={24} />
            </a>
            <a href="mailto:your.email@example.com" className="text-muted-foreground hover:text-foreground">
              <Mail size={24} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
