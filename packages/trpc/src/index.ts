import { initTRPC } from '@trpc/server'
import type { Context } from './context'
import { isAuthed, requireRole } from './middleware'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(isAuthed)
export const adminProcedure = t.procedure.use(requireRole('ADMIN'))

export type TRPCRouter = ReturnType<typeof t.router>

export { createContext } from './context'
export { requireRole }
export { t }
