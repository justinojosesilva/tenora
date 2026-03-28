import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])
const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)'])

export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId } = await auth()

  // Rotas públicas: qualquer um acessa
  if (isPublicRoute(req)) {
    if (userId && orgId) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return
  }

  // Sem autenticação → sign-in
  if (!userId) {
    await auth.protect()
    return
  }

  // Autenticado sem org → onboarding
  if (!orgId) {
    if (!isOnboardingRoute(req)) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
    return
  }

  // Autenticado com org → sai do onboarding
  if (isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
