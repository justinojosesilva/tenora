import { TRPCError } from '@trpc/server'
import { t } from './base'

export const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.tenantId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuário não autenticado!' })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      tenantId: ctx.tenantId,
    },
  })
})

export const requireRole = (...roles: string[]) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.user || !ctx.tenantId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `Requer role: ${roles.join(' ou ')}` })
    }
    return next({ ctx })
  })
