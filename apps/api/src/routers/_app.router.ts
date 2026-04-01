import { router, type TRPCRouter } from '@tenora/trpc'
import { propertyRouter } from './property.router.js'
import { ownerRouter } from './owner.router.js'
import { documentRouter } from './document.router.js'
import { usersRouter } from './users.router.js'
import { onboardingRouter } from './onboarding.router.js'
import { leaseRouter } from './lease.router.js'
import { billingRouter } from './billing.router.js'
import { chargesRouter } from './charges.router.js'
import { pluggyRouter } from './pluggy.router.js'
import { bankAccountRouter } from './bankAccount.router.js'
import { repaymentRouter } from './repayment.router.js'
import { splitRouter } from './split.router.js'
import { settingsRouter } from './settings.router.js'

export const appRouter: TRPCRouter = router({
  property: propertyRouter,
  owner: ownerRouter,
  document: documentRouter,
  users: usersRouter,
  onboarding: onboardingRouter,
  lease: leaseRouter,
  billing: billingRouter,
  charges: chargesRouter,
  pluggy: pluggyRouter,
  bankAccount: bankAccountRouter,
  repayment: repaymentRouter,
  split: splitRouter,
  settings: settingsRouter,
})

export type AppRouter = typeof appRouter
