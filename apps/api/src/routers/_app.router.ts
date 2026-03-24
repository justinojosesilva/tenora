import { router, type TRPCRouter } from '@tenora/trpc'
import { propertyRouter } from './property.router.js'

export const appRouter: TRPCRouter = router({
  property: propertyRouter,
})

export type AppRouter = typeof appRouter
