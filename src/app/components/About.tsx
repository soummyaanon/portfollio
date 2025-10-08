export default function About() {
  return (
    <section id="about" className="py-4 sm:py-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6">About</h2>
        <div className="prose max-w-none dark:prose-invert">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            I create with <span className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 bg-clip-text text-transparent font-medium">AI</span> and love <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-400 bg-clip-text text-transparent font-medium">deep space</span>. Also into <span className="bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 bg-clip-text text-transparent font-medium">spirituality</span> and exploring consciousness. Just trying to understand this wild <span className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 bg-clip-text text-transparent font-medium">universe</span>, inside and out.
          </p>
        </div>
      </div>
    </section>
  )
}
