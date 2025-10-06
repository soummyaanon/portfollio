'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

export function PostHogProvider() {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      capture_exceptions: true, // This enables capturing exceptions using Error Tracking, set to false if you don't want this
      debug: process.env.NODE_ENV === "development",
    })
  }, [])

  return null
}
