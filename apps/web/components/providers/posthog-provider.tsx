'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { useAuth } from '@clerk/nextjs'
import { useEffect } from 'react'

// ---------------------------------------------------------------------------
// Init PostHog (executado uma única vez no client)
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    // Não captura automaticamente dados PII do usuário
    person_profiles: 'identified_only',
    capture_pageview: false, // controlado manualmente pelo PageViewTracker
    capture_pageleave: true,
  })
}

// ---------------------------------------------------------------------------
// Identifica o usuário no PostHog após login (sem PII — apenas IDs internos)
// ---------------------------------------------------------------------------

function PostHogIdentifier() {
  const { userId, orgId } = useAuth()
  const ph = usePostHog()

  useEffect(() => {
    if (!ph) return

    if (userId) {
      // Identifica com userId do Clerk; orgId como propriedade de grupo
      ph.identify(userId, { orgId: orgId ?? null })

      if (orgId) {
        ph.group('organization', orgId)
      }
    } else {
      // Reset ao fazer logout
      ph.reset()
    }
  }, [userId, orgId, ph])

  return null
}

// ---------------------------------------------------------------------------
// Provider principal — envolve o app
// ---------------------------------------------------------------------------

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PostHogIdentifier />
      {children}
    </PHProvider>
  )
}
