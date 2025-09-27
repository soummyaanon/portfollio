import { Badge } from "@/components/ui/badge"

export default function Skills() {
  const skills = [
    "Next.js", "TypeScript", "React", "Node.js",
    "OpenAI SDK", "Python", "Prisma", "Azure",
    "Vector Databases", "shadcn UI", "Tailwind CSS",
    "Git", "Vercel", "RESTful APIs"
  ]

  return (
    <section id="skills" className="py-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-6">Skills</h2>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="text-xs px-2 py-1"
          >
            {skill}
          </Badge>
        ))}
      </div>
      </div>
    </section>
  )
}
