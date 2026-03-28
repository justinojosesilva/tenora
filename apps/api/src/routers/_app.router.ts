import { router, type TRPCRouter } from '@tenora/trpc'
import { propertyRouter } from './property.router.js'
import { ownerRouter } from './owner.router.js'
import { documentRouter } from './document.router.js'
import { usersRouter } from './users.router.js'
import { onboardingRouter } from './onboarding.router.js'
import { leaseRouter } from './lease.router.js'

export const appRouter: TRPCRouter = router({
  property: propertyRouter,
  owner: ownerRouter,
  document: documentRouter,
  users: usersRouter,
  onboarding: onboardingRouter,
  lease: leaseRouter,
})

export type AppRouter = typeof appRouter
