import { Badge } from "@/components/ui/badge"
import { Github } from "lucide-react"
import { FaXTwitter } from "react-icons/fa6"

export default function Skills() {
  const skills = [
    "Next.js", "TypeScript", "React", "Node.js",
    "OpenAI ", "Python", "Prisma",
    "JavaScript" ,"Tailwind CSS",
    "Git", "Vercel", "RESTful APIs"
  ]

  return (
    <section id="skills" className="pt-8 sm:pt-12 pb-24 sm:pb-32">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6">Skills</h2>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {skills.map((skill, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="text-xs px-1.5 sm:px-2 py-0.5 sm:py-1"
          >
            {skill}
          </Badge>
        ))}
      </div>

      {/* Follow Me Section */}
      <div className="text-center mt-6 sm:mt-8 mb-2">
        <p className="text-xs text-muted-foreground font-medium">Follow me</p>
      </div>

      {/* Social Links */}
      <div className="flex justify-center gap-3 sm:gap-4">
        <a
          href="https://github.com/soummyaanon"
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <Badge variant="outline" className="text-xs px-3 sm:px-4 py-1 sm:py-2 border-dashed hover:bg-primary/5 hover:border-primary transition-colors flex items-center gap-2">
            <Github className="w-3 h-3" />

          </Badge>
        </a>
        <a
          href="https://x.com/SoumyapX"
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <Badge variant="outline" className="text-xs px-3 sm:px-4 py-1 sm:py-2 border-dashed hover:bg-primary/5 hover:border-primary transition-colors flex items-center gap-2">
            <FaXTwitter className="w-3 h-3" />

          </Badge>
        </a>
      </div>
      </div>
    </section>
  )
}
