import { NextResponse } from 'next/server'
import experiences from '../../../data/experiences.json'

export const dynamic = 'force-static'

export async function GET() {
  try {
    // TODO: Integrate with LinkedIn API or third-party service
    // Option 1: LinkedIn API (requires special approval)
    // Option 2: Third-party service like Proxycurl, Hunter.io, etc.
    // Option 3: LinkedIn profile export parsing
    // Option 4: Manual webhook from LinkedIn

    // For now, return the static data
    return NextResponse.json(experiences)
  } catch (error) {
    console.error('Error fetching experiences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch experiences' },
      { status: 500 }
    )
  }
}

// POST endpoint for updating experiences (admin use)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    return NextResponse.json({ success: true, data: body })
  } catch {
    return NextResponse.json(
      { error: 'Failed to update experiences' },
      { status: 500 }
    )
  }
}
