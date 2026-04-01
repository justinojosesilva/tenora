import { z } from 'zod'
import { router, protectedProcedure, requireRole, type TRPCRouter } from '@tenora/trpc'
import { BillingCreateSchema, BillingListSchema, BillingMarkAsPaidSchema } from '@tenora/validators'
import { TRPCError } from '@trpc/server'
import { UserRole } from '@prisma/client'
import { getAsaasClient } from '../lib/asaas-client'

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
        include: {
          lease: {
            select: {
              rentAmount: true,
              adminFeePct: true,
              property: { select: { ownerId: true } },
            },
          },
        },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cobrança não encontrada' })

      if (existing.status === 'cancelled') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cobrança cancelada não pode ser marcada como paga',
        })
      }

      const rentAmount = Number(existing.lease.rentAmount)
      const adminFeePct = Number(existing.lease.adminFeePct)
      const repasse = rentAmount - (rentAmount * adminFeePct) / 100
      const ownerId = existing.lease.property.ownerId

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.billingCharge.update({
          where: { id: input.id },
          data: {
            status: 'paid',
            paidAt: input.paidAt ?? new Date(),
            paidAmount: input.paidAmount,
          },
        })

        if (ownerId) {
          await tx.ownerAccount.upsert({
            where: { ownerId },
            update: { balance: { increment: repasse } },
            create: { tenantId: ctx.tenantId, ownerId, balance: repasse },
          })
        }

        return updated
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

  generateBoleto: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.financeiro))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const charge = await ctx.db.billingCharge.findUnique({
        where: { id: input.id },
        include: { lease: { include: { tenant: true } } },
      })
      if (!charge) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cobrança não encontrada' })

      // Idempotence: if boleto already generated, return existing
      if (charge.asaasChargeId) {
        return charge
      }

      // Generate boleto via Asaas
      const asaas = getAsaasClient()
      const dueDateStr = charge.dueDate.toISOString().split('T')[0]!
      const boleto = await asaas.createBoleto({
        description: `Aluguel - ${charge.reference || `Vencimento ${charge.dueDate.toLocaleDateString('pt-BR')}`}`,
        value: Number(charge.amount),
        dueDate: dueDateStr, // YYYY-MM-DD format
      })

      // Save boleto data
      const updated = await ctx.db.billingCharge.update({
        where: { id: input.id },
        data: {
          asaasChargeId: boleto.id,
          ...(boleto.bankSlipCode && { boletoCode: boleto.bankSlipCode }),
          ...(boleto.bankSlipUrl && { boletoUrl: boleto.bankSlipUrl }),
        },
        include: { lease: true },
      })

      return updated
    }),

  generatePix: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.financeiro))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const charge = await ctx.db.billingCharge.findUnique({
        where: { id: input.id },
        include: { lease: true },
      })
      if (!charge) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cobrança não encontrada' })

      // Error if already paid
      if (charge.status === 'paid') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Cobrança já paga não pode gerar novo PIX',
        })
      }

      // Idempotence: if PIX already generated, return existing
      if (charge.pixCode && charge.asaasChargeId) {
        return charge
      }

      // Generate PIX via Asaas
      const asaas = getAsaasClient()
      const pix = await asaas.createPix({
        description: `Aluguel - ${charge.reference || `Vencimento ${charge.dueDate.toLocaleDateString('pt-BR')}`}`,
        value: Number(charge.amount),
        dueDate: charge.dueDate.toISOString().split('T')[0]!,
      })

      // Save PIX data
      const updated = await ctx.db.billingCharge.update({
        where: { id: input.id },
        data: {
          asaasChargeId: pix.id,
          pixCode: pix.pixCopyPaste || '',
          ...(pix.pixQrCode && { qrCodeImage: pix.pixQrCode }),
        },
        include: { lease: true },
      })

      return updated
    }),
})
