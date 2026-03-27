'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useRef } from 'react'

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
  // undefined = estado inicial (auth carregando); null = deslogado; string = logado
  const prevUserIdRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (!ph) return

    if (userId) {
      // Dispara 'login' apenas quando userId transita de null (deslogado) → string
      // Evita disparar em reloads onde o usuário já estava autenticado
      if (prevUserIdRef.current === null) {
        ph.capture('login')
      }
      ph.identify(userId, { orgId: orgId ?? null })
      if (orgId) {
        ph.group('organization', orgId)
      }
    } else if (userId === null) {
      // Reset ao fazer logout (apenas se estava identificado antes)
      if (prevUserIdRef.current) {
        ph.reset()
      }
    }

    prevUserIdRef.current = userId ?? null
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
