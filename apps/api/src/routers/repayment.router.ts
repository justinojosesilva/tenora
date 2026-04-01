import { z } from 'zod'
import { router, protectedProcedure, requireRole, type TRPCRouter } from '@tenora/trpc'
import { TRPCError } from '@trpc/server'
import { UserRole } from '@prisma/client'
import { calculateRepaymentAmount } from '../services/repayment.service'

export const repaymentRouter: TRPCRouter = router({
  /**
   * Calcula o valor de repasse ao proprietário para um período.
   * Retorna a soma de todos os TransactionSplit com party === 'owner' naquele mês.
   */
  calculate: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.financeiro))
    .input(
      z.object({
        ownerId: z.string().uuid(),
        period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format'),
      }),
    )
    .query(async ({ ctx, input }) => {
      const owner = await ctx.db.owner.findUnique({
        where: { id: input.ownerId },
      })

      if (!owner || owner.tenantId !== ctx.tenantId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proprietário não encontrado',
        })
      }

      const amount = await calculateRepaymentAmount(
        ctx.db,
        ctx.tenantId,
        input.ownerId,
        input.period,
      )

      return { ownerId: input.ownerId, period: input.period, amount }
    }),

  /**
   * Registra um repasse para o proprietário.
   * Cria/atualiza o registro de Repayment e atualiza OwnerAccount.balance atomicamente.
   * Garante idempotência por ownerId + period (upsert).
   */
  register: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.financeiro))
    .input(
      z.object({
        ownerId: z.string().uuid(),
        period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format'),
        amount: z.number().positive('Amount must be positive'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const owner = await ctx.db.owner.findUnique({
        where: { id: input.ownerId },
      })

      if (!owner || owner.tenantId !== ctx.tenantId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proprietário não encontrado',
        })
      }

      return ctx.db.$transaction(async (tx) => {
        // Find existing repayment for idempotency
        const existing = await tx.repayment.findFirst({
          where: {
            tenantId: ctx.tenantId,
            ownerId: input.ownerId,
            period: input.period,
          },
        })

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Repasse já foi registrado para este período',
          })
        }

        // Create repayment record
        const repayment = await tx.repayment.create({
          data: {
            tenantId: ctx.tenantId,
            ownerId: input.ownerId,
            period: input.period,
            amount: input.amount,
            status: 'pending',
          },
        })

        // Decrement owner account balance (repayment is a deduction from the agency)
        await tx.ownerAccount.upsert({
          where: { ownerId: input.ownerId },
          update: { balance: { decrement: input.amount } },
          create: {
            tenantId: ctx.tenantId,
            ownerId: input.ownerId,
            balance: -input.amount,
          },
        })

        return repayment
      })
    }),

  /**
   * Lista todos os repassos do proprietário.
   */
  byOwner: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.financeiro, UserRole.operacional))
    .input(z.object({ ownerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const owner = await ctx.db.owner.findUnique({
        where: { id: input.ownerId },
      })

      if (!owner || owner.tenantId !== ctx.tenantId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proprietário não encontrado',
        })
      }

      return ctx.db.repayment.findMany({
        where: {
          tenantId: ctx.tenantId,
          ownerId: input.ownerId,
        },
        orderBy: { period: 'desc' },
      })
    }),

  /**
   * Lista todos os repassos do tenant.
   */
  list: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.financeiro))
    .query(async ({ ctx }) => {
      return ctx.db.repayment.findMany({
        where: { tenantId: ctx.tenantId },
        include: { owner: { select: { id: true, name: true } } },
        orderBy: { period: 'desc' },
      })
    }),

  /**
   * Marca um repasse como pago.
   */
  markAsPaid: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.financeiro))
    .input(z.object({ repaymentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const repayment = await ctx.db.repayment.findUnique({
        where: { id: input.repaymentId },
      })

      if (!repayment || repayment.tenantId !== ctx.tenantId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Repasse não encontrado',
        })
      }

      if (repayment.status === 'paid') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Repasse já foi marcado como pago',
        })
      }

      return ctx.db.repayment.update({
        where: { id: input.repaymentId },
        data: {
          status: 'paid',
          paidAt: new Date(),
        },
      })
    }),
})
