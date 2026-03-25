import { router, type TRPCRouter } from '@tenora/trpc'
import { propertyRouter } from './property.router.js'
import { usersRouter } from './users.router.js'

export const appRouter: TRPCRouter = router({
  property: propertyRouter,
  users: usersRouter,
})

export type AppRouter = typeof appRouter
