'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

export function PostHogProvider() {
  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!posthogKey) {
      console.warn('PostHog key is not configured, skipping initialization')
      return
    }
    posthog.init(posthogKey, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      ui_host: "https://us.posthog.com",
      capture_exceptions: true,
      debug: process.env.NODE_ENV === "development",
    })
  }, [])

  return null
}
