import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isDashboard = createRouteMatcher(['/(dashboard)/(.*)'])

export default clerkMiddleware((auth, req) => {
  // Proteger todas as rotas do dashboard
  if (isDashboard(req)) {
    auth.protect()
  }
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}
