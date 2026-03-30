import { z } from 'zod'
import { router, protectedProcedure, requireRole, type TRPCRouter } from '@tenora/trpc'
import {
  OwnerCreateSchema,
  OwnerUpdateSchema,
  OwnerListSchema,
  OwnerStatementSchema,
} from '@tenora/validators'
import { TRPCError } from '@trpc/server'
import { UserRole } from '@prisma/client'

export const ownerRouter: TRPCRouter = router({
  list: protectedProcedure.input(OwnerListSchema).query(async ({ ctx, input }) => {
    const { search, page, limit } = input
    return ctx.db.owner.findMany({
      where: {
        deletedAt: null,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { cpfCnpj: { contains: search } },
          ],
        }),
      },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        properties: { where: { deletedAt: null }, select: { id: true } },
        ownerAccount: { select: { balance: true } },
      },
      orderBy: { name: 'asc' },
    })
  }),

  byId: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        propertyPage: z.number().min(1).default(1),
        propertyLimit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [owner, totalProperties, activeLeases, pendingCharges] = await ctx.db.$transaction([
        ctx.db.owner.findUnique({
          where: { id: input.id, deletedAt: null },
          include: {
            properties: {
              where: { deletedAt: null },
              include: {
                leases: {
                  where: { deletedAt: null, status: 'active' },
                  select: {
                    id: true,
                    tenantName: true,
                    rentAmount: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                  },
                },
              },
              skip: (input.propertyPage - 1) * input.propertyLimit,
              take: input.propertyLimit,
              orderBy: { address: 'asc' },
            },
            ownerAccount: true,
          },
        }),
        ctx.db.property.count({
          where: { ownerId: input.id, deletedAt: null },
        }),
        ctx.db.lease.count({
          where: {
            deletedAt: null,
            status: 'active',
            property: { ownerId: input.id, deletedAt: null },
          },
        }),
        ctx.db.billingCharge.count({
          where: {
            status: 'pending',
            lease: { property: { ownerId: input.id, deletedAt: null } },
          },
        }),
      ])

      if (!owner)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Proprietário não encontrado!' })

      return {
        ...owner,
        totalProperties,
        totalPages: Math.ceil(totalProperties / input.propertyLimit),
        activeLeases,
        pendingCharges,
        balance: owner.ownerAccount ? Number(owner.ownerAccount.balance) : 0,
      }
    }),

  create: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional, UserRole.financeiro))
    .input(OwnerCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const owner = await tx.owner.create({
          data: { ...input, tenantId: ctx.tenantId },
        })
        await tx.ownerAccount.create({
          data: { tenantId: ctx.tenantId, ownerId: owner.id, balance: 0 },
        })
        return owner
      })
    }),

  update: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional, UserRole.financeiro))
    .input(z.object({ id: z.string().uuid(), data: OwnerUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.owner.findUnique({
        where: { id: input.id, deletedAt: null },
      })
      if (!existing)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Proprietário não encontrado!' })
      return ctx.db.owner.update({ where: { id: input.id }, data: input.data })
    }),

  softDelete: protectedProcedure
    .use(requireRole(UserRole.admin, UserRole.operacional))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.owner.findUnique({
        where: { id: input.id, deletedAt: null },
        include: { properties: { where: { deletedAt: null }, select: { id: true } } },
      })
      if (!existing)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Proprietário não encontrado!' })
      if (existing.properties.length > 0)
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Não é possível excluir proprietário com imóveis ativos vinculados',
        })
      return ctx.db.owner.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      })
    }),

  statement: protectedProcedure.input(OwnerStatementSchema).query(async ({ ctx, input }) => {
    const { ownerId, fromDate, toDate, page, limit } = input

    const charges = await ctx.db.billingCharge.findMany({
      where: {
        status: 'paid',
        ...(fromDate || toDate
          ? { paidAt: { ...(fromDate && { gte: fromDate }), ...(toDate && { lte: toDate }) } }
          : {}),
        lease: { property: { ownerId } },
      },
      include: {
        lease: {
          select: {
            rentAmount: true,
            adminFeePct: true,
            property: { select: { address: true, city: true } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return charges.map((charge) => {
      const rentAmount = Number(charge.lease.rentAmount)
      const adminFeePct = Number(charge.lease.adminFeePct)
      const repasse = rentAmount - (rentAmount * adminFeePct) / 100
      return { ...charge, repasse }
    })
  }),

  balance: protectedProcedure
    .input(z.object({ ownerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.ownerAccount.findUnique({
        where: { ownerId: input.ownerId },
      })
      return { balance: account ? Number(account.balance) : 0 }
    }),
})
