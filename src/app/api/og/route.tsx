import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const title = searchParams.get('title') || 'Soumya Panda - Software Engineer'
    const description = searchParams.get('description') || 'Full-stack Developer specializing in Next.js, TypeScript, and AI systems'

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f0f23',
            backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '120px',
              height: '120px',
              borderRadius: '60px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              marginBottom: '40px',
              fontSize: '60px',
            }}
          >
            👨‍💻
          </div>

          <h1
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              margin: '0 0 20px 0',
              lineHeight: '1.1',
              maxWidth: '900px',
            }}
          >
            {title}
          </h1>

          <p
            style={{
              fontSize: '32px',
              color: 'rgba(255, 255, 255, 0.8)',
              textAlign: 'center',
              margin: '0',
              maxWidth: '800px',
              lineHeight: '1.4',
            }}
          >
            {description}
          </p>

          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              right: '40px',
              fontSize: '24px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontWeight: '500',
            }}
          >
            soumyapanda.dev
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('Error generating OG image:', error)
    return new Response('Error generating image', { status: 500 })
  }
}
