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
              className="inline text-xs sm:text-sm font-medium"
              duration={600}
              startOnView={true}
            >
              AI
            </HyperText>{" "}
            and love{" "}
            <HyperText
              className="inline text-xs sm:text-sm font-medium"
              duration={600}
              startOnView={true}
              delay={200}
            >
              deep space
            </HyperText>
            . Also into{" "}
            <HyperText
              className="inline text-xs sm:text-sm font-medium"
              duration={600}
              startOnView={true}
              delay={400}
            >
              spirituality
            </HyperText>{" "}
            and exploring consciousness. Just trying to understand this wild{" "}
            <HyperText
              className="inline text-xs sm:text-sm font-medium"
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
