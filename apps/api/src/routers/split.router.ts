import { z } from 'zod'
import { router, protectedProcedure, requireRole, type TRPCRouter } from '@tenora/trpc'
import { TRPCError } from '@trpc/server'
import { UserRole } from '@prisma/client'
import { calculate } from '../services/split.service'

export const splitRouter: TRPCRouter = router({
  /**
   * Aplica split a uma transação vinculada a contrato de locação.
   * Cria os registros agency/owner atomicamente e atualiza OwnerAccount.balance.
   */
  applyToTransaction: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.financeiro))
    .input(z.object({ transactionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const transaction = await ctx.db.transaction.findUnique({
        where: { id: input.transactionId },
        include: {
          lease: {
            include: {
              property: { select: { ownerId: true } },
            },
          },
          splits: true,
        },
      })

      if (!transaction) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Transação não encontrada' })
      }

      if (!transaction.lease) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Transação não está vinculada a um contrato de locação',
        })
      }

      if (transaction.splits.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Split já foi aplicado a esta transação',
        })
      }

      const { agency, owner } = calculate(transaction, transaction.lease)
      const ownerId = transaction.lease.property.ownerId

      return ctx.db.$transaction(async (tx) => {
        await tx.transactionSplit.createMany({
          data: [
            {
              tenantId: ctx.tenantId,
              transactionId: transaction.id,
              party: 'agency',
              amount: agency,
              description: 'Taxa de administração',
            },
            {
              tenantId: ctx.tenantId,
              transactionId: transaction.id,
              party: 'owner',
              amount: owner,
              description: 'Repasse ao proprietário',
            },
          ],
        })

        if (ownerId) {
          await tx.ownerAccount.upsert({
            where: { ownerId },
            update: { balance: { increment: owner } },
            create: { tenantId: ctx.tenantId, ownerId, balance: owner },
          })
        }

        return tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'categorized' },
          include: { splits: true },
        })
      })
    }),

  byTransaction: protectedProcedure
    .input(z.object({ transactionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.transactionSplit.findMany({
        where: { transactionId: input.transactionId },
        orderBy: { createdAt: 'asc' },
      })
    }),

  /**
   * Resumo de splits por período: total agência vs proprietário.
   * Agregação dos valores de TransactionSplit agrupados por party.
   */
  summary: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.financeiro))
    .input(
      z.object({
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const dateWhere =
        input.dateFrom && input.dateTo
          ? {
              transaction: {
                date: {
                  gte: new Date(input.dateFrom),
                  lte: new Date(input.dateTo),
                },
              },
            }
          : input.dateFrom
            ? { transaction: { date: { gte: new Date(input.dateFrom) } } }
            : input.dateTo
              ? { transaction: { date: { lte: new Date(input.dateTo) } } }
              : {}

      const splits = await ctx.db.transactionSplit.findMany({
        where: dateWhere,
        select: { party: true, amount: true },
      })

      const summary = splits.reduce(
        (acc, split) => {
          if (split.party === 'agency') {
            acc.agency += Number(split.amount)
          } else {
            acc.owner += Number(split.amount)
          }
          return acc
        },
        { agency: 0, owner: 0 },
      )

      return summary
    }),
})
