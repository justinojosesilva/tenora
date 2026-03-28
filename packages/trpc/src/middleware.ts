import { TRPCError } from '@trpc/server'
import type { UserRole } from '@prisma/client'
import { t } from './base'

/**
 * Matriz de permissões por módulo
 *
 * | Ação                        | admin | financeiro | operacional | visualizador |
 * |-----------------------------|:-----:|:----------:|:-----------:|:------------:|
 * | Criar/editar/excluir imóvel |   ✅  |     ✅     |      ✅     |      ❌      |
 * | Criar/editar proprietário   |   ✅  |     ✅     |      ✅     |      ❌      |
 * | Ver imóveis e proprietários |   ✅  |     ✅     |      ✅     |      ✅      |
 * | Criar/aprovar cobrança      |   ✅  |     ✅     |      ❌     |      ❌      |
 * | Ver relatórios financeiros  |   ✅  |     ✅     |      ❌     |      ❌      |
 * | Criar ordem de manutenção   |   ✅  |     ❌     |      ✅     |      ❌      |
 * | Convidar/remover membros    |   ✅  |     ❌     |      ❌     |      ❌      |
 * | Configurações do tenant     |   ✅  |     ❌     |      ❌     |      ❌      |
 */

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

export const requireRole = (...roles: UserRole[]) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.user || !ctx.tenantId) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuário não autenticado!' })
    }
    if (!roles.includes(ctx.user.role as UserRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Requer role: ${roles.join(', ')}. Seu role: ${ctx.user.role}`,
      })
    }
    return next({ ctx: { ...ctx, user: ctx.user, tenantId: ctx.tenantId } })
  })
