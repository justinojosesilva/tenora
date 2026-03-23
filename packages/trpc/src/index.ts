import { t } from './base'
import { isAuthed, requireRole } from './middleware'

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(isAuthed)
export const adminProcedure = t.procedure.use(requireRole('ADMIN'))

export type TRPCRouter = ReturnType<typeof t.router>

export { createContext } from './context'
export { requireRole }
export { t }
