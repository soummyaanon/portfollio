import Image from 'next/image'
import { HyperText } from '@/components/ui/hyper-text'

export default function Hero() {
  return (
    <section className="py-6 sm:py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-6">
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3">
              Hi, I&apos;m <HyperText className="text-primary">Soumyaranjan</HyperText>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-2">
              Your friendly neighborhood Software Engineer.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Image
              src="https://github.com/soummyaanon.png"
              alt="Soumyaranjan Panda"
              width={80}
              height={80}
              className="w-20 h-20 rounded-full shadow-lg ring-2 ring-primary"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  )
}
