import { z } from 'zod'
import { router, protectedProcedure, requireRole, type TRPCRouter } from '@tenora/trpc'
import { TRPCError } from '@trpc/server'
import { UserRole } from '@prisma/client'
import { calculateCashFlow } from '../services/report.service'

export const reportRouter: TRPCRouter = router({
  /**
   * Relatório de fluxo de caixa: entradas e saídas por dia.
   * Retorna saldo inicial, final e variação para o período.
   *
   * - entries: transações com type = 'credit'
   * - exits: transações com type = 'debit'
   * - balance: saldo acumulado ao final do dia
   */
  cashFlow: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.financeiro))
    .input(
      z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format'),
        bankAccountId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Validate bank account ownership if provided
      if (input.bankAccountId) {
        const bankAccount = await ctx.db.bankAccount.findUnique({
          where: { id: input.bankAccountId },
        })

        if (!bankAccount || bankAccount.tenantId !== ctx.tenantId) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conta bancária não encontrada',
          })
        }
      }

      return calculateCashFlow(ctx.db, ctx.tenantId, input.period, input.bankAccountId)
    }),
})
