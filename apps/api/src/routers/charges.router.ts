import { z } from 'zod'
import { router, protectedProcedure, requireRole, type TRPCRouter } from '@tenora/trpc'
import { BillingCreateSchema, BillingListSchema, BillingMarkAsPaidSchema } from '@tenora/validators'
import { TRPCError } from '@trpc/server'
import { UserRole } from '@prisma/client'

export const chargesRouter: TRPCRouter = router({
  list: protectedProcedure.input(BillingListSchema).query(async ({ ctx, input }) => {
    const { status, leaseId, dueDateFrom, dueDateTo, page, limit } = input
    return ctx.db.billingCharge.findMany({
      where: {
        ...(status && { status }),
        ...(leaseId && { leaseId }),
        ...(dueDateFrom || dueDateTo
          ? {
              dueDate: {
                ...(dueDateFrom && { gte: dueDateFrom }),
                ...(dueDateTo && { lte: dueDateTo }),
              },
            }
          : {}),
      },
      skip: (page - 1) * limit,
      take: limit,
      include: { lease: true },
      orderBy: { dueDate: 'desc' },
    })
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const charge = await ctx.db.billingCharge.findUnique({
        where: { id: input.id },
        include: { lease: true },
      })
      if (!charge) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cobrança não encontrada' })
      return charge
    }),

  create: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional))
    .input(BillingCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Idempotência: não criar duplicata para o mesmo mês/ano do dueDate
      const startOfMonth = new Date(input.dueDate.getFullYear(), input.dueDate.getMonth(), 1)
      const endOfMonth = new Date(
        input.dueDate.getFullYear(),
        input.dueDate.getMonth() + 1,
        0,
        23,
        59,
        59,
      )

      const existing = await ctx.db.billingCharge.findFirst({
        where: {
          leaseId: input.leaseId,
          dueDate: { gte: startOfMonth, lte: endOfMonth },
          status: { not: 'cancelled' },
        },
      })
      if (existing)
        throw new TRPCError({ code: 'CONFLICT', message: 'Já existe cobrança para este mês' })

      return ctx.db.billingCharge.create({
        data: {
          ...input,
          tenantId: ctx.tenantId,
        },
      })
    }),

  markAsPaid: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.financeiro))
    .input(BillingMarkAsPaidSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.billingCharge.findUnique({
        where: { id: input.id },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cobrança não encontrada' })

      if (existing.status === 'cancelled') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cobrança cancelada não pode ser marcada como paga',
        })
      }

      return ctx.db.billingCharge.update({
        where: { id: input.id },
        data: {
          status: 'paid',
          paidAt: input.paidAt ?? new Date(),
          paidAmount: input.paidAmount,
        },
      })
    }),

  cancel: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.billingCharge.findUnique({
        where: { id: input.id },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cobrança não encontrada' })

      if (existing.status === 'paid') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cobrança paga não pode ser cancelada',
        })
      }

      return ctx.db.billingCharge.update({
        where: { id: input.id },
        data: { status: 'cancelled' },
      })
    }),
})
