import Image from 'next/image'

export default function Hero() {
  return (
    <section className="py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-6">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Hi, I&apos;m <span className="text-primary">Soumyaranjan Panda</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-2">
            Software Developer from Cuttack, Odisha
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
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
      </div>
    </section>
  )
}
