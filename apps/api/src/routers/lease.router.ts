import { z } from 'zod'
import { router, protectedProcedure, requireRole, type TRPCRouter } from '@tenora/trpc'
import { LeaseCreateSchema, LeaseUpdateSchema, LeaseListSchema } from '@tenora/validators'
import { TRPCError } from '@trpc/server'
import { UserRole, PropertyStatus } from '@prisma/client'

export const leaseRouter: TRPCRouter = router({
  list: protectedProcedure.input(LeaseListSchema).query(async ({ ctx, input }) => {
    const { status, propertyId, startDate, endDate, page, limit } = input
    return ctx.db.lease.findMany({
      where: {
        deletedAt: null,
        ...(status && { status }),
        ...(propertyId && { propertyId }),
        ...(startDate && { startDate: { gte: startDate } }),
        ...(endDate && { endDate: { lte: endDate } }),
      },
      skip: (page - 1) * limit,
      take: limit,
      include: { property: { include: { owner: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const lease = await ctx.db.lease.findUnique({
        where: { id: input.id, deletedAt: null },
        include: {
          property: { include: { owner: true } },
          billingCharges: true,
        },
      })
      if (!lease) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contrato não encontrado!' })
      return lease
    }),

  create: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional))
    .input(LeaseCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const property = await ctx.db.property.findUnique({
        where: { id: input.propertyId, deletedAt: null },
      })
      if (!property) throw new TRPCError({ code: 'NOT_FOUND', message: 'Imóvel não encontrado!' })

      if (property.status === PropertyStatus.rented) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Imóvel já possui contrato ativo e não pode ser locado novamente.',
        })
      }

      if (property.status === PropertyStatus.maintenance) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Imóvel em manutenção não pode ter contrato criado.',
        })
      }

      const now = new Date()

      const [created] = await ctx.db.$transaction(async (tx) => {
        const lease = await tx.lease.create({
          data: {
            ...input,
            tenantId: ctx.tenantId,
          },
        })

        await tx.property.update({
          where: { id: input.propertyId },
          data: { status: PropertyStatus.rented },
        })

        const dueDate = new Date(now.getFullYear(), now.getMonth(), lease.dueDayOfMonth)
        if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1)
        const reference = dueDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

        await tx.billingCharge.create({
          data: {
            tenantId: ctx.tenantId,
            leaseId: lease.id,
            amount: lease.rentAmount,
            dueDate,
            reference,
          },
        })

        return [lease]
      })

      return created
    }),

  end: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.lease.findUnique({
        where: { id: input.id, deletedAt: null },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contrato não encontrado!' })

      if (existing.status === 'ended') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Contrato já encerrado.' })
      }

      const [lease] = await ctx.db.$transaction(async (tx) => {
        const updated = await tx.lease.update({
          where: { id: input.id },
          data: { status: 'ended' },
        })

        await tx.property.update({
          where: { id: existing.propertyId },
          data: { status: PropertyStatus.available },
        })

        return [updated]
      })

      return lease
    }),

  update: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional))
    .input(z.object({ id: z.string().uuid(), data: LeaseUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.lease.findUnique({
        where: { id: input.id, deletedAt: null },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contrato não encontrado!' })

      if (existing.status === 'ended') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Contratos encerrados não podem ser editados',
        })
      }

      return ctx.db.lease.update({
        where: { id: input.id },
        data: input.data,
      })
    }),

  softDelete: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.lease.findUnique({
        where: { id: input.id, deletedAt: null },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contrato não encontrado!' })

      return ctx.db.lease.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      })
    }),
})
