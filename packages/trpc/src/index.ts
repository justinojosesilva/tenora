import { UserRole } from '@prisma/client'
import { t } from './base.js'
import { isAuthed, requireRole } from './middleware.js'

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(isAuthed)
export const adminProcedure = t.procedure.use(requireRole(UserRole.admin))

export type TRPCRouter = ReturnType<typeof t.router>

export { createContext } from './context.js'
export { requireRole }
export { t }
