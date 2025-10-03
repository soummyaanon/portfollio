export default function TestOG() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">OG Image Test</h1>

      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Default OG Image</h2>
          <img
            src="/api/og"
            alt="OG Image"
            className="border border-gray-700 rounded-lg max-w-full"
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Custom OG Image</h2>
          <img
            src="/api/og?title=Custom%20Title&description=This%20is%20a%20custom%20description"
            alt="Custom OG Image"
            className="border border-gray-700 rounded-lg max-w-full"
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">How to test OG images:</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>Visit <a href="https://opengraph.xyz/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">opengraph.xyz</a></li>
            <li>Paste your website URL to see how it appears on social media</li>
            <li>Use Facebook's <a href="https://developers.facebook.com/tools/debug/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Sharing Debugger</a></li>
            <li>Twitter's <a href="https://cards-dev.twitter.com/validator" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Card Validator</a></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
