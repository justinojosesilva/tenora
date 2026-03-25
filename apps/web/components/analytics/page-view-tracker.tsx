'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { usePostHog } from 'posthog-js/react'
import { useEffect, Suspense } from 'react'

// ---------------------------------------------------------------------------
// Emite evento page_view a cada mudança de rota no App Router
// ---------------------------------------------------------------------------

function PageViewTrackerInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ph = usePostHog()

  useEffect(() => {
    if (!ph) return

    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    ph.capture('page_view', { path: pathname, url })
  }, [pathname, searchParams, ph])

  return null
}

// Envolve em Suspense porque useSearchParams requer boundary de Suspense
export function PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <PageViewTrackerInner />
    </Suspense>
  )
}
