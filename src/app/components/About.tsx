import { HyperText } from "@/components/ui/hyper-text"

export default function About() {
  return (
    <section id="about" className="py-4 sm:py-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6">About</h2>
        <div className="prose max-w-none dark:prose-invert">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            I create with{" "}
            <HyperText
              className="inline text-xs sm:text-sm font-medium bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 bg-clip-text text-transparent"
              duration={600}
              startOnView={true}
            >
              AI
            </HyperText>{" "}
            and love{" "}
            <HyperText
              className="inline text-xs sm:text-sm font-medium bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-400 bg-clip-text text-transparent"
              duration={600}
              startOnView={true}
              delay={200}
            >
              deep space
            </HyperText>
            . Also into{" "}
            <HyperText
              className="inline text-xs sm:text-sm font-medium bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 bg-clip-text text-transparent"
              duration={600}
              startOnView={true}
              delay={400}
            >
              spirituality
            </HyperText>{" "}
            and exploring consciousness. Just trying to understand this wild{" "}
            <HyperText
              className="inline text-xs sm:text-sm font-medium bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 bg-clip-text text-transparent"
              duration={600}
              startOnView={true}
              delay={600}
            >
              universe
            </HyperText>
            , inside and out.
          </p>
        </div>
      </div>
    </section>
  )
}
