import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    domains: ['images.unsplash.com', 'avatars.githubusercontent.com', 'github.com'],
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    optimizeCss: true,
    webVitalsAttribution: ['CLS', 'LCP'],
  },
  trailingSlash: true,
}

export default nextConfig
