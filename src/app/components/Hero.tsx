import Image from 'next/image'
import { HyperText } from '@/components/ui/hyper-text'
import { GolangDark } from '@/components/ui/svgs/golangDark'

export default function Hero() {
  // 🎯 UPDATE HERE: Change this to reflect what you're currently learning
  const currentlyLearning = "Go Lang basics"

  return (
    <section className="py-6 sm:py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-row items-center justify-center sm:justify-between gap-4 sm:gap-6">
          <div className="flex-1 text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3">
              Hi, I&apos;m <HyperText className="text-primary">Soumyaranjan</HyperText>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-2">
              A Software Engineer.
            </p>

            {/* Learning Indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground/80 mt-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span>Currently learning:</span>
              <GolangDark className="w-4 h-4" />
              <span className="text-foreground font-medium">{currentlyLearning}</span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Image
              src={`https://github.com/soummyaanon.png?v=${new Date().toISOString().split('T')[0]}`}
              alt="Soumyaranjan Panda"
              width={80}
              height={80}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-lg ring-2 ring-primary"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  )
}
