import { z } from 'zod'
import { router, protectedProcedure, requireRole, type TRPCRouter } from '@tenora/trpc'
import { BankAccountCreateSchema } from '@tenora/validators'
import { TRPCError } from '@trpc/server'
import { UserRole } from '@prisma/client'
import { getPluggyClient } from '../lib/pluggy-client.js'

export const bankAccountRouter: TRPCRouter = router({
  list: protectedProcedure
    .use(
      requireRole(UserRole.admin, UserRole.financeiro, UserRole.operacional, UserRole.visualizador),
    )
    .query(async ({ ctx }) => {
      return ctx.db.bankAccount.findMany({
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
        include: {
          bankConnection: {
            select: { id: true, pluggyItemId: true, status: true, lastSyncedAt: true },
          },
        },
      })
    }),

  create: protectedProcedure
    .use(requireRole(UserRole.admin))
    .input(BankAccountCreateSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.isPrimary) {
        await ctx.db.bankAccount.updateMany({
          where: { isPrimary: true },
          data: { isPrimary: false },
        })
      }
      return ctx.db.bankAccount.create({
        data: { ...input, tenantId: ctx.tenantId },
      })
    }),

  delete: protectedProcedure
    .use(requireRole(UserRole.admin))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.bankAccount.findUnique({
        where: { id: input.id },
        include: { bankConnection: { select: { id: true } } },
      })

      if (!account) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta bancária não encontrada' })
      }

      return ctx.db.$transaction(async (tx) => {
        if (account.bankConnection) {
          await tx.bankConnection.delete({ where: { id: account.bankConnection.id } })
        }
        return tx.bankAccount.delete({ where: { id: input.id } })
      })
    }),

  getConnectToken: protectedProcedure.use(requireRole(UserRole.admin)).mutation(async ({ ctx }) => {
    try {
      const pluggy = getPluggyClient(ctx.redis)
      const token = await pluggy.createConnectToken()
      return { token }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Falha ao gerar token Pluggy',
      })
    }
  }),
})
